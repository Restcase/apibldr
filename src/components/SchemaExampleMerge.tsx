import { useState } from 'react';
import { inferSchema } from '../domain/infer-schema';
import { isObject, type JsonObject } from '../domain/document';
export default function SchemaExampleMerge({
  value,
  patch,
}: {
  value: JsonObject;
  patch: (value: JsonObject) => void;
}) {
  const [source, setSource] = useState('');
  const [proposal, setProposal] = useState<JsonObject | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  return (
    <details className="advanced-details">
      <summary>Infer properties from JSON</summary>
      <div className="advanced-fields">
        <p className="muted">
          Compare inferred properties with the current model before applying.
          Existing properties absent from the example are preserved.
        </p>
        <label>
          Object example
          <textarea
            rows={5}
            className="mono"
            value={source}
            onChange={(e) => {
              setSource(e.target.value);
              setProposal(null);
              setNotice('');
            }}
          />
        </label>
        <button
          onClick={() => {
            try {
              const example: unknown = JSON.parse(source);
              if (!isObject(example))
                throw new Error('Enter a JSON object to infer properties.');
              const inferred = inferSchema(example);
              const old = isObject(value.properties) ? value.properties : {};
              const properties = isObject(inferred.properties)
                ? inferred.properties
                : {};
              setProposal(
                Object.fromEntries(
                  [
                    ...new Set([
                      ...Object.keys(old),
                      ...Object.keys(properties),
                    ]),
                  ].map((key) => [
                    key,
                    {
                      ...(isObject(old[key]) ? old[key] : {}),
                      ...(isObject(properties[key]) ? properties[key] : {}),
                    },
                  ]),
                ),
              );
              setError('');
            } catch (cause) {
              setError(
                cause instanceof Error
                  ? cause.message
                  : 'Correct the example JSON.',
              );
            }
          }}
        >
          Compare properties
        </button>
        {proposal && (
          <>
            <div className="schema-comparison">
              <div>
                <h4>Current properties</h4>
                <pre className="component-preview">
                  {JSON.stringify(value.properties ?? {}, null, 2)}
                </pre>
              </div>
              <div>
                <h4>Proposed properties</h4>
                <pre className="component-preview">
                  {JSON.stringify(proposal, null, 2)}
                </pre>
              </div>
            </div>
            <div className="form-actions">
              <button onClick={() => setProposal(null)}>
                Cancel inference
              </button>
              <button
                onClick={() => {
                  patch({ properties: proposal });
                  setProposal(null);
                  setNotice(
                    'Properties updated. Undo restores the previous model.',
                  );
                }}
              >
                Apply inferred properties
              </button>
            </div>
          </>
        )}
        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}
        {notice && <p role="status">{notice}</p>}
      </div>
    </details>
  );
}
