import Ajv from 'ajv';
import Ajv2020 from 'ajv/dist/2020';
import Ajv04 from 'ajv-draft-04';
import addFormats from 'ajv-formats';
import { isObject, type ApiDocument, type Diagnostic } from './document';
import type { ValidateFunction } from 'ajv';
const sources = import.meta.glob('../schemas/*.json', { import: 'default' });
const validators = new Map<string, ValidateFunction>();
export async function validateSpecification(
  document: ApiDocument,
): Promise<Diagnostic[]> {
  const family = document.asyncapi ? 'asyncapi' : 'openapi';
  const version =
    (document.asyncapi ?? document.openapi ?? '')
      .split('.')
      .slice(0, 2)
      .join('.') + (family === 'asyncapi' ? '.0' : '');
  const key = `${family}-${version}`;
  let validate = validators.get(key);
  if (!validate) {
    const load = sources[`../schemas/${key}.json`];
    if (!load) throw new Error(`No bundled schema for ${key}.`);
    let schema = await load();
    if (key === 'openapi-3.1') {
      // Ajv supports dynamic anchors only at schema roots. This standalone
      // document schema binds #meta to $defs/schema (object or boolean), so
      // use that static target in a copy; leave the official bundle untouched.
      schema = JSON.parse(
        JSON.stringify(schema, (_key, value: unknown) => {
          if (isObject(value) && value.$dynamicRef === '#meta') {
            const { $dynamicRef: _ref, ...rest } = value;
            return { ...rest, $ref: '#/$defs/schema' };
          }
          return value;
        }),
      );
    }
    const options = { allErrors: true, strict: false, validateFormats: true };
    const ajv =
      family === 'openapi' && version === '3.1'
        ? new Ajv2020(options)
        : family === 'openapi'
          ? new Ajv04(options)
          : new Ajv(options);
    addFormats(ajv);
    validate = ajv.compile(schema as object);
    validators.set(key, validate);
  }
  validate(document);
  const issues: Diagnostic[] = (validate.errors ?? [])
    .filter((error) => error.keyword !== 'if')
    .map((error) => ({
      location: error.instancePath || '/',
      message: `${error.message}${error.params.missingProperty ? `: ${error.params.missingProperty}` : ''}${error.params.additionalProperty ? `: ${error.params.additionalProperty}` : ''}`,
    }));
  const refs: Diagnostic[] = [];
  function walk(value: unknown, location: string) {
    if (Array.isArray(value)) {
      value.forEach((item, i) => walk(item, `${location}/${i}`));
      return;
    }
    if (!isObject(value)) return;
    if (typeof value.$ref === 'string') {
      if (value.$ref.startsWith('#/')) {
        let target: unknown = document;
        try {
          for (const key of decodeURIComponent(value.$ref.slice(2))
            .split('/')
            .map((k) => k.replace(/~1/g, '/').replace(/~0/g, '~')))
            target =
              isObject(target) || Array.isArray(target)
                ? (target as Record<string, unknown>)[key]
                : undefined;
        } catch {
          target = undefined;
        }
        if (target === undefined)
          refs.push({
            location,
            message: `Unresolved local reference: ${value.$ref}`,
          });
      } else if (!value.$ref.startsWith('#'))
        refs.push({
          location,
          message: `External reference not checked offline: ${value.$ref}`,
        });
    }
    const namedEntries = [
      'schemas',
      'properties',
      '$defs',
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
    ].includes(location.split('/').at(-1) ?? '');
    for (const [key, item] of Object.entries(value)) {
      if (
        !namedEntries &&
        (['example', 'value', 'default', 'enum', 'const'].includes(key) ||
          (key === 'examples' && Array.isArray(item)) ||
          key.startsWith('x-'))
      )
        continue;
      walk(item, `${location}/${key}`);
    }
  }
  walk(document, '');
  return [
    ...new Map(
      [...issues, ...refs].map((issue) => [
        `${issue.location}:${issue.message}`,
        issue,
      ]),
    ).values(),
  ];
}
