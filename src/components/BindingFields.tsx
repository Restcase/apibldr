import { useState } from 'react';
import { isObject, type JsonObject } from '../domain/document';
import { TextField, Choice, Flag } from './ComponentFields';
import JsonField from './JsonField';
type Field = [
  string,
  string,
  'text' | 'number' | 'boolean' | 'schema' | 'array',
];
const fields: Record<string, Field[]> = {
  'server.mqtt': [
    ['clientId', 'Client ID', 'text'],
    ['cleanSession', 'Clean session', 'boolean'],
    ['keepAlive', 'Keep alive (seconds)', 'number'],
    ['lastWill', 'Last will', 'schema'],
  ],
  'channel.ws': [
    ['method', 'HTTP method', 'text'],
    ['query', 'Query schema', 'schema'],
    ['headers', 'Headers schema', 'schema'],
  ],
  'channel.amqp': [
    ['is', 'Channel type (queue or routingKey)', 'text'],
    ['exchange', 'Exchange', 'schema'],
    ['queue', 'Queue', 'schema'],
  ],
  'operation.http': [
    ['type', 'Operation type (request or response)', 'text'],
    ['method', 'HTTP method', 'text'],
    ['query', 'Query schema', 'schema'],
  ],
  'operation.kafka': [
    ['groupId', 'Consumer group ID schema', 'schema'],
    ['clientId', 'Client ID schema', 'schema'],
  ],
  'operation.amqp': [
    ['expiration', 'Expiration (milliseconds)', 'number'],
    ['userId', 'User ID', 'text'],
    ['cc', 'Routing keys (CC)', 'array'],
    ['priority', 'Priority', 'number'],
    ['deliveryMode', 'Delivery mode (1 or 2)', 'number'],
    ['mandatory', 'Mandatory', 'boolean'],
    ['bcc', 'Routing keys (BCC)', 'array'],
    ['replyTo', 'Reply queue', 'text'],
    ['timestamp', 'Include timestamp', 'boolean'],
    ['ack', 'Require acknowledgment', 'boolean'],
  ],
  'operation.mqtt': [
    ['qos', 'Quality of service (0, 1 or 2)', 'number'],
    ['retain', 'Retain message', 'boolean'],
  ],
  'message.http': [['headers', 'Headers schema', 'schema']],
  'message.kafka': [['key', 'Message key schema', 'schema']],
  'message.amqp': [
    ['contentEncoding', 'Content encoding', 'text'],
    ['messageType', 'Message type', 'text'],
  ],
};
export default function BindingFields({
  scope,
  value,
  onChange,
}: {
  scope: string;
  value: JsonObject;
  onChange: (value: JsonObject) => void;
}) {
  const [protocol, setProtocol] = useState('');
  return (
    <div className="component-fields">
      <Choice
        label="Add protocol binding"
        value={protocol}
        choices={[
          'kafka',
          'amqp',
          'mqtt',
          'ws',
          'http',
          'nats',
          'redis',
          'stomp',
          'jms',
          'pulsar',
          'sqs',
          'sns',
        ]}
        onChange={(v) => {
          setProtocol('');
          if (v && !Object.hasOwn(value, v))
            onChange({
              ...value,
              [v]:
                v === 'amqp' && scope === 'channel'
                  ? { is: 'queue', queue: { name: 'events' } }
                  : {},
            });
        }}
      />
      {Object.entries(value)
        .filter(([key]) => !key.startsWith('x-'))
        .map(([protocol, raw]) => {
          const current = isObject(raw) ? raw : {};
          const update = (key: string, v: unknown) =>
            onChange({ ...value, [protocol]: { ...current, [key]: v } });
          return (
            <details className="advanced-details" key={protocol} open>
              <summary>{protocol.toUpperCase()}</summary>
              <div className="advanced-fields">
                <TextField
                  label={`${protocol} binding version`}
                  value={current.bindingVersion}
                  onChange={(v) => update('bindingVersion', v || undefined)}
                  hint="Optional. Omit to use the protocol’s default binding version."
                />
                {(fields[`${scope}.${protocol}`] ?? []).map(
                  ([key, label, type]) =>
                    type === 'boolean' ? (
                      <Flag
                        key={key}
                        label={label}
                        checked={current[key] === true}
                        onChange={(v) => update(key, v)}
                      />
                    ) : type === 'schema' || type === 'array' ? (
                      <JsonField
                        key={key}
                        label={label}
                        value={current[key]}
                        kind={type === 'array' ? 'array' : 'object'}
                        onChange={(v) => update(key, v)}
                      />
                    ) : type === 'number' ? (
                      <label className="component-field" key={key}>
                        {label}
                        <input
                          type="number"
                          min={0}
                          value={
                            typeof current[key] === 'number'
                              ? String(current[key])
                              : ''
                          }
                          onChange={(e) =>
                            update(
                              key,
                              e.target.value === ''
                                ? undefined
                                : e.target.valueAsNumber,
                            )
                          }
                        />
                      </label>
                    ) : (
                      <TextField
                        key={key}
                        label={label}
                        value={current[key]}
                        onChange={(v) => update(key, v || undefined)}
                      />
                    ),
                )}
                <JsonField
                  label={`Complete ${protocol} binding`}
                  value={current}
                  onChange={(v) => onChange({ ...value, [protocol]: v })}
                />
                <button
                  onClick={() => {
                    const next = { ...value };
                    delete next[protocol];
                    onChange(next);
                  }}
                >
                  Remove {protocol} binding
                </button>
              </div>
            </details>
          );
        })}
    </div>
  );
}
