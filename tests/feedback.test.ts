import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  document
    .querySelectorAll('[data-apibldr-feedback]')
    .forEach((script) => script.remove());
  delete window.appzi;
  delete window.appziSettings;
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe('feedback integration', () => {
  it('loads only on demand, disables screenshots, and reopens the configured survey', async () => {
    vi.resetModules();
    vi.stubEnv('VITE_APPZI_PORTAL', 'example-portal');
    vi.stubEnv('VITE_APPZI_SURVEY', 'example-survey');
    const { openFeedback } = await import('../src/integrations/feedback');
    expect(document.querySelector('[data-apibldr-feedback]')).toBeNull();
    const opening = openFeedback();
    const script = document.querySelector<HTMLScriptElement>(
      '[data-apibldr-feedback]',
    )!;
    expect(script.src).toBe('https://w.appzi.io/w.js?token=example-portal');
    expect(window.appziSettings?.render).toEqual({ type: 'none' });
    const api = { openSurvey: vi.fn() };
    window.appziSettings?.ready?.(api);
    await opening;
    await openFeedback();
    expect(api.openSurvey).toHaveBeenNthCalledWith(1, 'example-survey');
    expect(api.openSurvey).toHaveBeenCalledTimes(2);
    expect(document.querySelectorAll('[data-apibldr-feedback]')).toHaveLength(
      1,
    );
  });
  it('supports disabling the widget without loading any script', async () => {
    vi.resetModules();
    vi.stubEnv('VITE_APPZI_PORTAL', '');
    const { openFeedback } = await import('../src/integrations/feedback');
    await expect(openFeedback()).rejects.toThrow('not configured');
    expect(document.querySelector('[data-apibldr-feedback]')).toBeNull();
  });
  it('reports blocked scripts with a recovery path', async () => {
    vi.resetModules();
    const { openFeedback } = await import('../src/integrations/feedback');
    const opening = openFeedback();
    const assertion = expect(opening).rejects.toThrow('GitHub issues');
    document
      .querySelector('[data-apibldr-feedback]')!
      .dispatchEvent(new Event('error'));
    await assertion;
    expect(document.querySelector('[data-apibldr-feedback]')).toBeNull();
  });
  it('times out rather than leaving the feedback control loading indefinitely', async () => {
    vi.resetModules();
    vi.useFakeTimers();
    const { openFeedback } = await import('../src/integrations/feedback');
    const opening = openFeedback();
    const assertion = expect(opening).rejects.toThrow('reload this page');
    await vi.advanceTimersByTimeAsync(15000);
    await assertion;
  });
});
