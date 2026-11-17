import { isObject, text, type ApiDocument, type JsonObject } from './document';
export const asyncProtocols = [
  'kafka',
  'kafka-secure',
  'amqp',
  'amqps',
  'mqtt',
  'mqtts',
  'ws',
  'wss',
  'http',
  'https',
  'stomp',
  'stomps',
  'jms',
  'redis',
  'nats',
];
export const pointer = (name: string) =>
  encodeURIComponent(name.replace(/~/g, '~0').replace(/\//g, '~1'));
export const asyncV3 = (doc: ApiDocument) =>
  doc.asyncapi?.startsWith('3.') === true;
export function addChannel(doc: ApiDocument, name: string): ApiDocument {
  if (!name.trim() || /\s/.test(name))
    throw new Error(
      'Enter a channel name without spaces, such as orders.created.',
    );
  if (Object.hasOwn(doc.channels ?? {}, name))
    throw new Error(`Channel ${name} already exists.`);
  return {
    ...doc,
    channels: {
      ...doc.channels,
      [name]: asyncV3(doc) ? { address: name, messages: {} } : {},
    },
  };
}
export function addAsyncOperation(
  doc: ApiDocument,
  name: string,
  action: string,
): ApiDocument {
  const channel = doc.channels?.[name];
  if (!channel || channel.$ref)
    throw new Error('Choose an inline channel before adding an operation.');
  if (!asyncV3(doc)) {
    if (!['publish', 'subscribe'].includes(action))
      throw new Error('Choose publish or subscribe for AsyncAPI 2.x.');
    if (channel[action])
      throw new Error(`This channel already has a ${action} operation.`);
    return {
      ...doc,
      channels: {
        ...doc.channels,
        [name]: {
          ...channel,
          [action]: {
            message: { payload: { type: 'object', properties: {} } },
          },
        },
      },
    };
  }
  if (!['send', 'receive'].includes(action))
    throw new Error('Choose send or receive for AsyncAPI 3.x.');
  const base = `${action}${name.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  let key = base;
  let n = 2;
  while (Object.hasOwn(doc.operations ?? {}, key)) key = `${base}${n++}`;
  return {
    ...doc,
    operations: {
      ...doc.operations,
      [key]: { action, channel: { $ref: `#/channels/${pointer(name)}` } },
    },
  };
}
export function channelOperations(
  doc: ApiDocument,
  name: string,
): [string, JsonObject][] {
  if (!asyncV3(doc))
    return ['publish', 'subscribe'].flatMap((key) =>
      isObject(doc.channels?.[name]?.[key])
        ? [[key, doc.channels![name][key]] as [string, JsonObject]]
        : [],
    );
  return Object.entries(doc.operations ?? {}).filter(
    ([, op]) =>
      isObject(op.channel) && op.channel.$ref === `#/channels/${pointer(name)}`,
  );
}
export function patchAsyncOperation(
  doc: ApiDocument,
  channel: string,
  key: string,
  value: JsonObject | null,
): ApiDocument {
  if (asyncV3(doc)) {
    const operations = { ...doc.operations };
    if (value) operations[key] = value;
    else delete operations[key];
    return { ...doc, operations };
  }
  const item = { ...doc.channels?.[channel] };
  if (value) item[key] = value;
  else delete item[key];
  return { ...doc, channels: { ...doc.channels, [channel]: item } };
}
export function removeChannel(doc: ApiDocument, name: string): ApiDocument {
  if (channelOperations(doc, name).length)
    throw new Error(
      'Remove this channel’s operations first. Undo is available.',
    );
  const reference = `#/channels/${pointer(name)}`;
  const channels = { ...doc.channels };
  delete channels[name];
  if (JSON.stringify({ ...doc, channels }).includes(JSON.stringify(reference)))
    throw new Error(
      'This channel is referenced elsewhere. Remove its references first.',
    );
  return { ...doc, channels };
}
export function checkAsync(
  doc: ApiDocument,
): { location: string; message: string }[] {
  const issues: { location: string; message: string }[] = [];
  const add = (location: string, message: string) =>
    issues.push({ location, message });
  for (const [name, channel] of Object.entries(doc.channels ?? {})) {
    for (const [key, operation] of channelOperations(doc, name)) {
      if (!asyncV3(doc) && !isObject(operation.message))
        add(`${name}.${key}`, 'Define a message for this operation.');
      if (asyncV3(doc) && !['send', 'receive'].includes(text(operation.action)))
        add(`operations.${key}`, 'Choose send or receive.');
    }
    if (
      asyncV3(doc) &&
      channel.address !== undefined &&
      channel.address !== null &&
      typeof channel.address !== 'string'
    )
      add(`channels.${name}`, 'Channel address must be text or null.');
  }
  const servers = isObject(doc.servers) ? doc.servers : {};
  for (const [name, server] of Object.entries(servers))
    if (isObject(server) && !server.$ref) {
      if (!text(server.protocol))
        add(`servers.${name}`, 'Choose a server protocol.');
      if (!text(server[asyncV3(doc) ? 'host' : 'url']))
        add(
          `servers.${name}`,
          `Enter a server ${asyncV3(doc) ? 'host' : 'URL'}.`,
        );
    }
  return issues;
}
