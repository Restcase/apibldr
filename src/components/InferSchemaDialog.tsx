import { useEffect, useRef, useState } from 'react';
import { inferSchema } from '../domain/infer-schema';
import type { JsonObject } from '../domain/document';
export default function InferSchemaDialog({
  openapi30,
  onClose,
  onAdd,
}: {
  openapi30: boolean;
  onClose: () => void;
  onAdd: (name: string, value: JsonObject) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState('Model');
  const [source, setSource] = useState('');
  const [schema, setSchema] = useState<JsonObject | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const node = dialog.current!;
    node.showModal();
    return () => node.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="component-dialog"
      onCancel={onClose}
      aria-labelledby="infer-schema-title"
    >
      <h2 id="infer-schema-title">Create a schema from JSON</h2>
      <p>
        Paste a representative example. Review the inferred types before adding
        the model; required fields and constraints are not inferred.
      </p>
      <label>
        Schema name
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label>
        JSON example
        <textarea
          rows={8}
          className="mono"
          value={source}
          onChange={(e) => {
            setSource(e.target.value);
            setSchema(null);
          }}
        />
      </label>
      <button
        onClick={() => {
          try {
            const value: unknown = JSON.parse(source);
            setSchema({ ...inferSchema(value, openapi30), example: value });
            setError('');
          } catch (cause) {
            setError(
              cause instanceof Error ? cause.message : 'Enter valid JSON.',
            );
          }
        }}
      >
        Preview inferred schema
      </button>
      {schema && (
        <div>
          <h3>Proposed schema</h3>
          <pre className="component-preview">
            {JSON.stringify(schema, null, 2)}
          </pre>
        </div>
      )}
      {error && (
        <p role="alert" className="error-text">
          {error}
        </p>
      )}
      <div className="form-actions">
        <button onClick={onClose}>Cancel</button>
        <button
          className="primary"
          disabled={!schema || !name.trim()}
          onClick={() => {
            try {
              onAdd(name.trim(), schema!);
              onClose();
            } catch (cause) {
              setError(
                cause instanceof Error
                  ? cause.message
                  : 'Could not add schema.',
              );
            }
          }}
        >
          Add inferred schema
        </button>
      </div>
    </dialog>
  );
}
