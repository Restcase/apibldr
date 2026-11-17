import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import App from '../src/App';
import {
  createWorkspace,
  encodeWorkspace,
  restoreWorkspace,
  storageKey,
} from '../src/domain/workspace';
import { parseApi } from '../src/domain/document';
import { exampleWorkspace } from '../src/domain/examples';

vi.mock('../src/components/SourceEditor', () => ({
  default: ({
    source,
    onChange,
  }: {
    source: string;
    onChange: (source: string) => void;
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
  localStorage.setItem(storageKey, encodeWorkspace(createWorkspace()));
});

it('seeds Petstore only for a new browser workspace', () => {
  localStorage.clear();
  const first = render(<App />);
  expect(screen.getByLabelText('API title')).toHaveValue(
    'Swagger Petstore - OpenAPI 3.1',
  );
  first.unmount();
  const custom = createWorkspace();
  custom.document.info.title = 'Keep my draft';
  localStorage.setItem(storageKey, encodeWorkspace(custom));
  render(<App />);
  expect(screen.getByLabelText('API title')).toHaveValue('Keep my draft');
});
it('loads the exact AsyncAPI example and restores unfinished source with Undo', async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole('button', { name: 'Source' }));
  fireEvent.change(await screen.findByLabelText('API source'), {
    target: { value: 'info: [unfinished' },
  });
  await user.click(screen.getByRole('button', { name: 'Examples' }));
  await user.click(
    screen.getByRole('radio', { name: /Streetlights Kafka API/ }),
  );
  await user.click(screen.getByRole('button', { name: 'Load example' }));
  expect(restoreWorkspace(localStorage.getItem(storageKey)!).document).toEqual(
    exampleWorkspace('streetlights').document,
  );
  await user.click(screen.getByRole('button', { name: 'Undo' }));
  await user.click(screen.getByRole('button', { name: 'Source' }));
  expect(await screen.findByLabelText('API source')).toHaveValue(
    'info: [unfinished',
  );
});
it('imports a file through the new dialog and exports either format without changing the source format', async () => {
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
  await user.click(screen.getByRole('button', { name: 'Import' }));
  const file = new File([''], 'api.yaml', { type: 'application/yaml' });
  Object.defineProperty(file, 'text', {
    value: async () =>
      'openapi: 3.1.0\ninfo:\n  title: Imported\n  version: "1"\npaths: {}',
  });
  await user.upload(screen.getByLabelText('API definition file'), file);
  await user.click(screen.getByRole('radio', { name: 'URL' }));
  await user.click(screen.getByRole('radio', { name: 'File' }));
  expect(screen.getByRole('button', { name: 'Import file' })).toBeDisabled();
  await user.upload(screen.getByLabelText('API definition file'), file);
  await user.click(screen.getByRole('button', { name: 'Import file' }));
  await waitFor(() =>
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
  );
  for (const format of ['JSON', 'YAML']) {
    await user.click(screen.getByRole('button', { name: 'Export' }));
    await user.click(screen.getByRole('button', { name: `Export ${format}` }));
  }
  expect(blobs).toHaveLength(2);
  expect(blobs[0].type).toBe('application/json');
  expect(blobs[1].type).toBe('application/yaml');
  expect(parseApi(await blobs[0].text())).toEqual(
    parseApi(await blobs[1].text()),
  );
  expect(restoreWorkspace(localStorage.getItem(storageKey)!).format).toBe(
    'yaml',
  );
});
it('shows a URL failure in the dialog, keeps the draft, and allows retry', async () => {
  const user = userEvent.setup();
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(new Response('', { status: 403 }))
    .mockResolvedValueOnce(
      new Response(exampleWorkspace('streetlights').source),
    );
  vi.stubGlobal('fetch', fetch);
  render(<App />);
  await user.click(screen.getByRole('button', { name: 'Import' }));
  await user.click(screen.getByRole('radio', { name: 'URL' }));
  await user.type(
    screen.getByLabelText('Definition URL'),
    'https://example.com/api.yaml',
  );
  await user.click(screen.getByRole('button', { name: 'Import URL' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('HTTP 403');
  expect(
    restoreWorkspace(localStorage.getItem(storageKey)!).document.info.title,
  ).toBe('Untitled API');
  await user.click(screen.getByRole('button', { name: 'Import URL' }));
  await waitFor(() =>
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
  );
  expect(screen.getByLabelText('API title')).toHaveValue(
    'Streetlights Kafka API',
  );
});
it('opens the selected graph operation in Designer and keeps the exploration location', async () => {
  const user = userEvent.setup();
  localStorage.setItem(storageKey, encodeWorkspace(exampleWorkspace()));
  render(<App />);
  await user.click(screen.getByRole('button', { name: 'Graph' }));
  expect(screen.getByRole('link', { name: 'Skip to editor' })).toHaveAttribute(
    'href',
    '#graph-editor',
  );
  await user.click(screen.getByRole('button', { name: 'Explore /pet' }));
  await user.click(screen.getByRole('button', { name: 'Explore POST /pet' }));
  await user.click(screen.getByRole('button', { name: 'Open in Designer' }));
  expect(screen.getByLabelText(/Operation ID/)).toHaveValue('addPet');
  await user.click(screen.getByRole('button', { name: 'Graph' }));
  expect(
    within(
      screen.getByRole('complementary', { name: 'Selected node details' }),
    ).getByRole('heading', { name: 'POST /pet' }),
  ).toBeInTheDocument();
});

it('cancels a URL import without replacing the workspace when the request finishes late', async () => {
  const user = userEvent.setup();
  let finish!: (response: Response) => void;
  const fetch = vi.fn<typeof globalThis.fetch>(
    () =>
      new Promise<Response>((resolve) => {
        finish = resolve;
      }),
  );
  vi.stubGlobal('fetch', fetch);
  render(<App />);
  await user.click(screen.getByRole('button', { name: 'Import' }));
  await user.click(screen.getByRole('radio', { name: 'URL' }));
  fireEvent.change(screen.getByLabelText('Definition URL'), {
    target: { value: 'https://example.com/api.yaml' },
  });
  await user.click(screen.getByRole('button', { name: 'Import URL' }));
  await user.click(screen.getByRole('button', { name: 'Cancel import' }));
  expect(fetch.mock.calls[0][1]?.signal?.aborted).toBe(true);
  finish(new Response(exampleWorkspace('streetlights').source));
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Import' })).toBeEnabled(),
  );
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByLabelText('API title')).toHaveValue('Untitled API');
});

it('reopens the graph component after another component was selected in Designer', async () => {
  const user = userEvent.setup();
  const workspace = createWorkspace();
  workspace.document.components = {
    schemas: { First: { type: 'string' }, Second: { type: 'integer' } },
  };
  localStorage.setItem(
    storageKey,
    encodeWorkspace(createWorkspace(workspace.document)),
  );
  render(<App />);
  await user.click(screen.getByRole('button', { name: 'Graph' }));
  await user.click(screen.getByRole('button', { name: 'Explore Components' }));
  await user.click(screen.getByRole('button', { name: /Explore Schemas/ }));
  await user.click(screen.getByRole('button', { name: 'Explore First' }));
  await user.click(screen.getByRole('button', { name: 'Open in Designer' }));
  expect(screen.getByLabelText('Component name')).toHaveValue('First');
  await user.click(screen.getByRole('button', { name: 'Second' }));
  expect(screen.getByLabelText('Component name')).toHaveValue('Second');
  await user.click(screen.getByRole('button', { name: 'Graph' }));
  await user.click(screen.getByRole('button', { name: 'Open in Designer' }));
  expect(screen.getByLabelText('Component name')).toHaveValue('First');
});
