import { useEffect, useRef, useState } from 'react';
export default function ImportDialog({
  busy,
  error,
  onFile,
  onUrl,
  onClose,
}: {
  busy: boolean;
  error: string;
  onFile: (file: File, signal: AbortSignal) => Promise<boolean>;
  onUrl: (url: string, signal: AbortSignal) => Promise<boolean>;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const controller = useRef<AbortController | null>(null);
  const [mode, setMode] = useState('file');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  useEffect(() => {
    const node = dialog.current!;
    node.showModal();
    return () => {
      controller.current?.abort();
      node.close();
    };
  }, []);
  function cancel() {
    controller.current?.abort();
    onClose();
  }
  return (
    <dialog
      ref={dialog}
      className="component-dialog"
      aria-labelledby="import-heading"
      onDrop={(event) => event.stopPropagation()}
      onCancel={(event) => {
        event.preventDefault();
        cancel();
      }}
    >
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (busy || (mode === 'file' && !file)) return;
          controller.current = new AbortController();
          const ok =
            mode === 'file'
              ? await onFile(file!, controller.current.signal)
              : await onUrl(url, controller.current.signal);
          if (ok) onClose();
        }}
      >
        <h2 id="import-heading">Import an API definition</h2>
        <p>
          Import OpenAPI, AsyncAPI, or Swagger 2.0 as JSON or YAML. This
          replaces the current definition; Undo restores your work.
        </p>
        <fieldset className="import-options" disabled={busy}>
          <legend>Import from</legend>
          <label>
            <input
              type="radio"
              name="import-mode"
              checked={mode === 'file'}
              onChange={() => {
                setFile(null);
                setMode('file');
              }}
            />{' '}
            File
          </label>
          <label>
            <input
              type="radio"
              name="import-mode"
              checked={mode === 'url'}
              onChange={() => setMode('url')}
            />{' '}
            URL
          </label>
        </fieldset>
        {mode === 'file' ? (
          <label key="file">
            API definition file
            <input
              type="file"
              aria-label="API definition file"
              aria-describedby="import-file-hint"
              disabled={busy}
              aria-required="true"
              accept=".json,.yaml,.yml,application/json,application/yaml,text/yaml"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
            <small id="import-file-hint">
              JSON or YAML, up to 2 MB. Drag and drop onto the workspace also
              works.
            </small>
          </label>
        ) : (
          <label key="url">
            Definition URL
            <input
              type="url"
              aria-label="Definition URL"
              disabled={busy}
              required
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://example.com/openapi.yaml"
              autoComplete="url"
              aria-describedby="import-url-hint"
            />
            <small id="import-url-hint">
              Use a direct JSON or YAML URL. The server must allow browser
              access (CORS). No login credentials are sent.
            </small>
          </label>
        )}
        {error && (
          <p role="alert" className="error-text">
            {error}
          </p>
        )}
        {busy && (
          <p role="status">
            Importing definition… Your current document stays unchanged until
            the import succeeds.
          </p>
        )}
        <div className="form-actions">
          <button type="button" onClick={cancel}>
            {busy ? 'Cancel import' : 'Cancel'}
          </button>
          <button
            type="submit"
            className="primary"
            disabled={busy || (mode === 'file' && !file)}
          >
            {busy
              ? 'Importing…'
              : mode === 'file'
                ? 'Import file'
                : 'Import URL'}
          </button>
        </div>
      </form>
    </dialog>
  );
}
