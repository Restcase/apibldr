import {
  isObject,
  methods,
  specLabel,
  text,
  type ApiDocument,
  type Method,
} from './document';
import { componentCatalog, type ComponentCategory } from './components';

export type GraphTarget =
  | { kind: 'info' }
  | { kind: 'path'; path: string }
  | { kind: 'operation'; path: string; method: Method }
  | { kind: 'channel'; name: string }
  | { kind: 'component'; category: ComponentCategory; name: string }
  | { kind: 'source' };

export type GraphNode = {
  id: string;
  label: string;
  kind: string;
  summary: string;
  value: unknown;
  target: GraphTarget;
  tokens: string[];
};

export const graphPointer = (tokens: string[]) =>
  tokens.length
    ? '#/' +
      tokens
        .map((token) =>
          encodeURIComponent(token.replace(/~/g, '~0').replace(/\//g, '~1')),
        )
        .join('/')
    : '#';

export function referenceTokens(reference: string): string[] | null {
  try {
    const decoded = decodeURIComponent(reference);
    if (decoded === '#') return [];
    if (!decoded.startsWith('#/')) return null;
    const tokens = decoded.slice(2).split('/');
    if (tokens.some((token) => /~(?:[^01]|$)/.test(token))) return null;
    return tokens.map((token) => token.replace(/~1/g, '/').replace(/~0/g, '~'));
  } catch {
    return null;
  }
}

function lookup(document: ApiDocument, tokens: string[]): unknown {
  let value: unknown = document;
  for (const token of tokens) {
    if (
      (!isObject(value) && !Array.isArray(value)) ||
      !Object.hasOwn(value, token)
    )
      return undefined;
    value = (value as Record<string, unknown>)[token];
  }
  return value;
}

const titles: Record<string, string> = {
  components: 'Components',
  schemas: 'Schemas',
  properties: 'Properties',
  parameters: 'Parameters',
  responses: 'Responses',
  requestBody: 'Request body',
  messages: 'Messages',
  message: 'Message',
  payload: 'Payload',
  content: 'Content',
  schema: 'Schema',
  items: 'Array items',
  headers: 'Headers',
  operations: 'Operations',
  servers: 'Servers',
  security: 'Security',
  reply: 'Reply',
  bindings: 'Bindings',
  oneOf: 'One of',
  allOf: 'All of',
  anyOf: 'Any of',
  additionalProperties: 'Additional properties',
};

export function graphNode(
  document: ApiDocument,
  id = '#',
): GraphNode | undefined {
  const tokens = referenceTokens(id);
  if (!tokens) return undefined;
  const value = lookup(document, tokens);
  if (value === undefined) return undefined;
  const object = isObject(value) ? value : {};
  const last = tokens.at(-1) ?? '';
  let label = titles[last] ?? last;
  let kind = Array.isArray(value) ? 'Collection' : 'Definition';
  let target: GraphTarget = { kind: 'source' };
  if (!tokens.length) {
    label = document.info.title || 'Untitled API';
    kind = 'API';
    target = { kind: 'info' };
  } else if (tokens[0] === 'paths' && tokens.length >= 2) {
    target = { kind: 'path', path: tokens[1] };
    if (tokens.length === 2) {
      label = tokens[1];
      kind = 'Path';
    }
    if (tokens.length >= 3 && methods.includes(tokens[2] as Method)) {
      target = {
        kind: 'operation',
        path: tokens[1],
        method: tokens[2] as Method,
      };
      if (tokens.length === 3) {
        label = `${tokens[2].toUpperCase()} ${tokens[1]}`;
        kind = 'Operation';
      }
    }
  } else if (tokens[0] === 'channels' && tokens.length >= 2) {
    target = { kind: 'channel', name: tokens[1] };
    if (tokens.length === 2) {
      label = tokens[1];
      kind = 'Channel';
    }
    if (tokens.length === 3 && ['publish', 'subscribe'].includes(last)) {
      label = `${last.toUpperCase()} ${tokens[1]}`;
      kind = 'Operation';
    }
  } else if (tokens[0] === 'operations' && tokens.length >= 2) {
    if (tokens.length === 2) {
      label = `${text(object.action).toUpperCase() || 'OPERATION'} ${last}`;
      kind = 'Operation';
    }
    const operation = lookup(document, tokens.slice(0, 2));
    const channel =
      isObject(operation) && isObject(operation.channel)
        ? referenceTokens(text(operation.channel.$ref))
        : null;
    if (
      channel?.length === 2 &&
      channel[0] === 'channels' &&
      lookup(document, channel) !== undefined
    )
      target = { kind: 'channel', name: channel[1] };
  }
  if (
    tokens[0] === 'components' &&
    tokens.length >= 3 &&
    Object.hasOwn(componentCatalog, tokens[1])
  ) {
    target = {
      kind: 'component',
      category: tokens[1] as ComponentCategory,
      name: tokens[2],
    };
    if (tokens.length === 3) {
      label = tokens[2];
      kind =
        tokens[1] === 'schemas'
          ? 'Schema'
          : tokens[1] === 'messages'
            ? 'Message'
            : 'Component';
    }
  }
  if (tokens.length === 2 && tokens[0] === 'components')
    label = componentCatalog[last as ComponentCategory]?.title ?? last;
  if (tokens.at(-2) === 'properties') {
    label = last;
    kind = 'Property';
  }
  if (tokens.at(-2) === 'responses') {
    label = `Response ${last}`;
    kind = 'Response';
  }
  if (Array.isArray(lookup(document, tokens.slice(0, -1))))
    label = text(object.name) || `Item ${Number(last) + 1}`;
  if (object.$ref) kind = 'Reference';
  const summary = !tokens.length
    ? specLabel(document)
    : text(object.summary) ||
      text(object.operationId) ||
      text(object.address) ||
      text(object.description) ||
      text(object.$ref) ||
      text(object.type) ||
      (typeof value === 'boolean'
        ? value
          ? 'Any value allowed'
          : 'No values allowed'
        : '');
  return {
    id: graphPointer(tokens),
    label,
    kind,
    summary,
    value,
    target,
    tokens,
  };
}

const collections = new Set([
  'components',
  'schemas',
  'properties',
  'parameters',
  'responses',
  'messages',
  'headers',
  'content',
  'operations',
  'servers',
  'securitySchemes',
  'requestBodies',
  'examples',
  'links',
  'callbacks',
  '$defs',
  'definitions',
  'messageTraits',
  'operationTraits',
  'correlationIds',
  'serverBindings',
  'channelBindings',
  'operationBindings',
  'messageBindings',
]);
const childFields = [
  'parameters',
  'requestBody',
  'responses',
  'message',
  'messages',
  'payload',
  'headers',
  'content',
  'schema',
  'properties',
  'items',
  'additionalProperties',
  'oneOf',
  'allOf',
  'anyOf',
  'not',
  '$defs',
  'definitions',
  'reply',
  'security',
  'callbacks',
  'links',
  'bindings',
  'traits',
];

export function graphReference(
  document: ApiDocument,
  node: GraphNode,
): { node?: GraphNode; warning?: string } {
  if (!isObject(node.value) || typeof node.value.$ref !== 'string') return {};
  const reference = node.value.$ref;
  if (!reference.startsWith('#'))
    return {
      warning:
        'External reference. It is preserved but is not fetched by the graph.',
    };
  const resolved = graphNode(document, reference);
  return resolved
    ? { node: resolved }
    : {
        warning:
          'This local reference could not be resolved. Review it in Source.',
      };
}

export function graphChildren(
  document: ApiDocument,
  node: GraphNode,
): GraphNode[] {
  const { tokens, value } = node;
  const result: GraphNode[] = [];
  const add = (path: string[]) => {
    const child = graphNode(document, graphPointer(path));
    if (child) result.push(child);
  };
  const entries = (path: string[]) => {
    const object = lookup(document, path);
    if (isObject(object) || Array.isArray(object))
      for (const key of Object.keys(object))
        if (!key.startsWith('x-')) add([...path, key]);
  };
  if (!tokens.length) {
    entries([document.asyncapi ? 'channels' : 'paths']);
    if (document.servers && Object.keys(document.servers).length)
      add(['servers']);
    if (
      document.asyncapi?.startsWith('3.') &&
      Object.keys(document.operations ?? {}).length
    )
      add(['operations']);
    if (
      isObject(document.components) &&
      Object.keys(document.components).some((key) => !key.startsWith('x-'))
    )
      add(['components']);
  } else {
    const reference = graphReference(document, node);
    if (reference.node) result.push(reference.node);
    if (isObject(value)) {
      if (tokens[0] === 'paths' && tokens.length === 2) {
        for (const method of methods)
          if (isObject(value[method])) add([...tokens, method]);
        if (value.parameters) add([...tokens, 'parameters']);
      } else if (tokens[0] === 'channels' && tokens.length === 2) {
        if (document.asyncapi?.startsWith('3.')) {
          for (const [key, operation] of Object.entries(
            document.operations ?? {},
          )) {
            const ref = isObject(operation.channel)
              ? referenceTokens(text(operation.channel.$ref))
              : null;
            if (ref && graphPointer(ref) === node.id) add(['operations', key]);
          }
        } else
          for (const key of ['publish', 'subscribe'])
            if (value[key]) add([...tokens, key]);
        for (const key of ['messages', 'parameters'])
          if (value[key]) add([...tokens, key]);
      } else if (
        collections.has(tokens.at(-1) ?? '') &&
        !value.$ref &&
        (!collections.has(tokens.at(-2) ?? '') ||
          (tokens.length === 2 && tokens[0] === 'components'))
      ) {
        entries(tokens);
      } else {
        for (const key of childFields)
          if (
            value[key] !== undefined &&
            (isObject(value[key]) ||
              Array.isArray(value[key]) ||
              typeof value[key] === 'boolean')
          )
            add([...tokens, key]);
      }
    } else if (Array.isArray(value)) entries(tokens);
  }
  return [...new Map(result.map((child) => [child.id, child])).values()];
}
