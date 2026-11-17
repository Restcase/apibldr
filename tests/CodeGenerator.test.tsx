import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import CodeGenerator from '../src/components/CodeGenerator';
import { emptyDocument } from '../src/domain/document';

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
  };
});
afterEach(() => vi.unstubAllEnvs());

describe('generator configuration and consent', () => {
  it('explains the disabled feature without making a network request', () => {
    vi.stubEnv('VITE_GENERATOR_URL', '');
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    render(<CodeGenerator document={emptyDocument()} onClose={() => {}} />);
    expect(screen.getByRole('status')).toHaveTextContent(
      'not enabled on this site',
    );
    expect(
      screen.queryByRole('button', { name: 'Generate and download ZIP' }),
    ).not.toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });
  it('explains invalid deployment settings without exposing their contents', () => {
    vi.stubEnv('VITE_GENERATOR_URL', 'https://user:private-value@example.com');
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    render(<CodeGenerator document={emptyDocument()} onClose={() => {}} />);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'not configured correctly',
    );
    expect(document.body).not.toHaveTextContent('private-value');
    expect(fetch).not.toHaveBeenCalled();
  });
  it('displays the chosen destination and requires consent before uploading', async () => {
    vi.stubEnv('VITE_GENERATOR_URL', 'https://generator.example.com/api/gen');
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(['java'])))
      .mockResolvedValueOnce(new Response('{}'))
      .mockResolvedValueOnce(new Response('', { status: 503 }));
    vi.stubGlobal('fetch', fetch);
    const user = userEvent.setup();
    render(<CodeGenerator document={emptyDocument()} onClose={() => {}} />);
    await screen.findByRole('option', { name: 'java' });
    expect(screen.getByText(/Destination:/)).toHaveTextContent(
      'https://generator.example.com/api/gen/',
    );
    await user.selectOptions(
      screen.getByLabelText('Language / framework'),
      'java',
    );
    await waitFor(() =>
      expect(
        screen.queryByText('Loading generator options…'),
      ).not.toBeInTheDocument(),
    );
    const generate = screen.getByRole('button', {
      name: 'Generate and download ZIP',
    });
    expect(generate).toBeDisabled();
    expect(fetch.mock.calls.every((call) => call[1].method !== 'POST')).toBe(
      true,
    );
    await user.click(
      screen.getByRole('checkbox', { name: /Send this API definition/ }),
    );
    expect(generate).toBeEnabled();
    await user.click(generate);
    await screen.findByRole('alert');
    expect(fetch.mock.calls[2][1].method).toBe('POST');
  });
  it('explains an empty target list', async () => {
    vi.stubEnv('VITE_GENERATOR_URL', 'https://generator.example.com/');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('[]')));
    render(<CodeGenerator document={emptyDocument()} onClose={() => {}} />);
    expect(await screen.findByText(/offers no targets/)).toBeInTheDocument();
  });
});
