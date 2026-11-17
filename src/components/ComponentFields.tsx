import SchemaExampleMerge from './SchemaExampleMerge';
import MarkdownInput from './MarkdownInput';
import SchemaDetails from './SchemaDetails';
import { useId, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { isObject, text, type JsonObject } from '../domain/document';
import { componentRef, type ComponentCategory } from '../domain/components';

export function TextField({
  label,
  value,
  onChange,
  multiline = false,
  hint,
}: {
  label: string;
  value: unknown;
  onChange: (value: string) => void;
  multiline?: boolean;
  hint?: string;
}) {
  const id = useId();
  return (
    <div className="component-field">
      <label htmlFor={id}>{label}</label>
      {multiline ? (
        <MarkdownInput
          id={id}
          describedBy={hint ? `${id}-hint` : undefined}
          value={text(value)}
          onChange={onChange}
        />
      ) : (
        <input
          id={id}
          aria-describedby={hint ? `${id}-hint` : undefined}
          value={text(value)}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
      {hint && <small id={`${id}-hint`}>{hint}</small>}
    </div>
  );
}
export function Choice({
  label,
  value,
  choices,
  onChange,
}: {
  label: string;
  value: unknown;
  choices: string[];
  onChange: (value: string) => void;
}) {
  const current = text(value);
  return (
    <label className="component-field">
      <span>{label}</span>
      <select
        value={current}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Not specified</option>
        {[...new Set([...choices, ...(current ? [current] : [])])].map(
          (choice) => (
            <option key={choice} value={choice}>
              {choice}
            </option>
          ),
        )}
      </select>
    </label>
  );
}
export function Flag({
  label,
  checked,
  disabled,
  invalid,
  describedBy,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="checkbox-field">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}
const types = ['string', 'integer', 'number', 'boolean', 'object', 'array'];
export function SchemaChoice({
  schema,
  schemas,
  onChange,
  label = 'Schema type',
}: {
  schema: unknown;
  schemas: string[];
  onChange: (value: JsonObject) => void;
  label?: string;
}) {
  const value = isObject(schema) ? schema : {};
  const current = text(value.$ref) || text(value.type);
  return (
    <Choice
      label={label}
      value={current}
      choices={[
        ...types,
        ...schemas.map((name) => componentRef('schemas', name)),
      ]}
      onChange={(choice) => {
        const next = { ...value };
        if (choice.startsWith('#')) {
          next.$ref = choice;
        } else {
          delete next.$ref;
          if (choice) next.type = choice;
          else delete next.type;
          if (choice === 'array' && next.items === undefined)
            next.items = { type: 'string' };
        }
        onChange(next);
      }}
    />
  );
}
export function Properties({
  value,
  patch,
  schemas,
  depth = 0,
}: {
  depth?: number;
  value: JsonObject;
  patch: (patch: JsonObject) => void;
  schemas: string[];
}) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const properties = isObject(value.properties) ? value.properties : {};
  const required = Array.isArray(value.required) ? value.required : [];
  return (
    <section className="component-subsection">
      <h3>Properties</h3>
      {Object.entries(properties).map(([key, property]) => (
        <div key={key}>
          <div className="property-row">
            <code>{key}</code>
            <SchemaChoice
              label={`${key} type`}
              schema={property}
              schemas={schemas}
              onChange={(schema) =>
                patch({ properties: { ...properties, [key]: schema } })
              }
            />
            <Flag
              label={`${key} required`}
              checked={required.includes(key)}
              onChange={(checked) =>
                patch({
                  required: checked
                    ? [...new Set([...required, key])]
                    : required.filter((item) => item !== key),
                })
              }
            />
            <button
              type="button"
              className="icon-button danger"
              aria-label={`Remove property ${key}`}
              title="Remove property (Undo available)"
              onClick={() => {
                const next = { ...properties };
                delete next[key];
                patch({
                  properties: next,
                  required: required.filter((item) => item !== key),
                });
              }}
            >
              <Trash2 size={16} />
            </button>
          </div>
          {isObject(property) && depth < 8 && (
            <details className="advanced-details">
              <summary>{key} details</summary>
              <div className="advanced-fields">
                <TextField
                  label={`${key} description`}
                  value={property.description}
                  onChange={(description) =>
                    patch({
                      properties: {
                        ...properties,
                        [key]: { ...property, description },
                      },
                    })
                  }
                />
                {property.type === 'object' && (
                  <Properties
                    value={property}
                    schemas={schemas}
                    depth={depth + 1}
                    patch={(fields) =>
                      patch({
                        properties: {
                          ...properties,
                          [key]: { ...property, ...fields },
                        },
                      })
                    }
                  />
                )}
                <SchemaDetails
                  value={property}
                  schemas={schemas}
                  depth={depth + 1}
                  patch={(fields) =>
                    patch({
                      properties: {
                        ...properties,
                        [key]: { ...property, ...fields },
                      },
                    })
                  }
                />
              </div>
            </details>
          )}
        </div>
      ))}
      {!Object.keys(properties).length && (
        <p className="muted">
          No properties yet. Add a field such as id or name.
        </p>
      )}
      <form
        className="inline-add"
        onSubmit={(event) => {
          event.preventDefault();
          const key = name.trim();
          if (!key) return setError('Enter a property name.');
          if (Object.hasOwn(properties, key))
            return setError(
              'That property already exists. Choose another name.',
            );
          patch({ properties: { ...properties, [key]: { type: 'string' } } });
          setName('');
          setError('');
        }}
      >
        <label>
          Property name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="name"
            required
          />
        </label>
        <button type="submit">
          <Plus size={16} />
          Add property
        </button>
      </form>
      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
export function ContentFields({
  value,
  patch,
  schemas,
}: {
  value: JsonObject;
  patch: (patch: JsonObject) => void;
  schemas: string[];
}) {
  const content = isObject(value.content) ? value.content : {};
  const [chosen, setChosen] = useState('');
  const [newMedia, setNewMedia] = useState('application/json');
  const [error, setError] = useState('');
  const current = Object.hasOwn(content, chosen)
    ? chosen
    : (Object.keys(content)[0] ?? '');
  const media = isObject(content[current]) ? content[current] : {};
  return (
    <section className="component-subsection">
      <h3>Content</h3>
      {current ? (
        <>
          <Choice
            label="Media type"
            value={current}
            choices={Object.keys(content)}
            onChange={setChosen}
          />
          <SchemaChoice
            schema={media.schema}
            schemas={schemas}
            onChange={(schema) =>
              patch({
                content: { ...content, [current]: { ...media, schema } },
              })
            }
          />
        </>
      ) : (
        <p className="muted">
          No response body is defined. Add a media type when a body is expected.
        </p>
      )}
      <form
        className="inline-add"
        onSubmit={(event) => {
          event.preventDefault();
          if (!/^[^\s/]+\/[^\s/]+$/.test(newMedia))
            return setError('Enter a media type such as application/json.');
          if (Object.hasOwn(content, newMedia))
            return setError('That media type already exists. Select it above.');
          patch({
            content: { ...content, [newMedia]: { schema: { type: 'object' } } },
          });
          setChosen(newMedia);
          setError('');
        }}
      >
        <label>
          New media type
          <input
            value={newMedia}
            onChange={(event) => setNewMedia(event.target.value)}
            list="component-media-types"
          />
        </label>
        <button type="submit">Add media type</button>
      </form>
      <datalist id="component-media-types">
        {[
          'application/json',
          'application/xml',
          'text/plain',
          'multipart/form-data',
        ].map((item) => (
          <option key={item} value={item} />
        ))}
      </datalist>
      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
export function OAuthFields({
  value,
  patch,
  scopeKey = 'scopes',
}: {
  scopeKey?: string;
  value: JsonObject;
  patch: (patch: JsonObject) => void;
}) {
  const flows = isObject(value.flows) ? value.flows : {};
  const [selected, setSelected] = useState('authorizationCode');
  const [scopeName, setScopeName] = useState('');
  const [scopeDescription, setScopeDescription] = useState('');
  const [error, setError] = useState('');
  const kind = Object.hasOwn(flows, selected)
    ? selected
    : (Object.keys(flows)[0] ?? selected);
  const flow = isObject(flows[kind]) ? flows[kind] : {};
  const scopes = isObject(flow[scopeKey]) ? flow[scopeKey] : {};
  const update = (fields: JsonObject) =>
    patch({ flows: { ...flows, [kind]: { ...flow, ...fields } } });
  return (
    <section className="component-subsection">
      <h3>OAuth flows</h3>
      <Choice
        label="OAuth flow"
        value={kind}
        choices={[
          'authorizationCode',
          'implicit',
          'password',
          'clientCredentials',
        ]}
        onChange={(next) => {
          setSelected(next);
          if (next && !Object.hasOwn(flows, next))
            patch({
              flows: {
                ...flows,
                [next]: {
                  ...(['authorizationCode', 'implicit'].includes(next)
                    ? {
                        authorizationUrl: 'https://example.com/oauth/authorize',
                      }
                    : {}),
                  ...(next !== 'implicit'
                    ? { tokenUrl: 'https://example.com/oauth/token' }
                    : {}),
                  [scopeKey]: {},
                },
              },
            });
        }}
      />
      {['authorizationCode', 'implicit'].includes(kind) && (
        <TextField
          label="Authorization URL"
          value={flow.authorizationUrl}
          onChange={(authorizationUrl) => update({ authorizationUrl })}
        />
      )}
      {kind !== 'implicit' && (
        <TextField
          label="Token URL"
          value={flow.tokenUrl}
          onChange={(tokenUrl) => update({ tokenUrl })}
        />
      )}
      <TextField
        label="Refresh URL (optional)"
        value={flow.refreshUrl}
        onChange={(refreshUrl) => update({ refreshUrl })}
      />
      <h3>Scopes</h3>
      {Object.entries(scopes).map(([name, description]) => (
        <div className="scope-row" key={name}>
          <code>{name}</code>
          <TextField
            label={`${name} description`}
            value={description}
            onChange={(next) =>
              update({ [scopeKey]: { ...scopes, [name]: next } })
            }
          />
          <button
            type="button"
            className="icon-button danger"
            aria-label={`Remove scope ${name}`}
            onClick={() => {
              const next = { ...scopes };
              delete next[name];
              update({ [scopeKey]: next });
            }}
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}
      <form
        className="inline-add"
        onSubmit={(event) => {
          event.preventDefault();
          const name = scopeName.trim();
          if (!name || Object.hasOwn(scopes, name))
            return setError('Enter a new, unique scope name.');
          update({ [scopeKey]: { ...scopes, [name]: scopeDescription } });
          setScopeName('');
          setScopeDescription('');
          setError('');
        }}
      >
        <label>
          Scope name
          <input
            value={scopeName}
            onChange={(event) => setScopeName(event.target.value)}
            required
            placeholder="read:orders"
          />
        </label>
        <label>
          Scope description
          <input
            value={scopeDescription}
            onChange={(event) => setScopeDescription(event.target.value)}
          />
        </label>
        <button type="submit">Add scope</button>
      </form>
      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
export default function ComponentFields({
  category,
  value,
  patch,
  schemas,
}: {
  category: ComponentCategory;
  value: JsonObject;
  patch: (patch: JsonObject) => void;
  schemas: string[];
}) {
  const requiredHintId = useId();
  const invalidPathParameter =
    category === 'parameters' && value.in === 'path' && value.required !== true;
  if (value.$ref)
    return (
      <div className="inline-notice">
        <strong>Referenced definition</strong>
        <p>
          <code>{text(value.$ref)}</code>
        </p>
        <p>
          This definition points to another component. Use Advanced JSON to
          change the reference or add supported fields.
        </p>
      </div>
    );
  return (
    <div className="component-fields">
      {category !== 'callbacks' && category !== 'securitySchemes' && (
        <TextField
          label={
            category === 'responses'
              ? 'Response description'
              : 'Description (optional)'
          }
          hint={
            category === 'responses'
              ? 'Required. Explain what this response means.'
              : undefined
          }
          value={value.description}
          multiline
          onChange={(description) => patch({ description })}
        />
      )}
      {category === 'securitySchemes' && (
        <>
          <Choice
            label="Authentication type"
            value={value.type}
            choices={['http', 'apiKey', 'oauth2', 'openIdConnect']}
            onChange={(type) => patch({ type })}
          />
          {value.type === 'http' && (
            <>
              <Choice
                label="HTTP scheme"
                value={value.scheme}
                choices={['basic', 'bearer', 'digest']}
                onChange={(scheme) => patch({ scheme })}
              />
              {value.scheme === 'bearer' && (
                <TextField
                  label="Bearer format (optional)"
                  value={value.bearerFormat}
                  onChange={(bearerFormat) => patch({ bearerFormat })}
                />
              )}
            </>
          )}
          {value.type === 'apiKey' && (
            <>
              <TextField
                label="API key name"
                value={value.name}
                onChange={(name) => patch({ name })}
                hint="The header, query, or cookie name. Do not enter the secret key."
              />
              <Choice
                label="API key location"
                value={value.in}
                choices={['header', 'query', 'cookie']}
                onChange={(location) => patch({ in: location })}
              />
            </>
          )}
          {value.type === 'openIdConnect' && (
            <TextField
              label="OpenID discovery URL"
              value={value.openIdConnectUrl}
              onChange={(openIdConnectUrl) => patch({ openIdConnectUrl })}
            />
          )}
          {value.type === 'oauth2' && (
            <OAuthFields value={value} patch={patch} />
          )}
          <TextField
            label="Description (optional)"
            value={value.description}
            multiline
            onChange={(description) => patch({ description })}
          />
        </>
      )}
      {category === 'schemas' && (
        <>
          <SchemaChoice
            label="Model type"
            schema={value}
            schemas={schemas}
            onChange={(next) => patch(next)}
          />
          {value.type === 'array' && (
            <SchemaChoice
              label="Array item type"
              schema={value.items}
              schemas={schemas}
              onChange={(items) => patch({ items })}
            />
          )}
          {value.type === 'object' && (
            <SchemaExampleMerge value={value} patch={patch} />
          )}
          <SchemaDetails value={value} schemas={schemas} patch={patch} />
          {(value.type === 'object' || isObject(value.properties)) && (
            <Properties value={value} patch={patch} schemas={schemas} />
          )}
        </>
      )}
      {category === 'parameters' && (
        <>
          <TextField
            label="Parameter name"
            value={value.name}
            onChange={(name) => patch({ name })}
          />
          <Choice
            label="Parameter location"
            value={value.in}
            choices={['query', 'path', 'header', 'cookie']}
            onChange={(location) =>
              patch({
                in: location,
                ...(location === 'path' ? { required: true } : {}),
              })
            }
          />
          <Flag
            label="Required parameter"
            checked={value.required === true}
            disabled={value.in === 'path' && value.required === true}
            invalid={invalidPathParameter}
            describedBy={value.in === 'path' ? requiredHintId : undefined}
            onChange={(required) => patch({ required })}
          />
          {value.in === 'path' && (
            <p
              id={requiredHintId}
              className={
                invalidPathParameter ? 'error-text small' : 'muted small'
              }
            >
              {invalidPathParameter
                ? 'This path parameter must be required. Select Required parameter to fix the definition.'
                : 'Path parameters are always required.'}
            </p>
          )}
        </>
      )}
      {['parameters', 'headers'].includes(category) && (
        <SchemaChoice
          schema={value.schema}
          schemas={schemas}
          onChange={(schema) => patch({ schema })}
        />
      )}
      {category === 'requestBodies' && (
        <Flag
          label="Required request body"
          checked={value.required === true}
          onChange={(required) => patch({ required })}
        />
      )}
      {['responses', 'requestBodies'].includes(category) && (
        <ContentFields value={value} patch={patch} schemas={schemas} />
      )}
      {category === 'examples' && (
        <>
          <TextField
            label="Example summary"
            value={value.summary}
            onChange={(summary) => patch({ summary })}
          />
          {value.externalValue !== undefined ? (
            <TextField
              label="External example URL"
              value={value.externalValue}
              onChange={(externalValue) => patch({ externalValue })}
            />
          ) : (
            <div>
              <h3>Example value</h3>
              <pre className="component-preview">
                {JSON.stringify(value.value, null, 2)}
              </pre>
              <p className="muted small">
                Use Advanced JSON to edit the sample value.
              </p>
            </div>
          )}
        </>
      )}
      {category === 'links' && (
        <TextField
          label={
            value.operationRef !== undefined
              ? 'Target operation reference'
              : 'Target operation ID'
          }
          value={value.operationRef ?? value.operationId}
          onChange={(target) =>
            patch(
              value.operationRef !== undefined
                ? { operationRef: target }
                : { operationId: target },
            )
          }
        />
      )}
      {category === 'callbacks' && (
        <div>
          <h3>Callback expressions</h3>
          {Object.entries(value)
            .filter(([key]) => !key.startsWith('x-'))
            .map(([expression, path]) => (
              <div className="callback-summary" key={expression}>
                <code>{expression}</code>
                <p className="muted">
                  {isObject(path)
                    ? Object.keys(path)
                        .filter((key) =>
                          [
                            'get',
                            'post',
                            'put',
                            'patch',
                            'delete',
                            'options',
                            'head',
                            'trace',
                          ].includes(key),
                        )
                        .map((key) => key.toUpperCase())
                        .join(', ')
                    : 'Path item'}
                </p>
              </div>
            ))}
          <p className="muted">
            Edit callback expressions, outgoing operations, and payloads using
            Advanced JSON.
          </p>
        </div>
      )}
    </div>
  );
}
