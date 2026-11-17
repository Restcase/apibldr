import {
  isObject,
  methods,
  type ApiDocument,
  type JsonObject,
} from './document';

export const componentCategories = [
  'securitySchemes',
  'schemas',
  'parameters',
  'responses',
  'headers',
  'requestBodies',
  'examples',
  'links',
  'callbacks',
] as const;
export const asyncComponentCategories = [
  'securitySchemes',
  'schemas',
  'parameters',
  'messages',
  'messageBindings',
  'messageTraits',
  'operationTraits',
  'correlationIds',
  'serverBindings',
  'channelBindings',
  'operationBindings',
] as const;
export type ComponentCategory =
  | (typeof componentCategories)[number]
  | (typeof asyncComponentCategories)[number];
type Preset = { label: string; name: string; value: JsonObject };
type Category = {
  title: string;
  singular: string;
  description: string;
  usage: string;
  presets: Preset[];
};
const jsonContent = {
  'application/json': { schema: { type: 'object', properties: {} } },
};
const bindingCategory = (scope: string): Category => ({
  title: `${scope} bindings`,
  singular: 'binding',
  description: `Describe protocol-specific ${scope.toLowerCase()} settings.`,
  usage:
    'Bindings attach protocol details to a definition. Reference this component from the matching bindings field. Only configure protocols used by your API.',
  presets: ['kafka', 'amqp', 'mqtt', 'ws', 'http'].map((protocol) => ({
    label: protocol.toUpperCase(),
    name: `${protocol}Binding`,
    value: {
      [protocol]:
        protocol === 'amqp' && scope === 'Channel'
          ? { is: 'queue', queue: { name: 'events' } }
          : {},
    },
  })),
});
export const componentCatalog: Record<ComponentCategory, Category> = {
  messages: {
    title: 'Messages',
    singular: 'message',
    description:
      'Describe the events, commands, and responses exchanged on channels.',
    usage:
      'A message describes payload, application headers, content type and correlation ID. Reference a message from an operation in AsyncAPI 2.x, or a channel in 3.x.',
    presets: [
      {
        label: 'JSON event',
        name: 'Event',
        value: {
          name: 'Event',
          contentType: 'application/json',
          payload: { type: 'object', properties: { id: { type: 'string' } } },
        },
      },
    ],
  },
  correlationIds: {
    title: 'Correlation IDs',
    singular: 'correlation ID',
    description: 'Identify the value used to match related messages.',
    usage:
      'Use a runtime expression to locate the correlation value in a message header or payload.',
    presets: [
      {
        label: 'Header correlation',
        name: 'CorrelationId',
        value: { location: '$message.header#/correlationId' },
      },
    ],
  },
  messageTraits: {
    title: 'Message traits',
    singular: 'message trait',
    description: 'Reuse common metadata and headers across messages.',
    usage:
      'Attach traits to a message using its traits array. Payloads belong to messages, not message traits.',
    presets: [
      {
        label: 'JSON metadata',
        name: 'JsonMessage',
        value: {
          contentType: 'application/json',
          headers: {
            type: 'object',
            properties: { correlationId: { type: 'string' } },
          },
        },
      },
    ],
  },
  operationTraits: {
    title: 'Operation traits',
    singular: 'operation trait',
    description: 'Reuse operation metadata, tags, and bindings.',
    usage:
      'Reference a trait from an operation’s traits array. Operation-specific fields override trait defaults.',
    presets: [
      {
        label: 'Operation metadata',
        name: 'OperationMetadata',
        value: { summary: 'Event operation' },
      },
    ],
  },
  serverBindings: bindingCategory('Server'),
  channelBindings: bindingCategory('Channel'),
  operationBindings: bindingCategory('Operation'),
  messageBindings: bindingCategory('Message'),
  securitySchemes: {
    title: 'Security schemes',
    singular: 'scheme',
    description: 'Describe how clients authenticate with your API.',
    usage:
      'A scheme defines an authentication method. Apply it using a security requirement on the API or an operation. Defining a scheme alone does not require authentication. Never put real credentials in a definition.',
    presets: [
      {
        label: 'Basic Auth',
        name: 'BasicAuth',
        value: { type: 'http', scheme: 'basic' },
      },
      {
        label: 'JWT Auth',
        name: 'BearerAuth',
        value: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
      {
        label: 'API key',
        name: 'ApiKeyAuth',
        value: { type: 'apiKey', in: 'header', name: 'X-API-Key' },
      },
      {
        label: 'OAuth2',
        name: 'OAuth2',
        value: {
          type: 'oauth2',
          flows: {
            authorizationCode: {
              authorizationUrl: 'https://example.com/oauth/authorize',
              tokenUrl: 'https://example.com/oauth/token',
              scopes: {},
            },
          },
        },
      },
      {
        label: 'OpenID Connect',
        name: 'OpenIdConnect',
        value: {
          type: 'openIdConnect',
          openIdConnectUrl:
            'https://example.com/.well-known/openid-configuration',
        },
      },
    ],
  },
  schemas: {
    title: 'Schemas',
    singular: 'schema',
    description: 'Define reusable data models for requests and responses.',
    usage:
      'Reference a schema from a request body, response, or another schema. Add properties to an object and mark the ones clients must supply as required. Advanced JSON supports nested models and composition.',
    presets: [
      {
        label: 'Object model',
        name: 'Model',
        value: { type: 'object', properties: {} },
      },
      {
        label: 'Array',
        name: 'Collection',
        value: { type: 'array', items: { type: 'string' } },
      },
      {
        label: 'Error model',
        name: 'Error',
        value: {
          type: 'object',
          required: ['message'],
          properties: { code: { type: 'string' }, message: { type: 'string' } },
        },
      },
    ],
  },
  parameters: {
    title: 'Parameters',
    singular: 'parameter',
    description: 'Reuse query, path, header, and cookie parameters.',
    usage:
      'A reusable parameter needs its wire name, location, and schema. Path parameters must be required. Reference this definition in a path or operation’s parameters array.',
    presets: [
      {
        label: 'Query parameter',
        name: 'SearchQuery',
        value: {
          name: 'q',
          in: 'query',
          required: false,
          schema: { type: 'string' },
        },
      },
      {
        label: 'Path ID',
        name: 'ResourceId',
        value: {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string' },
        },
      },
      {
        label: 'Pagination limit',
        name: 'PageLimit',
        value: {
          name: 'limit',
          in: 'query',
          schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
        },
      },
    ],
  },
  responses: {
    title: 'Responses',
    singular: 'response',
    description:
      'Describe reusable responses, including their body and headers.',
    usage:
      'A response definition describes a result; its HTTP status is chosen when the operation references it. Use content to describe the media type and schema. A description is required.',
    presets: [
      {
        label: 'JSON response',
        name: 'Success',
        value: { description: 'Successful response', content: jsonContent },
      },
      {
        label: 'Not found',
        name: 'NotFound',
        value: { description: 'The requested resource was not found.' },
      },
      {
        label: 'No content',
        name: 'NoContent',
        value: {
          description: 'The request succeeded without a response body.',
        },
      },
    ],
  },
  headers: {
    title: 'Headers',
    singular: 'header',
    description: 'Describe reusable response headers.',
    usage:
      'The component name is a reusable identifier. The actual header name is set where a response references it. Use a schema to describe the header value.',
    presets: [
      {
        label: 'Request ID',
        name: 'RequestId',
        value: {
          description: 'Identifier used to trace this request.',
          schema: { type: 'string' },
        },
      },
      {
        label: 'Rate limit',
        name: 'RateLimit',
        value: {
          description: 'Requests remaining in the current window.',
          schema: { type: 'integer', minimum: 0 },
        },
      },
    ],
  },
  requestBodies: {
    title: 'Request bodies',
    singular: 'request body',
    description: 'Define payloads that multiple operations can accept.',
    usage:
      'A request body describes media types and their schemas. Mark it required when the operation cannot be called without a body, then reference it from the operation’s requestBody field.',
    presets: [
      {
        label: 'JSON body',
        name: 'JsonBody',
        value: { required: true, content: jsonContent },
      },
      {
        label: 'File upload',
        name: 'FileUpload',
        value: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['file'],
                properties: { file: { type: 'string', format: 'binary' } },
              },
            },
          },
        },
      },
    ],
  },
  examples: {
    title: 'Examples',
    singular: 'example',
    description:
      'Provide realistic sample values for documentation and tooling.',
    usage:
      'Reference an example under a media type or parameter’s examples map. Use a value or an externalValue URL, but not both. Example values do not change the schema.',
    presets: [
      {
        label: 'JSON example',
        name: 'Example',
        value: { summary: 'Example payload', value: { id: 'example-id' } },
      },
      {
        label: 'External example',
        name: 'ExternalExample',
        value: {
          summary: 'External example',
          externalValue: 'https://example.com/example.json',
        },
      },
    ],
  },
  links: {
    title: 'Links',
    singular: 'link',
    description: 'Connect a response to a related API operation.',
    usage:
      'A link identifies a target by operationId or operationRef, not both. Map values from the current request or response to target parameters using runtime expressions in Advanced JSON.',
    presets: [
      {
        label: 'Operation link',
        name: 'RelatedOperation',
        value: {
          operationId: 'getResource',
          description:
            'Follow this operation to retrieve the related resource.',
        },
      },
    ],
  },
  callbacks: {
    title: 'Callbacks',
    singular: 'callback',
    description: 'Describe requests your API sends back to a client.',
    usage:
      'The callback key is a runtime expression resolving to a URL supplied by the client. Its value is a path item describing the outgoing request. Reference the callback from an operation’s callbacks map.',
    presets: [
      {
        label: 'Webhook callback',
        name: 'Webhook',
        value: {
          '{$request.body#/callbackUrl}': {
            post: {
              summary: 'Notify the client',
              requestBody: { required: true, content: jsonContent },
              responses: { '200': { description: 'Notification accepted' } },
            },
          },
        },
      },
    ],
  },
};
export function getComponents(
  doc: ApiDocument,
  category: ComponentCategory,
): JsonObject {
  return isObject(doc.components) && isObject(doc.components[category])
    ? doc.components[category]
    : {};
}
export function componentRef(category: ComponentCategory, name: string) {
  return `#/components/${category}/${encodeURIComponent(name.replace(/~/g, '~0').replace(/\//g, '~1'))}`;
}
export function uniqueComponentName(
  doc: ApiDocument,
  category: ComponentCategory,
  base: string,
) {
  const entries = getComponents(doc, category);
  let name = base;
  for (let number = 2; Object.hasOwn(entries, name); number++)
    name = `${base}${number}`;
  return name;
}
export function setComponent(
  doc: ApiDocument,
  category: ComponentCategory,
  name: string,
  value: unknown,
): ApiDocument {
  return {
    ...doc,
    components: {
      ...(isObject(doc.components) ? doc.components : {}),
      [category]: { ...getComponents(doc, category), [name]: value },
    },
  };
}
function isSecurityRequirement(path: string[]) {
  return (
    path.at(-1) === 'security' &&
    (path.length === 1 ||
      methods.includes(path.at(-2) as (typeof methods)[number]) ||
      path.at(-3) === 'servers')
  );
}
// Skip example payloads and extension data: these are user data, not references.
export function rewriteReferences(
  value: unknown,
  oldRef: string,
  newRef: string,
  oldScheme?: string,
  newScheme?: string,
  path: string[] = [],
): unknown {
  if (Array.isArray(value))
    return value.map((item, index) => {
      if (
        oldScheme &&
        newScheme &&
        isSecurityRequirement(path) &&
        isObject(item) &&
        Object.hasOwn(item, oldScheme)
      ) {
        const next = { ...item, [newScheme]: item[oldScheme] };
        delete next[oldScheme];
        return next;
      }
      return rewriteReferences(item, oldRef, newRef, oldScheme, newScheme, [
        ...path,
        String(index),
      ]);
    });
  if (!isObject(value)) return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => {
      if (
        (key === '$ref' || key === 'operationRef') &&
        typeof item === 'string' &&
        (item === oldRef || item.startsWith(`${oldRef}/`))
      )
        return [key, newRef + item.slice(oldRef.length)];
      if (
        path.at(-1) === 'mapping' &&
        path.at(-2) === 'discriminator' &&
        oldRef.startsWith('#/components/schemas/')
      ) {
        if (item === oldRef) return [key, newRef];
        if (item === oldRef.split('/').at(-1))
          return [key, newRef.split('/').at(-1)];
      }
      const namedEntries = [
        'properties',
        '$defs',
        'schemas',
        'headers',
        'parameters',
        'responses',
        'links',
        'callbacks',
        'requestBodies',
        'securitySchemes',
        'examples',
        'messages',
        'messageTraits',
        'operationTraits',
        'correlationIds',
        'channels',
        'operations',
        'servers',
      ].includes(path.at(-1) ?? '');
      if (
        !namedEntries &&
        (['example', 'value', 'default', 'enum', 'const'].includes(key) ||
          (key === 'examples' && Array.isArray(item)) ||
          key.startsWith('x-'))
      )
        return [key, item];
      return [
        key,
        rewriteReferences(item, oldRef, newRef, oldScheme, newScheme, [
          ...path,
          key,
        ]),
      ];
    }),
  );
}
export function renameComponent(
  doc: ApiDocument,
  category: ComponentCategory,
  from: string,
  to: string,
): ApiDocument {
  if (!/^[a-zA-Z0-9._-]+$/.test(to))
    throw new Error(
      'Use letters, numbers, dots, underscores, or hyphens for the component name.',
    );
  if (from === to) return doc;
  const entries = getComponents(doc, category);
  if (Object.hasOwn(entries, to))
    throw new Error(
      `A component named ${to} already exists. Choose a different name.`,
    );
  const next = { ...entries, [to]: entries[from] };
  delete next[from];
  const renamed = {
    ...doc,
    components: { ...(doc.components as JsonObject), [category]: next },
  };
  return rewriteReferences(
    renamed,
    componentRef(category, from),
    componentRef(category, to),
    category === 'securitySchemes' ? from : undefined,
    to,
  ) as ApiDocument;
}
export function removeComponent(
  doc: ApiDocument,
  category: ComponentCategory,
  name: string,
): ApiDocument {
  const entries = { ...getComponents(doc, category) };
  delete entries[name];
  const next = {
    ...doc,
    components: { ...(doc.components as JsonObject), [category]: entries },
  };
  const replaced = rewriteReferences(
    next,
    componentRef(category, name),
    '__referenced__',
    category === 'securitySchemes' ? name : undefined,
    '__referenced__',
  );
  if (JSON.stringify(replaced) !== JSON.stringify(next))
    throw new Error(
      'This component is still in use. Remove its references or security requirements before deleting it.',
    );
  return next;
}

export function catalogFor(
  doc: ApiDocument,
  category: ComponentCategory,
): Category {
  const catalog = componentCatalog[category];
  if (!doc.asyncapi) return catalog;
  if (category === 'parameters')
    return {
      title: 'Parameters',
      singular: 'parameter',
      description: 'Describe placeholders in channel addresses.',
      usage:
        'Use a parameter for each {placeholder} in a channel address. AsyncAPI parameters do not use HTTP query/path locations.',
      presets: [
        {
          label: 'Channel parameter',
          name: 'ChannelId',
          value: doc.asyncapi.startsWith('3.')
            ? { description: 'Channel identifier' }
            : { description: 'Channel identifier', schema: { type: 'string' } },
        },
      ],
    };
  if (category === 'securitySchemes')
    return {
      ...catalog,
      usage:
        'Describe broker authentication here, then apply a scheme to a server. AsyncAPI 3 also supports operation security. Defining a scheme alone does not apply it. Never include real credentials.',
      presets: [
        ...catalog.presets
          .filter((p) => p.value.type !== 'apiKey')
          .map((p) => {
            if (p.value.type !== 'oauth2' || !doc.asyncapi?.startsWith('3.'))
              return p;
            return {
              ...p,
              value: {
                ...p.value,
                flows: {
                  authorizationCode: {
                    authorizationUrl: 'https://example.com/oauth/authorize',
                    tokenUrl: 'https://example.com/oauth/token',
                    availableScopes: {},
                  },
                },
              },
            };
          }),
        {
          label: 'User / password',
          name: 'UserPassword',
          value: { type: 'userPassword' },
        },
        {
          label: 'API key',
          name: 'ApiKeyAuth',
          value: { type: 'apiKey', in: 'user' },
        },
        {
          label: 'HTTP API key',
          name: 'HttpApiKey',
          value: { type: 'httpApiKey', in: 'header', name: 'X-API-Key' },
        },
        { label: 'X.509', name: 'Certificate', value: { type: 'X509' } },
      ],
    };
  return catalog;
}
