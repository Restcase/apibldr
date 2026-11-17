import InferSchemaDialog from './InferSchemaDialog';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Code2, Copy, Layers, Plus, Search, Trash2, X } from 'lucide-react';
import {
  isObject,
  parseApi,
  type ApiDocument,
  type JsonObject,
} from '../domain/document';
import {
  catalogFor,
  componentRef,
  getComponents,
  removeComponent,
  renameComponent,
  setComponent,
  uniqueComponentName,
  type ComponentCategory,
} from '../domain/components';
import ComponentFields from './ComponentFields';
import AsyncFields from './AsyncFields';

function AdvancedDialog({
  value,
  name,
  category,
  onClose,
  onApply,
}: {
  value: unknown;
  name: string;
  category: ComponentCategory;
  onClose: () => void;
  onApply: (value: unknown) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [source, setSource] = useState(JSON.stringify(value, null, 2));
  const [error, setError] = useState('');
  useEffect(() => {
    const node = dialog.current!;
    node.showModal();
    return () => node.close();
  }, []);
  function apply(event: FormEvent) {
    event.preventDefault();
    try {
      const parsed: unknown = JSON.parse(source);
      if (
        !isObject(parsed) &&
        !(category === 'schemas' && typeof parsed === 'boolean')
      )
        throw new Error('Enter a JSON object for this component.');
      onApply(parsed);
      onClose();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Could not apply this JSON. Correct it and try again.',
      );
    }
  }
  return (
    <dialog
      ref={dialog}
      className="component-dialog"
      onCancel={onClose}
      aria-labelledby="advanced-component-title"
    >
      <form onSubmit={apply}>
        <div className="component-dialog-header">
          <h2 id="advanced-component-title">Edit {name}</h2>
          <button
            type="button"
            className="icon-button"
            aria-label="Close component editor"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
        <p className="muted">
          Edit this component’s complete JSON definition. Other components stay
          unchanged.
        </p>
        <label className="component-field">
          <span>Component JSON</span>
          <textarea
            autoFocus
            spellCheck={false}
            rows={16}
            value={source}
            onChange={(event) => setSource(event.target.value)}
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={error ? 'component-json-error' : undefined}
          />
        </label>
        {error && (
          <p id="component-json-error" className="error-text" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="primary">
            Apply component
          </button>
        </div>
      </form>
    </dialog>
  );
}
function ComponentName({
  name,
  onRename,
}: {
  name: string;
  onRename: (name: string) => void;
}) {
  const [draft, setDraft] = useState(name);
  return (
    <form
      className="component-name-form"
      onSubmit={(event) => {
        event.preventDefault();
        onRename(draft.trim());
      }}
    >
      <label>
        Component name
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          required
          pattern="[a-zA-Z0-9._-]+"
          aria-describedby="component-name-hint"
        />
      </label>
      <button type="submit" disabled={draft === name}>
        Rename
      </button>
      <small id="component-name-hint">
        Renaming updates local references to this component.
      </small>
    </form>
  );
}
export default function ComponentWorkspace({
  category,
  document,
  onChange,
  initialSelected = '',
}: {
  category: ComponentCategory;
  document: ApiDocument;
  initialSelected?: string;
  onChange: (document: ApiDocument, message?: string) => void;
}) {
  const catalog = catalogFor(document, category);
  const entries = getComponents(document, category);
  const names = Object.keys(entries);
  const [selected, setSelected] = useState(initialSelected);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [advanced, setAdvanced] = useState(false);
  const [inferring, setInferring] = useState(false);
  const active = Object.hasOwn(entries, selected) ? selected : (names[0] ?? '');
  const value = entries[active];
  const filtered = names.filter((name) =>
    name.toLowerCase().includes(query.toLowerCase()),
  );
  const schemas = Object.keys(getComponents(document, 'schemas'));
  function save(next: ApiDocument, notice: string) {
    // Apply the same size, JSON safety, and document checks as source editing.
    const checked = parseApi(JSON.stringify(next));
    onChange(checked, notice);
    setError('');
    setMessage(notice);
  }
  function add(preset = catalog.presets[0]) {
    try {
      const name = uniqueComponentName(document, category, preset.name);
      save(
        setComponent(document, category, name, structuredClone(preset.value)),
        `Added ${name}. Edit its fields below.`,
      );
      setSelected(name);
      setQuery('');
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Could not add this definition. Try again.',
      );
    }
  }
  function replace(next: unknown) {
    if (
      category === 'schemas' &&
      typeof next === 'boolean' &&
      document.openapi?.startsWith('3.0')
    )
      throw new Error(
        'Boolean schemas need OpenAPI 3.1. Use a schema object for OpenAPI 3.0.',
      );
    save(setComponent(document, category, active, next), `Updated ${active}.`);
  }
  function patch(fields: JsonObject) {
    try {
      const current = isObject(value) ? { ...value } : {};
      if (
        category === 'securitySchemes' &&
        fields.type &&
        fields.type !== current.type
      ) {
        for (const key of [
          'scheme',
          'bearerFormat',
          'in',
          'name',
          'flows',
          'openIdConnectUrl',
        ])
          delete current[key];
        const preset = catalog.presets.find(
          (item) => item.value.type === fields.type,
        );
        Object.assign(current, structuredClone(preset?.value ?? {}));
      }
      replace({ ...current, ...fields });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Could not save this edit. Try again.',
      );
    }
  }
  return (
    <div className="component-workspace">
      {inferring && (
        <InferSchemaDialog
          openapi30={document.openapi?.startsWith('3.0') === true}
          onClose={() => setInferring(false)}
          onAdd={(name, value) => {
            if (!/^[a-zA-Z0-9._-]+$/.test(name))
              throw new Error(
                'Use letters, digits, dots, underscores or hyphens.',
              );
            if (Object.hasOwn(entries, name))
              throw new Error('A schema with this name already exists.');
            save(
              setComponent(document, 'schemas', name, value),
              'Inferred schema added. Review the model before using it.',
            );
            setSelected(name);
          }}
        />
      )}
      <div className="component-page-header">
        <div>
          <h2 className="content-title">{catalog.title}</h2>
          <p className="lede">{catalog.description}</p>
        </div>
        <button type="button" className="primary" onClick={() => add()}>
          <Plus size={17} />
          Add {catalog.singular}
        </button>
      </div>
      <div className="component-layout">
        <div className="component-main">
          {names.length ? (
            <>
              <div className="component-picker">
                <label className="search-field">
                  <Search size={16} />
                  <span className="sr-only">Find a component</span>
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={`Find ${catalog.title.toLowerCase()}…`}
                  />
                </label>
                <nav
                  className="component-list"
                  aria-label={`${catalog.title} definitions`}
                >
                  {filtered.map((name) => (
                    <button
                      type="button"
                      key={name}
                      aria-current={name === active ? 'page' : undefined}
                      onClick={() => {
                        setSelected(name);
                        setError('');
                      }}
                    >
                      <Layers size={15} />
                      <span>{name}</span>
                    </button>
                  ))}
                </nav>
                {!filtered.length && (
                  <p className="muted">
                    No matching definitions.{' '}
                    <button
                      className="text-button"
                      type="button"
                      onClick={() => setQuery('')}
                    >
                      Clear component search
                    </button>
                  </p>
                )}
              </div>
              <div className="component-definition" key={active}>
                <ComponentName
                  name={active}
                  onRename={(name) => {
                    try {
                      save(
                        renameComponent(document, category, active, name),
                        `Renamed ${active} to ${name}. Local references updated.`,
                      );
                      setSelected(name);
                    } catch (cause) {
                      setError(
                        cause instanceof Error
                          ? cause.message
                          : 'Could not rename this definition. Try another name.',
                      );
                    }
                  }}
                />
                <div className="reference-preview">
                  <span>Reference</span>
                  <code>{componentRef(category, active)}</code>
                </div>
                {isObject(value) ? (
                  document.asyncapi ? (
                    <AsyncFields
                      category={category}
                      value={value}
                      patch={patch}
                      document={document}
                      replace={replace}
                    />
                  ) : (
                    <ComponentFields
                      category={category}
                      value={value}
                      patch={patch}
                      schemas={schemas}
                    />
                  )
                ) : (
                  <p className="inline-notice">
                    This definition uses{' '}
                    {typeof value === 'boolean'
                      ? 'a boolean schema'
                      : 'a shape without visual controls'}
                    . Edit it using Advanced JSON.
                  </p>
                )}
                <div className="component-actions">
                  <button type="button" onClick={() => setAdvanced(true)}>
                    <Code2 size={16} />
                    Advanced JSON
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const name = uniqueComponentName(
                        document,
                        category,
                        `${active}Copy`,
                      );
                      try {
                        save(
                          setComponent(
                            document,
                            category,
                            name,
                            structuredClone(value),
                          ),
                          `Duplicated ${active} as ${name}.`,
                        );
                        setSelected(name);
                        setQuery('');
                      } catch (cause) {
                        setError(
                          cause instanceof Error
                            ? cause.message
                            : 'Could not duplicate this definition.',
                        );
                      }
                    }}
                  >
                    <Copy size={16} />
                    Duplicate
                  </button>
                  <button
                    type="button"
                    className="text-button danger"
                    onClick={() => {
                      try {
                        save(
                          removeComponent(document, category, active),
                          `Removed ${active}. Use Undo to restore it.`,
                        );
                        setSelected('');
                      } catch (cause) {
                        setError(
                          cause instanceof Error
                            ? cause.message
                            : 'Could not remove this definition.',
                        );
                      }
                    }}
                  >
                    <Trash2 size={16} />
                    Remove {catalog.singular}
                  </button>
                </div>
                <p className="muted small">
                  Changes save locally. Undo restores edits and removals.
                </p>
              </div>
            </>
          ) : (
            <div className="component-empty">
              <Layers size={32} />
              <h3>No {catalog.title.toLowerCase()} defined</h3>
              <p>
                {catalog.description} Start with a quick add or create your
                first {catalog.singular}.
              </p>
              <button type="button" onClick={() => add()}>
                <Plus size={16} />
                Create first {catalog.singular}
              </button>
            </div>
          )}
          {error && (
            <p className="inline-notice error-text" role="alert">
              {error}
            </p>
          )}
          {message && (
            <p className="component-feedback" role="status">
              {message}
            </p>
          )}
        </div>
        <aside className="component-help" aria-label="Component guidance">
          <section>
            <h3>Quick add</h3>
            <p>Start with a common definition, then customize it.</p>
            <div className="quick-add-options">
              {category === 'schemas' && (
                <button onClick={() => setInferring(true)}>
                  Infer from JSON
                </button>
              )}
              {catalog.presets.map((preset) => (
                <button
                  type="button"
                  key={preset.name}
                  onClick={() => add(preset)}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </section>
          <section>
            <h3>About {catalog.title.toLowerCase()}</h3>
            <p>{catalog.usage}</p>
          </section>
        </aside>
      </div>
      {advanced && (
        <AdvancedDialog
          value={value}
          name={active}
          category={category}
          onClose={() => setAdvanced(false)}
          onApply={replace}
        />
      )}
    </div>
  );
}
