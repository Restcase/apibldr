import BindingFields from './BindingFields';
import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import {
  isObject,
  text,
  type ApiDocument,
  type JsonObject,
} from '../domain/document';
import {
  addChannel,
  addAsyncOperation,
  asyncV3,
  channelOperations,
  patchAsyncOperation,
  removeChannel,
} from '../domain/asyncapi';
import { getComponents, componentRef } from '../domain/components';
import { TextField, Choice } from './ComponentFields';
import AsyncFields from './AsyncFields';
import JsonField from './JsonField';
export default function AsyncChannels({
  document,
  onChange,
  selectedChannel,
  onSelectChannel,
}: {
  document: ApiDocument;
  selectedChannel?: string;
  onSelectChannel?: (name: string) => void;
  onChange: (doc: ApiDocument, message?: string) => void;
}) {
  const [localSelected, setLocalSelected] = useState('');
  const selected = selectedChannel ?? localSelected;
  const setSelected = (name: string) => {
    setLocalSelected(name);
    onSelectChannel?.(name);
  };
  const [name, setName] = useState('');
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const channels = document.channels ?? {};
  const active = Object.hasOwn(channels, selected)
    ? selected
    : Object.keys(channels)[0];
  const channel = channels[active];
  const v3 = asyncV3(document);
  const messages = getComponents(document, 'messages');
  const save = (doc: ApiDocument, notice = '') => {
    onChange(doc, notice);
    setError('');
  };
  const patch = (fields: JsonObject) =>
    save({
      ...document,
      channels: { ...channels, [active]: { ...channel, ...fields } },
    });
  const attempt = (work: () => void) => {
    try {
      work();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Could not update this channel.',
      );
    }
  };
  return (
    <div className="component-workspace">
      <div className="editor-intro">
        <h2 className="content-title">Channels</h2>
        <p className="lede">
          Describe where messages flow and the operations your application
          supports.
        </p>
      </div>
      <form
        className="component-name-form"
        onSubmit={(e) => {
          e.preventDefault();
          attempt(() => {
            save(addChannel(document, name.trim()), 'Channel added.');
            setSelected(name.trim());
            setName('');
          });
        }}
      >
        <label>
          New channel
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="orders.created"
            autoComplete="off"
          />
        </label>
        <button className="primary" type="submit">
          <Plus size={16} /> Add channel
        </button>
      </form>
      {error && (
        <p role="alert" className="error-text">
          {error}
        </p>
      )}
      {!Object.keys(channels).length ? (
        <div className="component-empty">
          <h3>No channels defined</h3>
          <p>
            A channel represents a topic, queue, routing key, or event address.
            Add one above, then define the messages it carries.
          </p>
        </div>
      ) : (
        <>
          <TextField label="Find a channel" value={query} onChange={setQuery} />
          <nav className="component-list" aria-label="Channels">
            {Object.keys(channels)
              .filter((key) => key.toLowerCase().includes(query.toLowerCase()))
              .map((key) => (
                <button
                  key={key}
                  aria-pressed={key === active}
                  onClick={() => setSelected(key)}
                >
                  {key}
                </button>
              ))}
          </nav>
          {Object.keys(channels).every(
            (key) => !key.toLowerCase().includes(query.toLowerCase()),
          ) && (
            <p>
              No matching channels.{' '}
              <button onClick={() => setQuery('')}>Clear search</button>
            </p>
          )}
          <section className="component-main">
            <h3>{active}</h3>
            {channel.$ref ? (
              <TextField
                label="Channel reference"
                value={channel.$ref}
                onChange={($ref) => patch({ $ref })}
              />
            ) : (
              <>
                {v3 && (
                  <TextField
                    label="Channel address"
                    value={channel.address}
                    onChange={(address) => patch({ address })}
                  />
                )}
                <TextField
                  label="Channel description"
                  value={channel.description}
                  multiline
                  onChange={(description) => patch({ description })}
                />
                {v3 && (
                  <>
                    <h3>Channel messages</h3>
                    <Choice
                      label="Add reusable message"
                      value=""
                      choices={Object.keys(messages)}
                      onChange={(key) => {
                        if (key)
                          patch({
                            messages: {
                              ...(isObject(channel.messages)
                                ? channel.messages
                                : {}),
                              [key]: { $ref: componentRef('messages', key) },
                            },
                          });
                      }}
                    />
                    {Object.entries(
                      isObject(channel.messages) ? channel.messages : {},
                    ).map(([key, message]) => (
                      <details className="advanced-details" key={key}>
                        <summary>{key}</summary>
                        <div className="advanced-fields">
                          <AsyncFields
                            category="messages"
                            value={isObject(message) ? message : {}}
                            document={document}
                            patch={(fields) =>
                              patch({
                                messages: {
                                  ...(channel.messages as JsonObject),
                                  [key]: {
                                    ...(isObject(message) ? message : {}),
                                    ...fields,
                                  },
                                },
                              })
                            }
                          />
                          <button
                            onClick={() => {
                              const next = {
                                ...(channel.messages as JsonObject),
                              };
                              delete next[key];
                              patch({ messages: next });
                            }}
                          >
                            Remove message
                          </button>
                        </div>
                      </details>
                    ))}
                    <JsonField
                      label="Channel message definitions"
                      value={channel.messages}
                      onChange={(messages) => patch({ messages })}
                    />
                  </>
                )}
                <section className="component-subsection">
                  <h3>Operations</h3>
                  <p className="muted">
                    {v3
                      ? 'Send and receive describe what this application does. Operations reference this channel.'
                      : 'Publish means this application receives messages published to the channel. Subscribe means this application sends messages to subscribers (AsyncAPI 2.x terminology).'}
                  </p>
                  <div className="quick-add-options">
                    {(v3 ? ['send', 'receive'] : ['publish', 'subscribe']).map(
                      (action) => (
                        <button
                          key={action}
                          disabled={!v3 && !!channel[action]}
                          onClick={() =>
                            attempt(() =>
                              save(
                                addAsyncOperation(document, active, action),
                                'Operation added.',
                              ),
                            )
                          }
                        >
                          Add {action}
                        </button>
                      ),
                    )}
                  </div>
                  {channelOperations(document, active).map(
                    ([key, operation]) => {
                      const update = (fields: JsonObject) =>
                        save(
                          patchAsyncOperation(document, active, key, {
                            ...operation,
                            ...fields,
                          }),
                        );
                      const message = isObject(operation.message)
                        ? operation.message
                        : {};
                      return (
                        <details className="advanced-details" key={key} open>
                          <summary>{key}</summary>
                          <div className="advanced-fields">
                            <TextField
                              label={`${key} summary`}
                              value={operation.summary}
                              onChange={(summary) => update({ summary })}
                            />
                            <TextField
                              label={`${key} description`}
                              value={operation.description}
                              multiline
                              onChange={(description) =>
                                update({ description })
                              }
                            />
                            {!v3 && (
                              <TextField
                                label={`${key} operation ID`}
                                value={operation.operationId}
                                onChange={(operationId) =>
                                  update({ operationId })
                                }
                              />
                            )}
                            {!v3 ? (
                              <>
                                <Choice
                                  label={`${key} message`}
                                  value={text(message.$ref) || 'Inline message'}
                                  choices={[
                                    'Inline message',
                                    ...Object.keys(messages).map((name) =>
                                      componentRef('messages', name),
                                    ),
                                  ]}
                                  onChange={(ref) => {
                                    if (ref)
                                      update({
                                        message:
                                          ref === 'Inline message'
                                            ? {
                                                payload: {
                                                  type: 'object',
                                                  properties: {},
                                                },
                                              }
                                            : { $ref: ref },
                                      });
                                  }}
                                />
                                {!message.$ref && (
                                  <AsyncFields
                                    category="messages"
                                    value={message}
                                    document={document}
                                    patch={(fields) =>
                                      update({
                                        message: { ...message, ...fields },
                                      })
                                    }
                                  />
                                )}
                                <JsonField
                                  label={`${key} message alternatives`}
                                  value={operation.message}
                                  onChange={(message) => update({ message })}
                                  hint="Use oneOf to describe alternative messages."
                                />
                              </>
                            ) : (
                              <JsonField
                                label={`${key} message references`}
                                kind="array"
                                value={operation.messages}
                                onChange={(messages) => update({ messages })}
                                hint="Reference messages under this channel, for example #/channels/orders/messages/OrderCreated."
                              />
                            )}
                            <JsonField
                              label={`${key} traits`}
                              kind="array"
                              value={operation.traits}
                              onChange={(traits) => update({ traits })}
                            />
                            <details className="advanced-details">
                              <summary>{`${key} bindings`}</summary>
                              <BindingFields
                                scope="operation"
                                value={
                                  isObject(operation.bindings)
                                    ? operation.bindings
                                    : {}
                                }
                                onChange={(bindings) => update({ bindings })}
                              />
                            </details>
                            <JsonField
                              label={`${key} advanced fields`}
                              value={operation}
                              onChange={(value) =>
                                save(
                                  patchAsyncOperation(
                                    document,
                                    active,
                                    key,
                                    value as JsonObject,
                                  ),
                                )
                              }
                            />
                            <button
                              className="danger-text"
                              onClick={() =>
                                save(
                                  patchAsyncOperation(
                                    document,
                                    active,
                                    key,
                                    null,
                                  ),
                                  'Operation removed. Undo restores it.',
                                )
                              }
                            >
                              <Trash2 size={15} /> Remove operation
                            </button>
                          </div>
                        </details>
                      );
                    },
                  )}
                </section>
                <JsonField
                  label="Channel parameters"
                  value={channel.parameters}
                  onChange={(parameters) => patch({ parameters })}
                />
                <details className="advanced-details">
                  <summary>{'Channel bindings'}</summary>
                  <BindingFields
                    scope="channel"
                    value={isObject(channel.bindings) ? channel.bindings : {}}
                    onChange={(bindings) => patch({ bindings })}
                  />
                </details>
                <JsonField
                  label="Channel servers"
                  kind="array"
                  value={channel.servers}
                  onChange={(servers) => patch({ servers })}
                />
              </>
            )}
            <JsonField
              label="Complete channel definition"
              value={channel}
              onChange={(value) =>
                save({
                  ...document,
                  channels: { ...channels, [active]: value as JsonObject },
                })
              }
            />
            <button
              className="danger-text"
              onClick={() =>
                attempt(() =>
                  save(
                    removeChannel(document, active),
                    'Channel removed. Undo restores it.',
                  ),
                )
              }
            >
              <Trash2 size={15} /> Remove channel
            </button>
          </section>
        </>
      )}
    </div>
  );
}
