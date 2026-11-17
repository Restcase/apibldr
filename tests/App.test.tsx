import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App';
import { restoreWorkspace, storageKey } from '../src/domain/workspace';

vi.mock('../src/components/SourceEditor', () => ({
  default: ({
    source,
    onChange,
  }: {
    source: string;
    onChange: (value: string) => void;
  }) => (
    <textarea
      aria-label="API source"
      value={source}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}));

beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('editor workflows', () => {
  it('shows required-field errors after blur and clears them when corrected', async () => {
    const user = userEvent.setup();
    render(<App />);
    const title = screen.getByLabelText('API title');
    await user.clear(title);
    expect(title).not.toHaveAttribute('aria-invalid', 'true');
    await user.tab();
    expect(title).toHaveAttribute('aria-invalid', 'true');
    expect(title).toHaveAccessibleDescription(
      'Enter an API title so people can identify this definition.',
    );
    expect(
      screen.getByRole('button', { name: /1 basic check issue/ }),
    ).toHaveClass('has-issues');
    await user.type(title, 'Orders API');
    expect(title).not.toHaveAttribute('aria-invalid', 'true');
    const version = screen.getByLabelText('API version');
    await user.clear(version);
    await user.tab();
    expect(version).toHaveAccessibleDescription(
      'Enter an API version, for example 1.0.0.',
    );
  });
  it('keeps optional metadata accessible and returns General to the details form', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByLabelText('Terms of service')).not.toBeVisible();
    await user.click(screen.getByText('Additional details'));
    await user.type(
      screen.getByLabelText('Terms of service'),
      'https://example.com/terms',
    );
    await addTestOperation(user);
    await user.click(screen.getByRole('button', { name: 'General' }));
    expect(
      screen.getByRole('heading', { name: 'API details' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Terms of service')).toBeVisible();
    expect(screen.getByLabelText('Terms of service')).toHaveValue(
      'https://example.com/terms',
    );
  });
  it('keeps component additions undoable and provides the correct skip destination', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Components' }));
    await user.click(screen.getByRole('button', { name: 'JWT Auth' }));
    expect(screen.getByLabelText('Component name')).toHaveValue('BearerAuth');
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(
      screen.getByRole('heading', { name: 'No security schemes defined' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Redo' }));
    expect(screen.getByLabelText('Bearer format (optional)')).toHaveValue(
      'JWT',
    );
    await user.click(screen.getByRole('button', { name: 'Source' }));
    expect(
      screen.getByRole('link', { name: 'Skip to editor' }),
    ).toHaveAttribute('href', '#source-editor');
    await user.click(screen.getByRole('button', { name: 'Validation' }));
    expect(
      screen.getByRole('link', { name: 'Skip to editor' }),
    ).toHaveAttribute('href', '#validation-editor');
  });
  async function addTestOperation(user: ReturnType<typeof userEvent.setup>) {
    await user.click(
      screen.getAllByRole('button', { name: 'Add operation' })[0],
    );
    fireEvent.change(screen.getByLabelText('Path'), {
      target: { value: '/orders' },
    });
    await user.click(
      screen.getAllByRole('button', { name: 'Add operation' }).at(-1)!,
    );
  }
  it('adds responses, rejects duplicate/status mistakes, and restores removed responses', async () => {
    const user = userEvent.setup();
    render(<App />);
    await addTestOperation(user);
    await user.type(screen.getByLabelText('Status'), '404');
    await user.type(screen.getByLabelText('Description'), 'Order not found');
    await user.click(screen.getByRole('button', { name: 'Add response' }));
    expect(screen.getByLabelText('Response 404 description')).toHaveValue(
      'Order not found',
    );
    await user.type(screen.getByLabelText('Status'), '404');
    await user.type(screen.getByLabelText('Description'), 'Another response');
    await user.click(screen.getByRole('button', { name: 'Add response' }));
    expect(screen.getByRole('alert')).toHaveTextContent('already exists');
    await user.clear(screen.getByLabelText('Status'));
    await user.type(screen.getByLabelText('Status'), '999');
    await user.click(screen.getByRole('button', { name: 'Add response' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Use a status');
    await user.click(
      screen.getByRole('button', { name: 'Remove response 404' }),
    );
    expect(
      screen.queryByLabelText('Response 404 description'),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.getByLabelText('Response 404 description')).toHaveValue(
      'Order not found',
    );
  });
  it('offers contextual form suggestions while allowing custom values', async () => {
    const user = userEvent.setup();
    render(<App />);
    await addTestOperation(user);
    const id = screen.getByLabelText(
      'Operation ID (optional)',
    ) as HTMLInputElement;
    expect(id.list?.options[0].value).toBe('getOrders');
    await user.type(id, 'customOperation');
    expect(id).toHaveValue('customOperation');
    const status = screen.getByLabelText('Status') as HTMLInputElement;
    expect(
      Array.from(status.list!.options).map((option) => option.value),
    ).not.toContain('200');
    await user.type(status, '404');
    const description = screen.getByLabelText(
      'Description',
    ) as HTMLInputElement;
    expect(description.list?.options[0].value).toBe('Not Found');
    expect(description).toHaveValue('');
    await user.type(description, 'Custom error explanation');
    await user.click(screen.getByRole('button', { name: 'Add response' }));
    expect(screen.getByLabelText('Response 404 description')).toHaveValue(
      'Custom error explanation',
    );
    expect(
      Array.from(status.list!.options).map((option) => option.value),
    ).not.toContain('404');
    await user.click(screen.getByRole('button', { name: 'Add operation' }));
    const path = screen.getByLabelText('Path') as HTMLInputElement;
    expect(
      Array.from(path.list!.options).map((option) => option.value),
    ).toEqual(['/orders', '/orders/{id}']);
  });
  it('supports navigation, filtering, visual components, and collapsing the sidebar', async () => {
    const user = userEvent.setup();
    render(<App />);
    await addTestOperation(user);
    await user.type(screen.getByLabelText('Find an operation'), 'absent');
    expect(screen.getByText('No matching operations.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(
      screen.getByRole('button', { name: /get\s*\/orders/i }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Components' }));
    await user.click(screen.getByRole('button', { name: /schemas/i }));
    expect(
      screen.getByRole('heading', { name: 'Schemas' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'API Designer' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Validation' }));
    expect(
      screen.getByRole('heading', { name: 'Document checks' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Back to Designer' }));
    await user.click(screen.getByRole('button', { name: 'Hide navigation' }));
    expect(
      screen.queryByRole('complementary', { name: 'API navigation' }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Show navigation' }));
    expect(
      screen.getByRole('complementary', { name: 'API navigation' }),
    ).toBeInTheDocument();
  });
  it('blocks export and format changes for invalid source, then converts a repaired draft', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Source' }));
    fireEvent.change(await screen.findByLabelText('API source'), {
      target: { value: 'info: [broken' },
    });
    await user.click(screen.getByRole('button', { name: 'JSON' }));
    expect(screen.getByRole('button', { name: 'YAML' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await user.click(screen.getByRole('button', { name: 'Export YAML' }));
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByLabelText('API source')).toHaveValue('info: [broken');
    fireEvent.change(screen.getByLabelText('API source'), {
      target: {
        value:
          'openapi: 3.1.0\ninfo: {title: Repaired, version: "1"}\npaths: {}',
      },
    });
    await user.click(screen.getByRole('button', { name: 'JSON' }));
    expect(
      JSON.parse(
        (screen.getByLabelText('API source') as HTMLTextAreaElement).value,
      ).info.title,
    ).toBe('Repaired');
    await user.click(screen.getByRole('button', { name: 'Designer' }));
    expect(screen.getByLabelText('API title')).toBeEnabled();
    expect(screen.getByLabelText('API title')).toHaveValue('Repaired');
  });
  it('does not mutate the document if a pending import is rejected, and allows retry', async () => {
    const user = userEvent.setup();
    render(<App />);
    const bad = new File([''], 'unreadable.yaml');
    Object.defineProperty(bad, 'text', {
      value: () => Promise.reject(new Error('Read failed')),
    });
    fireEvent.change(screen.getByLabelText('Import API file'), {
      target: { files: [bad] },
    });
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Read failed'),
    );
    expect(screen.getByRole('button', { name: 'Import' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Dismiss error' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
  it('creates a fresh API only after confirmation and supports redo', async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<App />);
    fireEvent.change(screen.getByLabelText('API title'), {
      target: { value: 'Keep me' },
    });
    await user.click(screen.getByRole('button', { name: 'New API' }));
    expect(screen.getByLabelText('API title')).toHaveValue('Keep me');
    confirm.mockReturnValue(true);
    await user.click(screen.getByRole('button', { name: 'New API' }));
    expect(screen.getByLabelText('API title')).toHaveValue('Untitled API');
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.getByLabelText('API title')).toHaveValue('Keep me');
    await user.click(screen.getByRole('button', { name: 'Redo' }));
    expect(screen.getByLabelText('API title')).toHaveValue('Untitled API');
  });
  it('adds an operation, edits it, and restores it after deletion', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(
      screen.getAllByRole('button', { name: 'Add operation' })[0],
    );
    fireEvent.change(screen.getByLabelText('Path'), {
      target: { value: '/orders/{id}' },
    });
    await user.click(
      screen.getAllByRole('button', { name: 'Add operation' }).at(-1)!,
    );
    expect(
      screen.getByRole('heading', { name: 'get /orders/{id}' }),
    ).toBeInTheDocument();
    await user.type(screen.getByLabelText(/Summary/), 'Get an order');
    await user.click(screen.getByRole('button', { name: 'Remove operation' }));
    expect(
      screen.queryByRole('heading', { name: 'get /orders/{id}' }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    await user.click(
      screen.getByRole('button', { name: /get\s*\/orders\/\{id\}/ }),
    );
    expect(screen.getByLabelText(/Summary/)).toHaveValue('Get an order');
    expect(
      restoreWorkspace(localStorage.getItem(storageKey)!).document.paths?.[
        '/orders/{id}'
      ],
    ).toBeDefined();
  });
  it('retains invalid source, blocks conflicting visual edits, and recovers after reload', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<App />);
    await user.click(screen.getByRole('button', { name: 'Source' }));
    const editor = await screen.findByLabelText('API source');
    fireEvent.change(editor, { target: { value: 'info: [unfinished' } });
    expect(screen.getByLabelText('API title')).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Apply source' }));
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(editor).toHaveValue('info: [unfinished');
    unmount();
    render(<App />);
    expect(await screen.findByLabelText('API source')).toHaveValue(
      'info: [unfinished',
    );
    expect(screen.getByLabelText('API title')).toHaveValue('Untitled API');
    expect(screen.getByLabelText('API title')).toBeDisabled();
  });
  it('applies a valid source change to the visual editor', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Source' }));
    fireEvent.change(await screen.findByLabelText('API source'), {
      target: {
        value:
          'openapi: 3.1.0\ninfo:\n  title: Orders API\n  version: "2.0"\npaths: {}\n',
      },
    });
    await user.click(screen.getByRole('button', { name: 'Apply source' }));
    expect(screen.getByLabelText('API title')).toHaveValue('Orders API');
    expect(screen.getByLabelText('API title')).not.toBeDisabled();
  });
  it('keeps the current document when an import fails', async () => {
    render(<App />);
    const file = new File(['invalid'], 'bad.yaml', {
      type: 'application/yaml',
    });
    Object.defineProperty(file, 'text', { value: async () => 'invalid' });
    fireEvent.change(screen.getByLabelText('Import API file'), {
      target: { files: [file] },
    });
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Your current document is unchanged',
      ),
    );
    expect(screen.getByLabelText('API title')).toHaveValue('Untitled API');
  });
  it('imports a file and exports the edited document', async () => {
    const user = userEvent.setup();
    const blobs: Blob[] = [];
    vi.stubGlobal(
      'URL',
      class extends URL {
        static createObjectURL(blob: Blob) {
          blobs.push(blob);
          return 'blob:test';
        }
        static revokeObjectURL() {}
      },
    );
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(<App />);
    const file = new File([''], 'orders.json');
    Object.defineProperty(file, 'text', {
      value: async () =>
        '{"openapi":"3.1.0","info":{"title":"Orders","version":"1"},"paths":{},"x-owner":"team"}',
    });
    fireEvent.change(screen.getByLabelText('Import API file'), {
      target: { files: [file] },
    });
    await waitFor(() =>
      expect(screen.getByLabelText('API title')).toHaveValue('Orders'),
    );
    await user.type(screen.getByLabelText('API title'), ' v2');
    await user.click(screen.getByRole('button', { name: 'Export JSON' }));
    expect(blobs).toHaveLength(1);
    const result = JSON.parse(await blobs[0].text());
    expect(result.info.title).toBe('Orders v2');
    expect(result['x-owner']).toBe('team');
    vi.unstubAllGlobals();
  });
  it('surfaces storage failure and keeps the current edit available', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Quota exceeded');
    });
    render(<App />);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'could not save your draft',
    );
    fireEvent.change(screen.getByLabelText('API title'), {
      target: { value: 'Keep this draft' },
    });
    expect(screen.getByLabelText('API title')).toHaveValue('Keep this draft');
    expect(
      screen.getByRole('button', { name: 'Download draft' }),
    ).toBeInTheDocument();
  });
  it('does not overwrite a corrupted stored workspace', () => {
    localStorage.setItem(storageKey, 'broken saved data');
    render(<App />);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'has not been overwritten',
    );
    expect(localStorage.getItem(storageKey)).toBe('broken saved data');
  });
});
