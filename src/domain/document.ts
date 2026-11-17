import { checkAsync } from './asyncapi';
import { parseDocument, stringify } from 'yaml';

export type JsonObject = { [key: string]: unknown };
export type ApiDocument = JsonObject & {
  openapi?: string;
  asyncapi?: string;
  channels?: Record<string, JsonObject>;
  operations?: Record<string, JsonObject>;
  info: JsonObject & { title: string; version: string };
  paths?: Record<string, JsonObject>;
};
export const methods = [
  'get',
  'post',
  'put',
  'patch',
  'delete',
  'options',
  'head',
  'trace',
] as const;
export type Method = (typeof methods)[number];
export type Format = 'yaml' | 'json';
export type Operation = { path: string; method: Method; value: JsonObject };
export const maxDocumentSize = 2 * 1024 * 1024;

export function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export function isAsync(doc: ApiDocument): boolean {
  return typeof doc.asyncapi === 'string';
}
export function specLabel(doc: ApiDocument): string {
  return isAsync(doc) ? `AsyncAPI ${doc.asyncapi}` : `OpenAPI ${doc.openapi}`;
}
export function emptyDocument(spec = 'openapi:3.1.0'): ApiDocument {
  if (spec.startsWith('asyncapi:'))
    return {
      asyncapi: spec.split(':')[1],
      info: { title: 'Untitled event API', version: '1.0.0' },
      channels: {},
      ...(spec.includes(':3.') ? { operations: {} } : {}),
    };
  return {
    openapi: spec.split(':')[1] || '3.1.0',
    info: { title: 'Untitled API', version: '1.0.0' },
    paths: {},
  };
}

export function parseApi(source: string): ApiDocument {
  if (new TextEncoder().encode(source).byteLength > maxDocumentSize)
    throw new Error(
      'This document exceeds the 2 MB editor limit. Import a smaller document.',
    );
  const parsed = parseDocument(source, { uniqueKeys: true, schema: 'core' });
  if (parsed.errors.length) throw new Error(parsed.errors[0].message);
  const value: unknown = parsed.toJS({ maxAliasCount: 50 });
  if (!isObject(value))
    throw new Error('The document must be a JSON or YAML object.');
  if (value.swagger)
    throw new Error(
      'Swagger 2.0 conversion is not available yet. Import an OpenAPI 3.0 or 3.1 document.',
    );
  if (value.asyncapi !== undefined && value.openapi !== undefined)
    throw new Error('Use either asyncapi or openapi, not both.');
  if (value.asyncapi !== undefined) {
    if (
      typeof value.asyncapi !== 'string' ||
      !/^(2\.[0-6]|3\.[01])\.\d+$/.test(value.asyncapi)
    )
      throw new Error('Use AsyncAPI 2.0–2.6, 3.0, or 3.1.');
    for (const field of ['channels', 'operations', 'servers', 'components']) {
      if (value[field] !== undefined && !isObject(value[field]))
        throw new Error(`${field} must be an object.`);
    }
    for (const field of ['channels', 'operations', 'servers']) {
      if (isObject(value[field]))
        for (const [name, item] of Object.entries(value[field])) {
          if (!isObject(item))
            throw new Error(`${field}.${name} must be an object.`);
        }
    }
  } else if (
    typeof value.openapi !== 'string' ||
    !/^3\.[01]\.\d+$/.test(value.openapi)
  ) {
    throw new Error(
      'Set openapi to a supported version, such as "3.1.0" or "3.0.3".',
    );
  }
  if (
    !isObject(value.info) ||
    typeof value.info.title !== 'string' ||
    typeof value.info.version !== 'string'
  ) {
    throw new Error(
      'Add an info object with a title and a quoted version string.',
    );
  }
  if (value.paths !== undefined) {
    if (!isObject(value.paths))
      throw new Error('paths must be an object mapping paths to operations.');
    for (const [path, item] of Object.entries(value.paths)) {
      if (path.startsWith('x-')) continue;
      if (!isObject(item))
        throw new Error(`The path ${path} must contain an object.`);
      for (const method of methods) {
        if (item[method] !== undefined && !isObject(item[method]))
          throw new Error(`${method.toUpperCase()} ${path} must be an object.`);
      }
    }
  }
  // A JSON round trip rejects cyclic aliases and keeps the model serializable.
  return JSON.parse(
    JSON.stringify(value, (_key, item: unknown) => {
      if (typeof item === 'number' && !Number.isFinite(item))
        throw new Error(
          'API values must be JSON-compatible. Replace non-finite numbers with finite values.',
        );
      return item;
    }),
  ) as ApiDocument;
}

export function serializeApi(doc: ApiDocument, format: Format): string {
  return format === 'json'
    ? `${JSON.stringify(doc, null, 2)}\n`
    : stringify(doc, { lineWidth: 0 });
}

export function listOperations(doc: ApiDocument): Operation[] {
  return Object.entries(doc.paths ?? {}).flatMap(([path, item]) =>
    path.startsWith('x-')
      ? []
      : methods.flatMap((method) =>
          isObject(item[method]) ? [{ path, method, value: item[method] }] : [],
        ),
  );
}

export function addOperation(
  doc: ApiDocument,
  path: string,
  method: Method,
): ApiDocument {
  if (!path.startsWith('/') || /\s|[?#]/.test(path))
    throw new Error(
      'Start the path with / and omit spaces, query strings, and fragments.',
    );
  if (/[{}]/.test(path.replace(/\{[^{}]+\}/g, ''))) {
    throw new Error(
      'Give each path parameter a name inside matching braces, such as {id}.',
    );
  }
  const current = doc.paths?.[path] ?? {};
  if (Object.hasOwn(current, method))
    throw new Error(
      `${method.toUpperCase()} ${path} already exists. Choose a different method or path.`,
    );
  if (current.$ref)
    throw new Error(
      'This path is a reference. Edit its target in source before adding an operation.',
    );
  const parameterNames = new Set(
    Array.from(path.matchAll(/\{([^}]+)\}/g), ([, name]) => name),
  );
  const inherited = Array.isArray(current.parameters) ? current.parameters : [];
  const hasReferencedParameters = inherited.some(
    (parameter) => isObject(parameter) && typeof parameter.$ref === 'string',
  );
  const parameters = Array.from(parameterNames)
    .filter(
      (name) =>
        !hasReferencedParameters &&
        !inherited.some(
          (parameter) =>
            isObject(parameter) &&
            parameter.in === 'path' &&
            parameter.name === name,
        ),
    )
    .map((name) => ({
      name,
      in: 'path',
      required: true,
      schema: { type: 'string' },
    }));
  return {
    ...doc,
    paths: {
      ...doc.paths,
      [path]: {
        ...current,
        [method]: {
          summary: '',
          ...(parameters.length ? { parameters } : {}),
          responses: { '200': { description: 'Successful response' } },
        },
      },
    },
  };
}

export function patchOperation(
  doc: ApiDocument,
  operation: Operation,
  patch: JsonObject,
): ApiDocument {
  const item = doc.paths?.[operation.path];
  const current = item?.[operation.method];
  if (!item || !isObject(current))
    throw new Error(
      'This operation no longer exists. Select an operation from the sidebar.',
    );
  return {
    ...doc,
    paths: {
      ...doc.paths,
      [operation.path]: {
        ...item,
        [operation.method]: { ...current, ...patch },
      },
    },
  };
}

export function removeOperation(
  doc: ApiDocument,
  operation: Operation,
): ApiDocument {
  const paths = { ...doc.paths };
  const item = { ...paths[operation.path] };
  delete item[operation.method];
  // Path-level parameters, references, extensions, and other methods survive.
  if (Object.keys(item).length) paths[operation.path] = item;
  else delete paths[operation.path];
  return { ...doc, paths };
}

export type Diagnostic = { location: string; message: string };
export function checkDocument(doc: ApiDocument): Diagnostic[] {
  const issues: Diagnostic[] = [];
  if (!doc.info.title.trim())
    issues.push({ location: 'info.title', message: 'Give your API a title.' });
  if (!doc.info.version.trim())
    issues.push({
      location: 'info.version',
      message: 'Give your API a version.',
    });
  if (isAsync(doc)) return [...issues, ...checkAsync(doc)];
  function checkParameter(value: unknown, location: string) {
    if (
      isObject(value) &&
      !value.$ref &&
      value.in === 'path' &&
      value.required !== true
    )
      issues.push({
        location,
        message: `Path parameter "${text(value.name) || '(unnamed)'}" must set required to true.`,
      });
  }
  function checkParameters(value: unknown, location: string) {
    if (Array.isArray(value))
      value.forEach((parameter, index) =>
        checkParameter(parameter, `${location}.parameters[${index}]`),
      );
  }
  if (isObject(doc.components) && isObject(doc.components.parameters))
    for (const [name, value] of Object.entries(doc.components.parameters))
      checkParameter(value, `components.parameters.${name}`);
  const ids = new Set<string>();
  for (const [path, item] of Object.entries(doc.paths ?? {})) {
    if (path.startsWith('x-')) continue;
    checkParameters(item.parameters, path);
    if (!path.startsWith('/') && !path.startsWith('x-'))
      issues.push({ location: path, message: 'API paths must start with /.' });
  }
  for (const { path, method, value } of listOperations(doc)) {
    const location = `${method.toUpperCase()} ${path}`;
    checkParameters(value.parameters, location);
    if (
      !isObject(value.responses) ||
      Object.keys(value.responses).filter((key) => !key.startsWith('x-'))
        .length === 0
    )
      issues.push({ location, message: 'Define at least one response.' });
    if (isObject(value.responses))
      for (const [status, response] of Object.entries(value.responses)) {
        if (status.startsWith('x-')) continue;
        if (!/^(default|[1-5](\d{2}|XX))$/.test(status))
          issues.push({
            location,
            message: `Response ${status} needs an HTTP status code, range, or "default".`,
          });
        if (
          !isObject(response) ||
          (!response.$ref && typeof response.description !== 'string')
        )
          issues.push({
            location,
            message: `Response ${status} needs a description or a reference.`,
          });
      }
    const id = text(value.operationId);
    if (id && ids.has(id))
      issues.push({
        location,
        message: `The operation ID "${id}" is already used.`,
      });
    if (id) ids.add(id);
  }
  return issues;
}
