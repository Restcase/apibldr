import { describe, it, expect } from 'vitest';
import { emptyDocument, parseApi, serializeApi } from '../src/domain/document';
import {
  addChannel,
  addAsyncOperation,
  channelOperations,
  patchAsyncOperation,
  removeChannel,
} from '../src/domain/asyncapi';
import {
  asyncComponentCategories,
  catalogFor,
  setComponent,
} from '../src/domain/components';
import { validateSpecification } from '../src/domain/validation';
import {
  createWorkspace,
  encodeWorkspace,
  restoreWorkspace,
} from '../src/domain/workspace';
describe('AsyncAPI workflows', () => {
  for (const version of [
    '2.0.0',
    '2.1.0',
    '2.2.0',
    '2.3.0',
    '2.4.0',
    '2.5.0',
    '2.6.0',
    '3.0.0',
    '3.1.0',
  ])
    it(`creates, edits, validates and round trips ${version}`, async () => {
      let doc = emptyDocument(`asyncapi:${version}`);
      doc = addChannel(doc, 'orders/{id}');
      doc = addAsyncOperation(
        doc,
        'orders/{id}',
        version.startsWith('3') ? 'receive' : 'publish',
      );
      const [key, op] = channelOperations(doc, 'orders/{id}')[0];
      doc = patchAsyncOperation(doc, 'orders/{id}', key, {
        ...op,
        summary: 'Order event',
        'x-custom': true,
      });
      expect(() => removeChannel(doc, 'orders/{id}')).toThrow(
        'operations first',
      );
      for (const format of ['yaml', 'json'] as const)
        expect(parseApi(serializeApi(doc, format))).toEqual(doc);
      expect(
        restoreWorkspace(encodeWorkspace(createWorkspace(doc))).document,
      ).toEqual(doc);
      expect(await validateSpecification(doc)).toEqual([]);
      doc = patchAsyncOperation(doc, 'orders/{id}', key, null);
      expect(removeChannel(doc, 'orders/{id}').channels).toEqual({});
    });
  for (const version of ['2.0.0', '2.6.0', '3.0.0', '3.1.0'])
    it(`validates all quick-add categories for ${version}`, async () => {
      let doc = emptyDocument(`asyncapi:${version}`);
      for (const category of asyncComponentCategories)
        for (const preset of catalogFor(doc, category).presets)
          doc = setComponent(doc, category, preset.name, preset.value);
      expect(await validateSpecification(doc)).toEqual([]);
    });
  it('rejects duplicate channels and mixed document families', () => {
    const doc = addChannel(emptyDocument('asyncapi:2.6.0'), 'orders');
    expect(() => addChannel(doc, 'orders')).toThrow('already exists');
    expect(() =>
      parseApi(JSON.stringify({ ...doc, openapi: '3.1.0' })),
    ).toThrow('not both');
  });
  it('reports invalid structure and unresolved references without fetching', async () => {
    const doc = emptyDocument('asyncapi:3.0.0');
    doc.servers = { broken: { protocol: 'kafka' } };
    doc.channels = { orders: { $ref: '#/components/channels/missing' } };
    const issues = await validateSpecification(doc);
    expect(issues.some((i) => i.message.includes('host'))).toBe(true);
    expect(issues.some((i) => i.message.includes('Unresolved'))).toBe(true);
  });
  for (const version of ['3.0.3', '3.1.0'])
    it(`validates OpenAPI ${version}`, async () => {
      expect(
        await validateSpecification(emptyDocument(`openapi:${version}`)),
      ).toEqual([]);
    });
});

it('does not accept malformed AsyncAPI operation maps', () => {
  expect(() =>
    parseApi(
      JSON.stringify({
        ...emptyDocument('asyncapi:3.0.0'),
        operations: { broken: null },
      }),
    ),
  ).toThrow('operations.broken');
});
