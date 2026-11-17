import { useEffect, useRef, useState } from 'react';
import {
  isObject,
  text,
  type ApiDocument,
  type JsonObject,
} from '../domain/document';
import {
  generateCode,
  getGeneratorConfig,
  loadGenerators,
  loadGeneratorOptions,
  type GeneratorKind,
} from '../domain/codegen';
import { Choice, TextField, Flag } from './ComponentFields';
export default function CodeGenerator({
  document,
  onClose,
}: {
  document: ApiDocument;
  onClose: () => void;
}) {
  const { url: generatorUrl, error: configurationError } = getGeneratorConfig();
  const dialog = useRef<HTMLDialogElement>(null);
  const [kind, setKind] = useState<GeneratorKind>('clients');
  const [languages, setLanguages] = useState<string[]>([]);
  const [language, setLanguage] = useState('');
  const [definitions, setDefinitions] = useState<JsonObject>({});
  const [options, setOptions] = useState<JsonObject>({});
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [retry, setRetry] = useState(0);
  const [consent, setConsent] = useState(false);
  const task = useRef<AbortController | null>(null);
  useEffect(() => {
    const node = dialog.current!;
    node.showModal();
    return () => {
      node.close();
      task.current?.abort();
    };
  }, []);
  useEffect(() => {
    if (!generatorUrl) return;
    const controller = new AbortController();
    setLoading(true);
    setLanguages([]);
    setLanguage('');
    setDefinitions({});
    setError('');
    loadGenerators(kind, controller.signal)
      .then(setLanguages)
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [kind, retry, generatorUrl]);
  useEffect(() => {
    if (!language) return;
    const controller = new AbortController();
    setLoading(true);
    setDefinitions({});
    setError('');
    loadGeneratorOptions(kind, language, controller.signal)
      .then((data) => {
        setDefinitions(data);
        setOptions(
          Object.fromEntries(
            Object.entries(data).map(([key, raw]) => [
              key,
              isObject(raw) ? raw.default : undefined,
            ]),
          ),
        );
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [kind, language]);
  async function generate() {
    if (!generatorUrl || !consent || !language || loading || generating) return;
    const controller = new AbortController();
    task.current = controller;
    setGenerating(true);
    setError('');
    setNotice('');
    try {
      const blob = await generateCode(
        document,
        kind,
        language,
        options,
        controller.signal,
      );
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = `${language}-${kind}.zip`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice('Code archive downloaded.');
    } catch (e) {
      if (!controller.signal.aborted)
        setError(e instanceof Error ? e.message : 'Generation failed. Retry.');
    } finally {
      setGenerating(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      className="component-dialog"
      onCancel={onClose}
      aria-labelledby="codegen-title"
    >
      <h2 id="codegen-title">Generate code</h2>
      {!generatorUrl ? (
        <p role={configurationError ? 'alert' : 'status'}>
          {configurationError ||
            'Code generation is not enabled on this site. You can export your API definition and use it with a code generator of your choice.'}
        </p>
      ) : (
        <>
          <p>
            Generate a client SDK or server scaffold using this site's
            configured service.
          </p>
          <fieldset disabled={generating} className="editor-fieldset">
            <Choice
              label="Generator type"
              value={kind}
              choices={['clients', 'servers']}
              onChange={(v) => {
                if (v) setKind(v as GeneratorKind);
              }}
            />
            <Choice
              label="Language / framework"
              value={language}
              choices={languages}
              onChange={setLanguage}
            />
            {loading && <p role="status">Loading generator options…</p>}
            {!loading && !error && languages.length === 0 && (
              <p role="status">
                This service offers no targets for this generator type. Try the
                other generator type, or export your definition to generate code
                elsewhere.
              </p>
            )}
            <details className="advanced-details">
              <summary>Generator options</summary>
              <div className="advanced-fields">
                {Object.entries(definitions).map(([key, raw]) => {
                  const def = isObject(raw) ? raw : {};
                  return def.type === 'boolean' ? (
                    <Flag
                      key={key}
                      label={key}
                      checked={options[key] === true || options[key] === 'true'}
                      onChange={(v) => setOptions({ ...options, [key]: v })}
                    />
                  ) : (
                    <TextField
                      key={key}
                      label={key}
                      hint={text(def.description)}
                      value={
                        options[key] === undefined ? '' : String(options[key])
                      }
                      onChange={(v) => setOptions({ ...options, [key]: v })}
                    />
                  );
                })}
              </div>
            </details>
            <Flag
              label="Send this API definition to the generation service shown below"
              checked={consent}
              onChange={setConsent}
            />
            <p className="muted small">
              Destination: {generatorUrl}. Do not include credentials or
              confidential data you are not permitted to send. Generation
              requires an internet connection.
            </p>
          </fieldset>
        </>
      )}
      {error && (
        <p role="alert" className="error-text">
          {error}{' '}
          <button onClick={() => setRetry((v) => v + 1)}>
            Reload generators
          </button>
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      <div className="form-actions">
        <button onClick={onClose}>
          {generating ? 'Cancel generation' : 'Close'}
        </button>
        {generatorUrl && (
          <button
            className="primary"
            disabled={!language || !consent || loading || generating}
            onClick={generate}
          >
            {generating ? 'Generating…' : 'Generate and download ZIP'}
          </button>
        )}
      </div>
    </dialog>
  );
}
