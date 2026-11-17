import {
  type CompletionContext,
  type CompletionResult,
} from '@codemirror/autocomplete';
import { syntaxTree } from '@codemirror/language';
import { isMap, isScalar, isSeq, parseDocument, type YAMLMap } from 'yaml';
import { methods, type Format } from '../domain/document';
import { responseStatuses } from '../domain/suggestions';

// Small, local OpenAPI vocabulary. Suggestions are editing aids, not validation.
const fields: Record<string, string[]> = {
  root: [
    'openapi',
    'info',
    'servers',
    'paths',
    'components',
    'security',
    'tags',
    'externalDocs',
  ],
  info: [
    'title',
    'version',
    'description',
    'termsOfService',
    'contact',
    'license',
    'x-logo',
  ],
  contact: ['name', 'url', 'email'],
  license: ['name', 'url'],
  logo: ['url', 'altText', 'backgroundColor'],
  server: ['url', 'description', 'variables'],
  variable: ['enum', 'default', 'description'],
  components: [
    'schemas',
    'responses',
    'parameters',
    'examples',
    'requestBodies',
    'headers',
    'securitySchemes',
    'links',
    'callbacks',
  ],
  path: ['$ref', 'summary', 'description', ...methods, 'servers', 'parameters'],
  operation: [
    'tags',
    'summary',
    'description',
    'externalDocs',
    'operationId',
    'parameters',
    'requestBody',
    'responses',
    'callbacks',
    'deprecated',
    'security',
    'servers',
  ],
  parameter: [
    '$ref',
    'name',
    'in',
    'description',
    'required',
    'deprecated',
    'allowEmptyValue',
    'style',
    'explode',
    'allowReserved',
    'schema',
    'example',
    'examples',
    'content',
  ],
  header: [
    '$ref',
    'description',
    'required',
    'deprecated',
    'style',
    'explode',
    'schema',
    'example',
    'examples',
    'content',
  ],
  response: ['$ref', 'description', 'headers', 'content', 'links'],
  requestBody: ['$ref', 'description', 'content', 'required'],
  media: ['schema', 'example', 'examples', 'encoding'],
  schema: [
    '$ref',
    'title',
    'description',
    'type',
    'format',
    'properties',
    'required',
    'items',
    'additionalProperties',
    'enum',
    'default',
    'example',
    'allOf',
    'oneOf',
    'anyOf',
    'not',
    'readOnly',
    'writeOnly',
    'deprecated',
    'minimum',
    'maximum',
    'exclusiveMinimum',
    'exclusiveMaximum',
    'multipleOf',
    'minLength',
    'maxLength',
    'pattern',
    'minItems',
    'maxItems',
    'uniqueItems',
    'minProperties',
    'maxProperties',
    'discriminator',
    'xml',
    'externalDocs',
  ],
  discriminator: ['propertyName', 'mapping'],
  xml: ['name', 'namespace', 'prefix', 'attribute', 'wrapped'],
  securityScheme: [
    '$ref',
    'type',
    'description',
    'name',
    'in',
    'scheme',
    'bearerFormat',
    'flows',
    'openIdConnectUrl',
  ],
  flows: ['implicit', 'password', 'clientCredentials', 'authorizationCode'],
  flow: ['authorizationUrl', 'tokenUrl', 'refreshUrl', 'scopes'],
  tag: ['name', 'description', 'externalDocs'],
  externalDocs: ['description', 'url'],
  example: ['$ref', 'summary', 'description', 'value', 'externalValue'],
  link: [
    '$ref',
    'operationRef',
    'operationId',
    'parameters',
    'requestBody',
    'description',
    'server',
  ],
  encoding: ['contentType', 'headers', 'style', 'explode', 'allowReserved'],
};
const componentKinds: Record<string, string> = {
  schemas: 'schema',
  responses: 'response',
  parameters: 'parameter',
  examples: 'example',
  requestBodies: 'requestBody',
  headers: 'header',
  securitySchemes: 'securityScheme',
  links: 'link',
  callbacks: 'callback',
  pathItems: 'path',
};
const transitions: Record<string, Record<string, string>> = {
  root: {
    info: 'info',
    paths: 'map:path',
    webhooks: 'map:path',
    components: 'components',
    servers: 'list:server',
    tags: 'list:tag',
    security: 'list:security',
    externalDocs: 'externalDocs',
  },
  info: { contact: 'contact', license: 'license', 'x-logo': 'logo' },
  path: {
    ...Object.fromEntries(methods.map((method) => [method, 'operation'])),
    servers: 'list:server',
    parameters: 'list:parameter',
  },
  operation: {
    parameters: 'list:parameter',
    requestBody: 'requestBody',
    responses: 'map:response',
    callbacks: 'map:callback',
    servers: 'list:server',
    security: 'list:security',
    externalDocs: 'externalDocs',
  },
  components: Object.fromEntries(
    Object.entries(componentKinds).map(([key, kind]) => [key, `map:${kind}`]),
  ),
  server: { variables: 'map:variable' },
  response: { content: 'map:media', headers: 'map:header', links: 'map:link' },
  requestBody: { content: 'map:media' },
  media: {
    schema: 'schema',
    examples: 'map:example',
    encoding: 'map:encoding',
  },
  parameter: {
    schema: 'schema',
    examples: 'map:example',
    content: 'map:media',
  },
  header: { schema: 'schema', examples: 'map:example', content: 'map:media' },
  schema: {
    properties: 'map:schema',
    patternProperties: 'map:schema',
    $defs: 'map:schema',
    items: 'schema',
    additionalProperties: 'schema',
    not: 'schema',
    allOf: 'list:schema',
    oneOf: 'list:schema',
    anyOf: 'list:schema',
    prefixItems: 'list:schema',
    contains: 'schema',
    if: 'schema',
    then: 'schema',
    else: 'schema',
    discriminator: 'discriminator',
    xml: 'xml',
    externalDocs: 'externalDocs',
  },
  securityScheme: { flows: 'flows' },
  flows: {
    implicit: 'flow',
    password: 'flow',
    clientCredentials: 'flow',
    authorizationCode: 'flow',
  },
  callback: { '*': 'path' },
  tag: { externalDocs: 'externalDocs' },
  link: { server: 'server' },
  encoding: { headers: 'map:header' },
};
const asyncFields: Record<string, string[]> = {
  asyncRoot: [
    'asyncapi',
    'id',
    'info',
    'servers',
    'defaultContentType',
    'channels',
    'operations',
    'components',
    'tags',
    'externalDocs',
  ],
  asyncComponents: [
    'schemas',
    'messages',
    'securitySchemes',
    'parameters',
    'correlationIds',
    'operationTraits',
    'messageTraits',
    'serverBindings',
    'channelBindings',
    'operationBindings',
    'messageBindings',
  ],
  channel: [
    '$ref',
    'address',
    'title',
    'summary',
    'description',
    'publish',
    'subscribe',
    'parameters',
    'bindings',
    'servers',
    'messages',
  ],
  asyncOperation: [
    '$ref',
    'action',
    'channel',
    'messages',
    'message',
    'summary',
    'description',
    'operationId',
    'tags',
    'traits',
    'bindings',
    'security',
    'reply',
    'externalDocs',
  ],
  message: [
    '$ref',
    'name',
    'title',
    'summary',
    'description',
    'contentType',
    'schemaFormat',
    'payload',
    'headers',
    'correlationId',
    'tags',
    'bindings',
    'traits',
    'examples',
    'externalDocs',
  ],
  asyncServer: [
    '$ref',
    'url',
    'host',
    'pathname',
    'protocol',
    'protocolVersion',
    'description',
    'variables',
    'security',
    'bindings',
    'tags',
  ],
  correlation: ['$ref', 'description', 'location'],
  bindings: [
    '$ref',
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
  ],
  asyncParameter: [
    '$ref',
    'description',
    'schema',
    'location',
    'enum',
    'default',
    'examples',
  ],
};
const asyncTransitions: Record<string, Record<string, string>> = {
  asyncRoot: {
    info: 'info',
    servers: 'map:asyncServer',
    channels: 'map:channel',
    operations: 'map:asyncOperation',
    components: 'asyncComponents',
    tags: 'list:tag',
    externalDocs: 'externalDocs',
  },
  asyncComponents: {
    ...transitions.components,
    messages: 'map:message',
    parameters: 'map:asyncParameter',
    correlationIds: 'map:correlation',
    messageTraits: 'map:message',
    operationTraits: 'map:asyncOperation',
    ...Object.fromEntries(
      [
        'serverBindings',
        'channelBindings',
        'operationBindings',
        'messageBindings',
      ].map((key) => [key, 'map:bindings']),
    ),
  },
  channel: {
    publish: 'asyncOperation',
    subscribe: 'asyncOperation',
    parameters: 'map:asyncParameter',
    bindings: 'bindings',
    messages: 'map:message',
  },
  asyncOperation: {
    message: 'message',
    channel: 'channel',
    messages: 'list:message',
    bindings: 'bindings',
    traits: 'list:asyncOperation',
    tags: 'list:tag',
  },
  message: {
    payload: 'schema',
    headers: 'schema',
    correlationId: 'correlation',
    bindings: 'bindings',
    traits: 'list:message',
    oneOf: 'list:message',
  },
  asyncServer: {
    variables: 'map:variable',
    security: 'list:security',
    bindings: 'bindings',
  },
  asyncParameter: { schema: 'schema' },
};
function kindAt(path: (string | number)[], async = false) {
  let kind = async ? 'asyncRoot' : 'root';
  for (const key of path) {
    if (
      kind.startsWith('map:') ||
      (kind.startsWith('list:') && typeof key === 'number')
    )
      kind = kind.slice(kind.indexOf(':') + 1);
    else
      kind =
        (async ? asyncTransitions[kind]?.[key] : undefined) ??
        transitions[kind]?.[key] ??
        transitions[kind]?.['*'] ??
        '';
  }
  return kind;
}
const marker = '__apibldr_completion_cursor__';
type Location = { path: (string | number)[]; key: boolean; siblings?: YAMLMap };
function locate(
  node: unknown,
  path: (string | number)[] = [],
): Location | undefined {
  if (path.length > 100) return undefined;
  if (isScalar(node) && node.value === marker) return { path, key: false };
  if (isMap(node)) {
    for (const item of node.items) {
      if (!isScalar(item.key)) continue;
      if (item.key.value === marker) return { path, key: true, siblings: node };
      const result = locate(item.value, [...path, String(item.key.value)]);
      if (result) return result;
    }
  } else if (isSeq(node)) {
    for (let index = 0; index < node.items.length; index++) {
      const result = locate(node.items[index], [...path, index]);
      if (result) return result;
    }
  }
}
function tokenRange(source: string, pos: number) {
  const start = source.lastIndexOf('\n', pos - 1) + 1;
  const end = source.indexOf('\n', pos);
  const line = source.slice(start, end < 0 ? source.length : end);
  const quoted = /"(?:\\.|[^"\\])*"|'(?:''|[^'])*'|"[^"\n]*$|'[^'\n]*$/g;
  for (const match of line.matchAll(quoted)) {
    const from = start + match.index;
    const to = from + match[0].length;
    if (
      pos > from &&
      pos <= to &&
      (pos < to || match[0].at(-1) !== match[0][0] || match[0].length === 1)
    ) {
      return { from, to, partial: source.slice(from + 1, pos), quoted: true };
    }
  }
  const before = source.slice(start, pos).match(/[\w$#~./-]*$/)![0];
  const after = source.slice(pos).match(/^[\w$#~./-]*/)![0];
  return {
    from: pos - before.length,
    to: pos + after.length,
    partial: before,
    quoted: false,
  };
}
const scalarValues: Record<string, string[]> = {
  in: ['path', 'query', 'header', 'cookie'],
  scheme: ['basic', 'bearer', 'digest'],
  style: [
    'matrix',
    'label',
    'form',
    'simple',
    'spaceDelimited',
    'pipeDelimited',
    'deepObject',
  ],
};
const booleans = new Set([
  'required',
  'deprecated',
  'readOnly',
  'writeOnly',
  'nullable',
  'explode',
  'allowEmptyValue',
  'allowReserved',
  'uniqueItems',
  'additionalProperties',
]);
const mediaTypes = [
  'application/json',
  'application/xml',
  'text/plain',
  'text/html',
  'multipart/form-data',
  'application/x-www-form-urlencoded',
  'application/octet-stream',
];

export function openApiCompletions(format: Format) {
  return (context: CompletionContext): CompletionResult | null => {
    if (context.state.readOnly) return null;
    const source = context.state.doc.toString();
    const token = tokenRange(source, context.pos);
    if (!context.explicit && !token.partial) return null;
    if (
      syntaxTree(context.state)
        .resolveInner(context.pos, -1)
        .name.includes('Comment')
    )
      return null;
    const prefix = source.slice(0, token.from);
    const linePrefix = prefix.slice(prefix.lastIndexOf('\n') + 1);
    const flowKey = /[{,]\s*$/.test(prefix);
    const blockKey = format === 'yaml' && /^\s*(?:-\s+)?$/.test(linePrefix);
    const key = flowKey || blockKey;
    const hasColon = /^\s*:/.test(source.slice(token.to));
    const probe =
      prefix +
      JSON.stringify(marker) +
      (key && !hasColon ? ': null' : '') +
      source.slice(token.to);
    // Inspect nodes directly: never resolve aliases or fetch remote references.
    const parsed = parseDocument(probe, {
      prettyErrors: false,
      logLevel: 'silent',
    });
    const location = locate(parsed.contents);
    if (!location) return null; // Includes comments and block scalar descriptions.
    const async = typeof parsed.get('asyncapi') === 'string';
    const v3 = async && String(parsed.get('asyncapi')).startsWith('3.');
    const is31 =
      !async && String(parsed.get('openapi') ?? '3.1').startsWith('3.1');
    const kind = kindAt(
      location.key ? location.path : location.path.slice(0, -1),
      async,
    );
    const field = String(location.path.at(-1) ?? '');
    let labels: string[] = [];
    let raw = false;
    if (location.key) {
      labels = [...(asyncFields[kind] ?? fields[kind] ?? [])];
      if (async) {
        if (kind === 'asyncRoot')
          labels = labels.filter((key) =>
            v3 ? !['tags', 'externalDocs'].includes(key) : key !== 'operations',
          );
        if (kind === 'channel')
          labels = labels.filter((key) =>
            v3
              ? !['publish', 'subscribe'].includes(key)
              : !['address', 'title', 'summary', 'messages'].includes(key),
          );
        if (kind === 'asyncOperation')
          labels = labels.filter((key) =>
            v3
              ? !['message', 'operationId'].includes(key)
              : ![
                  'action',
                  'channel',
                  'messages',
                  'security',
                  'reply',
                ].includes(key),
          );
        if (kind === 'asyncServer')
          labels = labels.filter((key) =>
            v3 ? key !== 'url' : !['host', 'pathname'].includes(key),
          );
        if (kind === 'flow' && v3)
          labels = labels.map((key) =>
            key === 'scopes' ? 'availableScopes' : key,
          );
      }
      if (kind === 'schema')
        labels.push(
          ...(is31
            ? [
                '$schema',
                '$id',
                '$defs',
                'const',
                'examples',
                'prefixItems',
                'contains',
                'patternProperties',
                'if',
                'then',
                'else',
              ]
            : ['nullable']),
        );
      if (is31 && kind === 'root') labels.push('webhooks', 'jsonSchemaDialect');
      if (is31 && kind === 'components') labels.push('pathItems');
      if (is31 && kind === 'info') labels.push('summary');
      if (is31 && kind === 'license') labels.push('identifier');
      if (kind === 'map:response') labels = Object.keys(responseStatuses);
      if (kind === 'map:media') labels = mediaTypes;
      if (kind === 'security')
        labels = mapKeys(parsed.getIn(['components', 'securitySchemes']));
      const existing = new Set(
        location.siblings?.items.map((item) =>
          isScalar(item.key) ? String(item.key.value) : '',
        ),
      );
      labels = labels.filter((label) => !existing.has(label));
    } else if (async && field === 'asyncapi')
      labels = ['2.0.0', '2.6.0', '3.0.0', '3.1.0'];
    else if (async && field === 'action') labels = ['send', 'receive'];
    else if (async && field === 'protocol')
      labels = [
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
        'nats',
        'redis',
      ];
    else if (
      async &&
      field === '$ref' &&
      [
        'message',
        'channel',
        'correlation',
        'asyncParameter',
        'asyncOperation',
      ].includes(kind)
    ) {
      const group = (
        {
          message: 'messages',
          channel: 'channels',
          correlation: 'correlationIds',
          asyncParameter: 'parameters',
          asyncOperation: 'operationTraits',
        } as Record<string, string>
      )[kind];
      labels = mapKeys(parsed.getIn(['components', group])).map(
        (name) =>
          `#/components/${group}/${encodeURIComponent(name.replace(/~/g, '~0').replace(/\//g, '~1'))}`,
      );
      if (kind === 'channel')
        labels.push(
          ...mapKeys(parsed.get('channels')).map(
            (name) =>
              `#/channels/${encodeURIComponent(name.replace(/~/g, '~0').replace(/\//g, '~1'))}`,
          ),
        );
    } else if (field === '$ref' && kind) {
      const group = Object.entries(componentKinds).find(
        ([, value]) => value === kind,
      )?.[0];
      if (group)
        labels = mapKeys(parsed.getIn(['components', group])).map(
          (name) =>
            `#/components/${group}/${encodeURIComponent(name.replace(/~/g, '~0').replace(/\//g, '~1'))}`,
        );
    } else if (field === 'type' && kind === 'schema') {
      labels = [
        'string',
        'integer',
        'number',
        'boolean',
        'array',
        'object',
        ...(is31 ? ['null'] : []),
      ];
    } else if (field === 'type' && kind === 'securityScheme') {
      labels = [
        'apiKey',
        'http',
        'oauth2',
        'openIdConnect',
        ...(is31 ? ['mutualTLS'] : []),
      ];
    } else if (field === 'format' && kind === 'schema') {
      const type = parsed.getIn([...location.path.slice(0, -1), 'type']);
      labels =
        type === 'integer'
          ? ['int32', 'int64']
          : type === 'number'
            ? ['float', 'double']
            : [
                'date',
                'date-time',
                'uuid',
                'email',
                'uri',
                'hostname',
                'ipv4',
                'ipv6',
                'byte',
                'binary',
                'password',
              ];
    } else if (field === 'openapi' && kind === 'root')
      labels = ['3.1.0', '3.0.3'];
    else if (
      booleans.has(field) &&
      (fields[kind]?.includes(field) ||
        (kind === 'schema' && field === 'nullable' && !is31))
    ) {
      labels = ['true', 'false'];
      raw = true;
    } else if (
      (kind === 'parameter' || kind === 'securityScheme') &&
      field === 'in'
    ) {
      labels =
        kind === 'securityScheme'
          ? ['query', 'header', 'cookie']
          : scalarValues.in;
    } else if (field === 'scheme' && kind === 'securityScheme')
      labels = scalarValues.scheme;
    else if (
      field === 'style' &&
      ['parameter', 'header', 'encoding'].includes(kind)
    )
      labels = scalarValues.style;
    else if (field === 'description' && kind === 'response')
      labels = [responseStatuses[String(location.path.at(-2))]].filter(Boolean);
    const matching = labels.filter((label) =>
      label.toLowerCase().startsWith(token.partial.toLowerCase()),
    );
    if (!matching.length) return null;
    return {
      from: token.from,
      to: token.to,
      filter: false,
      options: matching.map((label) => ({
        label,
        type: location.key
          ? 'property'
          : field === '$ref'
            ? 'variable'
            : 'enum',
        detail: location.key
          ? (responseStatuses[label] ?? kind.replace('map:', ''))
          : field === '$ref'
            ? 'local reference'
            : field,
        apply:
          (raw && !location.key
            ? label
            : format === 'json' ||
                token.quoted ||
                label.startsWith('#') ||
                /^\d/.test(label) ||
                label === 'null'
              ? JSON.stringify(label)
              : label) + (location.key && !hasColon ? ': ' : ''),
      })),
    };
  };
}
function mapKeys(node: unknown): string[] {
  return isMap(node)
    ? node.items.flatMap((item) =>
        isScalar(item.key) ? [String(item.key.value)] : [],
      )
    : [];
}
