import BindingFields from './BindingFields';
import { useState } from 'react';
import {
  isObject,
  isAsync,
  text,
  type ApiDocument,
  type JsonObject,
} from '../domain/document';
import { asyncProtocols, asyncV3 } from '../domain/asyncapi';
import { getComponents, rewriteReferences } from '../domain/components';
import { TextField, Choice } from './ComponentFields';
import JsonField from './JsonField';
export type GeneralSection =
  'details' | 'documentation' | 'servers' | 'tags' | 'security';
export function SecurityRequirements({
  value,
  document,
  onChange,
}: {
  value: unknown;
  document: ApiDocument;
  onChange: (value: unknown) => void;
}) {
  const schemes = getComponents(document, 'securitySchemes');
  const requirements = Array.isArray(value) ? value : [];
  const [scheme, setScheme] = useState('');
  const [scopes, setScopes] = useState('');
  return (
    <section className="component-subsection">
      <h3>Security requirements</h3>
      <p className="muted">
        Each row is an alternative (OR). Schemes in one row must all be
        satisfied (AND). An empty object permits anonymous access. Defining a
        scheme alone does not apply it.
      </p>
      {requirements.length ? (
        requirements.map((req, index) => (
          <div className="response-row" key={index}>
            <code className="grow">{JSON.stringify(req)}</code>
            <button
              onClick={() =>
                onChange(requirements.filter((_, i) => i !== index))
              }
            >
              Remove requirement {index + 1}
            </button>
          </div>
        ))
      ) : (
        <p className="muted">No security requirements at this level.</p>
      )}
      {!Object.keys(schemes).length ? (
        <p>Create an authentication scheme in Components first.</p>
      ) : (
        <div className="advanced-fields">
          <Choice
            label="Security scheme"
            value={scheme}
            choices={Object.keys(schemes)}
            onChange={setScheme}
          />
          {!asyncV3(document) && (
            <>
              {' '}
              <TextField
                label="OAuth scopes"
                value={scopes}
                onChange={setScopes}
                hint="Comma-separated scopes, only for OAuth2 or OpenID Connect."
              />
            </>
          )}
          <button
            disabled={!scheme}
            onClick={() => {
              onChange([
                ...requirements,
                ...(asyncV3(document)
                  ? [{ $ref: `#/components/securitySchemes/${scheme}` }]
                  : [
                      {
                        [scheme]: ['oauth2', 'openIdConnect'].includes(
                          String((schemes[scheme] as JsonObject)?.type),
                        )
                          ? scopes
                              .split(',')
                              .map((v) => v.trim())
                              .filter(Boolean)
                          : [],
                      },
                    ]),
              ]);
              setScopes('');
            }}
          >
            Add security requirement
          </button>
        </div>
      )}
      <JsonField
        label="Combined security requirements"
        value={requirements}
        kind="array"
        onChange={onChange}
      />
    </section>
  );
}
export default function GeneralSettings({
  section,
  onNavigate,
  document,
  onChange,
}: {
  section: GeneralSection;
  onNavigate?: (section: GeneralSection) => void;
  document: ApiDocument;
  onChange: (doc: ApiDocument, message?: string) => void;
}) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const patch = (fields: JsonObject) => onChange({ ...document, ...fields });
  const info = (fields: JsonObject) =>
    patch({ info: { ...document.info, ...fields } });
  const async = isAsync(document);
  if (section === 'documentation') {
    const contact = isObject(document.info.contact)
      ? document.info.contact
      : {};
    const license = isObject(document.info.license)
      ? document.info.license
      : {};
    const docs = asyncV3(document)
      ? document.info.externalDocs
      : document.externalDocs;
    const external = isObject(docs) ? docs : {};
    const setDocs = (fields: JsonObject) =>
      asyncV3(document)
        ? info({ externalDocs: { ...external, ...fields } })
        : patch({ externalDocs: { ...external, ...fields } });
    return (
      <div className="form-section">
        <h2 className="content-title">API documentation</h2>
        <p className="lede">
          Help people find the owner, license, and supporting documentation.
        </p>
        <section className="component-subsection">
          <h3>Contact</h3>
          {['name', 'email', 'url'].map((key) => (
            <TextField
              key={key}
              label={`Contact ${key}`}
              value={contact[key]}
              onChange={(v) => info({ contact: { ...contact, [key]: v } })}
            />
          ))}
        </section>
        <section className="component-subsection">
          <h3>License</h3>
          <div className="quick-add-options">
            {[
              ['MIT', 'https://opensource.org/license/mit'],
              ['Apache 2.0', 'https://www.apache.org/licenses/LICENSE-2.0'],
              ['BSD 3-Clause', 'https://opensource.org/license/bsd-3-clause'],
            ].map(([name, url]) => (
              <button
                key={name}
                onClick={() => info({ license: { ...license, name, url } })}
              >
                {name}
              </button>
            ))}
          </div>
          <TextField
            label="License name"
            value={license.name}
            onChange={(name) => info({ license: { ...license, name } })}
          />
          <TextField
            label="License URL"
            value={license.url}
            onChange={(url) => info({ license: { ...license, url } })}
          />
        </section>
        <section className="component-subsection">
          <h3>External documentation</h3>
          <TextField
            label="Documentation URL"
            value={external.url}
            onChange={(url) => setDocs({ url })}
          />
          <TextField
            label="Documentation description"
            multiline
            value={external.description}
            onChange={(description) => setDocs({ description })}
          />
        </section>
      </div>
    );
  }
  if (section === 'security')
    return (
      <div className="form-section">
        <h2 className="content-title">API security</h2>
        {async ? (
          <p>
            AsyncAPI applies security requirements to servers. Open Servers to
            configure authentication for a broker.
            <button onClick={() => onNavigate?.('servers')}>
              Configure server security
            </button>
          </p>
        ) : (
          <SecurityRequirements
            value={document.security}
            document={document}
            onChange={(security) => patch({ security })}
          />
        )}
      </div>
    );
  if (section === 'tags') {
    const rawTags = asyncV3(document) ? document.info.tags : document.tags;
    const tags = Array.isArray(rawTags) ? rawTags : [];
    const saveTags = (tags: unknown[]) =>
      asyncV3(document) ? info({ tags }) : patch({ tags });
    return (
      <div className="form-section">
        <h2 className="content-title">Tags</h2>
        <p className="lede">
          Group related operations and add links to their documentation.
        </p>
        <form
          className="component-name-form"
          onSubmit={(e) => {
            e.preventDefault();
            const n = name.trim();
            if (!n) return;
            if (tags.some((tag) => isObject(tag) && tag.name === n)) {
              setError('A tag with this name already exists.');
              return;
            }
            saveTags([...tags, { name: n }]);
            setName('');
            setError('');
          }}
        >
          <label>
            Tag name
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <button className="primary">Add tag</button>
        </form>
        {error && (
          <p role="alert" className="error-text">
            {error}
          </p>
        )}
        {!tags.length && (
          <p>No tags defined. Add a tag to organize your API.</p>
        )}
        {tags.map(
          (tag, i) =>
            isObject(tag) && (
              <details className="advanced-details" key={i} open>
                <summary>{text(tag.name)}</summary>
                <div className="advanced-fields">
                  <TextField
                    label={`${text(tag.name)} description`}
                    multiline
                    value={tag.description}
                    onChange={(description) =>
                      saveTags(
                        tags.map((t, j) =>
                          j === i ? { ...tag, description } : t,
                        ),
                      )
                    }
                  />
                  <JsonField
                    label={`${text(tag.name)} documentation`}
                    value={tag.externalDocs}
                    onChange={(externalDocs) =>
                      saveTags(
                        tags.map((t, j) =>
                          j === i ? { ...tag, externalDocs } : t,
                        ),
                      )
                    }
                  />
                  <button
                    onClick={() => saveTags(tags.filter((_, j) => i !== j))}
                  >
                    Remove tag
                  </button>
                </div>
              </details>
            ),
        )}
      </div>
    );
  }
  const servers: [string, unknown][] = async
    ? Object.entries(isObject(document.servers) ? document.servers : {})
    : (Array.isArray(document.servers) ? document.servers : []).map((s, i) => [
        String(i),
        s,
      ]);
  const setServer = (key: string, value: unknown) =>
    patch({
      servers: async
        ? { ...(document.servers as JsonObject), [key]: value }
        : servers.map(([k, s]) => (k === key ? value : s)),
    });
  return (
    <div className="form-section">
      <h2 className="content-title">Servers</h2>
      <p className="lede">
        {async
          ? 'Configure the brokers and protocols your application uses.'
          : 'List the base URLs where this API is available.'}
      </p>
      <form
        className="component-name-form"
        onSubmit={(e) => {
          e.preventDefault();
          const key = name.trim();
          if (
            async &&
            (!/^[a-zA-Z0-9._-]+$/.test(key) || servers.some(([k]) => k === key))
          ) {
            setError(
              'Enter a unique server key using letters, digits, dots, underscores or hyphens.',
            );
            return;
          }
          const server = async
            ? {
                [asyncV3(document) ? 'host' : 'url']: 'localhost:9092',
                protocol: 'kafka',
              }
            : { url: 'https://api.example.com' };
          patch({
            servers: async
              ? {
                  ...(isObject(document.servers) ? document.servers : {}),
                  [key]: server,
                }
              : [...servers.map(([, s]) => s), server],
          });
          setName('');
          setError('');
        }}
      >
        {async && (
          <label>
            Server key
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="production"
            />
          </label>
        )}
        <button className="primary">Add server</button>
      </form>
      {error && (
        <p role="alert" className="error-text">
          {error}
        </p>
      )}
      {!servers.length && (
        <p>No servers defined. Add the address clients should connect to.</p>
      )}
      {servers.map(([key, raw]) => {
        const value = isObject(raw) ? raw : {};
        const update = (fields: JsonObject) =>
          setServer(key, { ...value, ...fields });
        const field = async && asyncV3(document) ? 'host' : 'url';
        return (
          <details className="advanced-details" key={key} open>
            <summary>{async ? key : text(value.url) || 'Server'}</summary>
            <div className="advanced-fields">
              {value.$ref ? (
                <TextField
                  label="Server reference"
                  value={value.$ref}
                  onChange={($ref) => update({ $ref })}
                />
              ) : (
                <>
                  <TextField
                    label={field === 'host' ? 'Server host' : 'Server URL'}
                    value={value[field]}
                    onChange={(v) => update({ [field]: v })}
                  />
                  {async && (
                    <>
                      <Choice
                        label="Protocol"
                        value={value.protocol}
                        choices={asyncProtocols}
                        onChange={(protocol) => update({ protocol })}
                      />
                      <TextField
                        label="Protocol version"
                        value={value.protocolVersion}
                        onChange={(protocolVersion) =>
                          update({ protocolVersion })
                        }
                      />
                      {asyncV3(document) && (
                        <TextField
                          label="Pathname"
                          value={value.pathname}
                          onChange={(pathname) => update({ pathname })}
                        />
                      )}
                    </>
                  )}
                  <TextField
                    label="Server description"
                    value={value.description}
                    multiline
                    onChange={(description) => update({ description })}
                  />
                  <JsonField
                    label="Server variables"
                    value={value.variables}
                    onChange={(variables) => update({ variables })}
                    hint={
                      'Use {variable} placeholders in the address. Define each variable’s default, description and optional enum.'
                    }
                  />
                  {async && (
                    <>
                      <SecurityRequirements
                        document={document}
                        value={value.security}
                        onChange={(security) => update({ security })}
                      />
                      <details className="advanced-details">
                        <summary>{'Server bindings'}</summary>
                        <BindingFields
                          scope="server"
                          value={isObject(value.bindings) ? value.bindings : {}}
                          onChange={(bindings) => update({ bindings })}
                        />
                      </details>
                    </>
                  )}
                </>
              )}
              <JsonField
                label="Complete server definition"
                value={value}
                onChange={(v) => setServer(key, v)}
              />
              <button
                onClick={() => {
                  if (async) {
                    const ref = `#/servers/${encodeURIComponent(key.replace(/~/g, '~0').replace(/\//g, '~1'))}`;
                    const hasRef =
                      JSON.stringify(
                        rewriteReferences(document, ref, '#removed-server'),
                      ) !== JSON.stringify(document);
                    const named = Object.values(document.channels ?? {}).some(
                      (channel) =>
                        Array.isArray(channel.servers) &&
                        channel.servers.includes(key),
                    );
                    if (hasRef || named) {
                      setError(
                        'This server is used by a channel. Remove its references before deleting it.',
                      );
                      return;
                    }
                    const next = { ...(document.servers as JsonObject) };
                    delete next[key];
                    onChange(
                      { ...document, servers: next },
                      'Server removed. Undo restores it.',
                    );
                  } else
                    onChange(
                      {
                        ...document,
                        servers: servers
                          .filter(([k]) => k !== key)
                          .map(([, v]) => v),
                      },
                      'Server removed. Undo restores it.',
                    );
                }}
              >
                Remove server
              </button>
            </div>
          </details>
        );
      })}
    </div>
  );
}
