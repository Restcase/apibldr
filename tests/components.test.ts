import { describe, expect, it } from 'vitest';
import {
  componentCatalog,
  componentCategories,
  getComponents,
  removeComponent,
  renameComponent,
  setComponent,
  uniqueComponentName,
} from '../src/domain/components';
import {
  emptyDocument,
  parseApi,
  type JsonObject,
} from '../src/domain/document';

describe('component mutations', () => {
  it('updates discriminator mappings and references in properties named value/example', () => {
    let doc = setComponent(emptyDocument(), 'schemas', 'Pet', {});
    doc = setComponent(doc, 'schemas', 'Other', {
      properties: {
        example: { $ref: '#/components/schemas/Pet' },
        value: { $ref: '#/components/schemas/Pet' },
      },
      discriminator: {
        propertyName: 'kind',
        mapping: { pet: '#/components/schemas/Pet', shorthand: 'Pet' },
      },
    });
    const next = renameComponent(doc, 'schemas', 'Pet', 'Animal');
    expect(getComponents(next, 'schemas').Other).toEqual({
      properties: {
        example: { $ref: '#/components/schemas/Animal' },
        value: { $ref: '#/components/schemas/Animal' },
      },
      discriminator: {
        propertyName: 'kind',
        mapping: { pet: '#/components/schemas/Animal', shorthand: 'Animal' },
      },
    });
    expect(() => removeComponent(next, 'schemas', 'Animal')).toThrow(
      'still in use',
    );
  });
  it.each(componentCategories)(
    'creates and round-trips every %s preset',
    (category) => {
      let doc = emptyDocument();
      for (const preset of componentCatalog[category].presets) {
        const name = uniqueComponentName(doc, category, preset.name);
        doc = setComponent(doc, category, name, structuredClone(preset.value));
        expect(
          getComponents(parseApi(JSON.stringify(doc)), category)[name],
        ).toEqual(preset.value);
        expect(uniqueComponentName(doc, category, preset.name)).toBe(
          `${preset.name}2`,
        );
      }
    },
  );
  it('renames schema references including nested pointer suffixes without rewriting example data', () => {
    let doc = setComponent(emptyDocument(), 'schemas', 'Pet', {
      type: 'object',
    });
    doc = setComponent(doc, 'schemas', 'Other', {
      allOf: [{ $ref: '#/components/schemas/Pet' }],
      properties: { id: { $ref: '#/components/schemas/Pet/properties/id' } },
      example: { $ref: '#/components/schemas/Pet' },
      'x-raw': { $ref: '#/components/schemas/Pet' },
    });
    const next = renameComponent(doc, 'schemas', 'Pet', 'Animal');
    expect(getComponents(next, 'schemas').Pet).toBeUndefined();
    expect(getComponents(next, 'schemas').Other).toEqual({
      allOf: [{ $ref: '#/components/schemas/Animal' }],
      properties: { id: { $ref: '#/components/schemas/Animal/properties/id' } },
      example: { $ref: '#/components/schemas/Pet' },
      'x-raw': { $ref: '#/components/schemas/Pet' },
    });
    expect(getComponents(doc, 'schemas').Pet).toBeDefined();
  });
  it('updates root and operation security requirements during rename', () => {
    let doc = setComponent(emptyDocument(), 'securitySchemes', 'BasicAuth', {
      type: 'http',
      scheme: 'basic',
    });
    doc = {
      ...doc,
      security: [{ BasicAuth: [] }],
      paths: {
        '/pets': {
          get: {
            security: [{ BasicAuth: [], AnotherScheme: ['read'] }],
            responses: {},
          },
        },
      },
    };
    const next = renameComponent(doc, 'securitySchemes', 'BasicAuth', 'Basic');
    expect(next.security).toEqual([{ Basic: [] }]);
    expect((next.paths!['/pets'].get as JsonObject).security).toEqual([
      { Basic: [], AnotherScheme: ['read'] },
    ]);
    expect(() => removeComponent(next, 'securitySchemes', 'Basic')).toThrow(
      'still in use',
    );
  });
  it('blocks duplicate/invalid names and deleting referenced components', () => {
    let doc = setComponent(emptyDocument(), 'schemas', 'Pet', {});
    doc = setComponent(doc, 'schemas', 'Other', {
      $ref: '#/components/schemas/Pet',
    });
    expect(() => renameComponent(doc, 'schemas', 'Pet', 'Other')).toThrow(
      'already exists',
    );
    expect(() =>
      renameComponent(doc, 'schemas', 'Pet', 'invalid name'),
    ).toThrow('Use letters');
    expect(() => removeComponent(doc, 'schemas', 'Pet')).toThrow(
      'still in use',
    );
    expect(
      getComponents(removeComponent(doc, 'schemas', 'Other'), 'schemas'),
    ).toEqual({ Pet: {} });
  });
});
