import { it, expect } from 'vitest';
import { inferSchema } from '../src/domain/infer-schema';
it('infers nested objects and heterogeneous arrays without assuming required fields', () => {
  expect(
    inferSchema({ id: 1, tags: ['new', null], meta: { active: true } }),
  ).toEqual({
    type: 'object',
    properties: {
      id: { type: 'integer' },
      tags: {
        type: 'array',
        items: { anyOf: [{ type: 'string' }, { type: 'null' }] },
      },
      meta: { type: 'object', properties: { active: { type: 'boolean' } } },
    },
  });
  expect(inferSchema([])).toEqual({ type: 'array', items: {} });
  expect(inferSchema(null, true)).toEqual({ nullable: true });
});
