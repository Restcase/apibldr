import { useState } from 'react';
import {
  isObject,
  text,
  methods,
  listOperations,
  type ApiDocument,
  type JsonObject,
} from '../domain/document';
import { rewriteReferences } from '../domain/components';
import { TextField } from './ComponentFields';
import JsonField from './JsonField';
export function renamePath(
  doc: ApiDocument,
  from: string,
  to: string,
): ApiDocument {
  if (!to.startsWith('/') || /\s|[?#]/.test(to))
    throw new Error(
      'Start the path with / and omit spaces, query strings and fragments.',
    );
  if (to === from) return doc;
  if (Object.hasOwn(doc.paths ?? {}, to))
    throw new Error('That path already exists. Choose another path.');
  const paths = { ...doc.paths, [to]: doc.paths?.[from] ?? {} };
  delete paths[from];
  const pointer = (path: string) =>
    encodeURIComponent(path.replace(/~/g, '~0').replace(/\//g, '~1'));
  return rewriteReferences(
    { ...doc, paths },
    `#/paths/${pointer(from)}`,
    `#/paths/${pointer(to)}`,
  ) as ApiDocument;
}
export function clonePath(
  doc: ApiDocument,
  from: string,
  to: string,
): ApiDocument {
  if (to === from || Object.hasOwn(doc.paths ?? {}, to))
    throw new Error('Choose a new, unused path address for the copy.');
  renamePath(doc, from, to); // Shared address validation without mutating the source.
  const value = structuredClone(doc.paths?.[from] ?? {});
  const ids = new Set(
    listOperations(doc)
      .map((op) => text(op.value.operationId))
      .filter(Boolean),
  );
  for (const method of methods)
    if (isObject(value[method]) && value[method].operationId) {
      const base = `${value[method].operationId}Copy`;
      let id = base;
      let index = 2;
      while (ids.has(id)) id = `${base}${index++}`;
      value[method].operationId = id;
      ids.add(id);
    }
  return { ...doc, paths: { ...doc.paths, [to]: value } };
}
export default function PathSettings({
  document,
  path,
  onChange,
  onRename,
  expanded = false,
}: {
  document: ApiDocument;
  path: string;
  onChange: (doc: ApiDocument, message?: string) => void;
  onRename: (path: string) => void;
  expanded?: boolean;
}) {
  const [name, setName] = useState(path);
  const [error, setError] = useState('');
  const value = document.paths?.[path] ?? {};
  const patch = (fields: JsonObject) =>
    onChange({
      ...document,
      paths: { ...document.paths, [path]: { ...value, ...fields } },
    });
  return (
    <details className="advanced-details" open={expanded || undefined}>
      <summary>
        Path settings <span>Shared by all methods</span>
      </summary>
      <div className="advanced-fields">
        <form
          className="component-name-form"
          onSubmit={(e) => {
            e.preventDefault();
            try {
              onChange(
                renamePath(document, path, name.trim()),
                'Path renamed. Review path parameters for the new address.',
              );
              onRename(name.trim());
              setError('');
            } catch (cause) {
              setError(
                cause instanceof Error
                  ? cause.message
                  : 'Could not rename path.',
              );
            }
          }}
        >
          <label>
            Path address
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <button disabled={name === path}>Rename path</button>
          <button
            type="button"
            disabled={name === path}
            onClick={() => {
              try {
                onChange(
                  clonePath(document, path, name.trim()),
                  'Path copied. Undo restores the previous definition.',
                );
                onRename(name.trim());
                setError('');
              } catch (cause) {
                setError(
                  cause instanceof Error
                    ? cause.message
                    : 'Could not copy path.',
                );
              }
            }}
          >
            Copy path
          </button>
        </form>
        {error && (
          <p role="alert" className="error-text">
            {error}
          </p>
        )}
        <p className="muted small">
          Enter a new address above to rename or copy this path with all its
          methods.
        </p>
        <TextField
          label="Path summary"
          value={value.summary}
          onChange={(summary) => patch({ summary })}
        />
        <TextField
          label="Path description"
          multiline
          value={value.description}
          onChange={(description) => patch({ description })}
        />
        <JsonField
          label="Shared path parameters"
          kind="array"
          value={value.parameters}
          onChange={(parameters) => patch({ parameters })}
        />
        <JsonField
          label="Path servers"
          kind="array"
          value={value.servers}
          onChange={(servers) => patch({ servers })}
        />
        <JsonField
          label="Complete path definition"
          value={value}
          onChange={(value) =>
            onChange({
              ...document,
              paths: { ...document.paths, [path]: value as JsonObject },
            })
          }
        />
        <button
          className="danger-text"
          onClick={() => {
            const paths = { ...document.paths };
            delete paths[path];
            const next = { ...document, paths };
            const ref = `#/paths/${encodeURIComponent(path.replace(/~/g, '~0').replace(/\//g, '~1'))}`;
            if (
              JSON.stringify(rewriteReferences(next, ref, '#removed-path')) !==
              JSON.stringify(next)
            ) {
              setError(
                'This path is referenced elsewhere. Remove those references first.',
              );
              return;
            }
            onChange(
              next,
              'Path and its operations removed. Undo restores them.',
            );
            onRename('');
          }}
        >
          Remove path and all methods
        </button>
      </div>
    </details>
  );
}
