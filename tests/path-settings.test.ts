import { it, expect } from 'vitest';
import { renamePath } from '../src/components/PathSettings';
import { emptyDocument } from '../src/domain/document';
it('renames an entire path and repairs operation references without altering examples', () => {
  const doc = {
    ...emptyDocument(),
    paths: {
      '/old': {
        summary: 'Shared',
        get: { responses: { '200': { description: 'OK' } } },
      },
    },
    components: {
      links: { next: { operationRef: '#/paths/~1old/get' } },
      examples: { sample: { value: { operationRef: '#/paths/~1old/get' } } },
    },
  };
  const next = renamePath(doc, '/old', '/new');
  expect(next.paths?.['/new']).toEqual(doc.paths['/old']);
  expect(next.paths?.['/old']).toBeUndefined();
  expect(next.components).toEqual({
    links: { next: { operationRef: '#/paths/~1new/get' } },
    examples: { sample: { value: { operationRef: '#/paths/~1old/get' } } },
  });
});

import { clonePath } from '../src/components/PathSettings';
it('copies all path methods without duplicate operation IDs', () => {
  const doc = {
    ...emptyDocument(),
    paths: {
      '/old': {
        summary: 'Shared',
        get: {
          operationId: 'listItems',
          responses: { '200': { description: 'OK' } },
        },
        post: {
          operationId: 'createItem',
          responses: { '201': { description: 'Created' } },
        },
      },
    },
  };
  const next = clonePath(doc, '/old', '/new');
  expect(next.paths?.['/old']).toEqual(doc.paths['/old']);
  expect(next.paths?.['/new'].get).toMatchObject({
    operationId: 'listItemsCopy',
  });
  expect(next.paths?.['/new'].post).toMatchObject({
    operationId: 'createItemCopy',
  });
  expect(() => clonePath(doc, '/old', '/old')).toThrow('unused');
});
