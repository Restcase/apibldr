import { afterEach, expect, it, vi } from 'vitest';
import { readDefinitionUrl } from '../src/domain/import-url';
import { maxDocumentSize } from '../src/domain/document';
afterEach(() => vi.useRealTimers());

it('downloads raw text without credentials and preserves Unicode across stream chunks', async () => {
  const bytes = new TextEncoder().encode('title: Lights 🌃');
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(bytes.slice(0, -2));
      controller.enqueue(bytes.slice(-2));
      controller.close();
    },
  });
  const fetch = vi.fn().mockResolvedValue(new Response(stream));
  vi.stubGlobal('fetch', fetch);
  expect(await readDefinitionUrl('https://example.com/api.yaml')).toBe(
    'title: Lights 🌃',
  );
  expect(fetch).toHaveBeenCalledWith(
    'https://example.com/api.yaml',
    expect.objectContaining({
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      mode: 'cors',
    }),
  );
});
it.each([
  'file:///etc/passwd',
  'javascript:alert(1)',
  'https://user:secret@example.com',
  'not a url',
])('rejects unsupported URL %s before fetching', async (url) => {
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  await expect(readDefinitionUrl(url)).rejects.toThrow();
  expect(fetch).not.toHaveBeenCalled();
});
it('explains HTTP and browser-access failures', async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(new Response('', { status: 404 }))
    .mockRejectedValueOnce(new TypeError('Failed to fetch'));
  vi.stubGlobal('fetch', fetch);
  await expect(readDefinitionUrl('https://example.com/api')).rejects.toThrow(
    'HTTP 404',
  );
  await expect(readDefinitionUrl('https://example.com/api')).rejects.toThrow(
    'CORS',
  );
});
it('enforces the byte limit with and without a content-length header', async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(
      new Response('', {
        headers: { 'content-length': String(maxDocumentSize + 1) },
      }),
    )
    .mockResolvedValueOnce(new Response(new Uint8Array(maxDocumentSize + 1)));
  vi.stubGlobal('fetch', fetch);
  await expect(readDefinitionUrl('https://example.com/api')).rejects.toThrow(
    '2 MB',
  );
  await expect(readDefinitionUrl('https://example.com/api')).rejects.toThrow(
    '2 MB',
  );
});
it('supports cancellation and times out stalled requests', async () => {
  vi.useFakeTimers();
  vi.stubGlobal(
    'fetch',
    vi.fn(
      (_url, options) =>
        new Promise((_resolve, reject) => {
          options.signal.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          );
        }),
    ),
  );
  const controller = new AbortController();
  const cancelled = expect(
    readDefinitionUrl('https://example.com/api', controller.signal),
  ).rejects.toThrow('Aborted');
  controller.abort();
  await cancelled;
  const timeout = expect(
    readDefinitionUrl('https://example.com/api'),
  ).rejects.toThrow('timed out');
  await vi.advanceTimersByTimeAsync(30000);
  await timeout;
});
