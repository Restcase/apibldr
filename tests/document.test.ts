import { describe, expect, it } from 'vitest';
import {
  addOperation,
  checkDocument,
  emptyDocument,
  listOperations,
  parseApi,
  patchOperation,
  removeOperation,
  serializeApi,
  methods,
  maxDocumentSize,
} from '../src/domain/document';
import {
  createWorkspace,
  encodeWorkspace,
  historyReducer,
  restoreWorkspace,
} from '../src/domain/workspace';

const fixture = `openapi: 3.0.3
info:
  title: Existing API
  version: '1.0'
  x-owner: team-a
paths:
  /pets/{id}:
    x-route: pets
    parameters:
      - name: id
        in: path
        required: true
        schema:
          type: string
    get:
      operationId: getPet
      responses:
        '200':
          description: A pet
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Pet'
components:
  schemas:
    Pet:
      type: object
      properties:
        name:
          type: string
x-internal:
  release: 5
`;

describe('document round trips', () => {
  it.each(methods)('creates a usable %s operation', (method) => {
    const operation = listOperations(
      addOperation(emptyDocument(), '/items', method),
    )[0];
    expect(operation.method).toBe(method);
    expect(
      checkDocument(addOperation(emptyDocument(), '/items', method)),
    ).toEqual([]);
  });
  it('does not override the schema of an inherited path parameter', () => {
    const doc = parseApi(fixture.replace('type: string', 'type: integer'));
    const next = addOperation(doc, '/pets/{id}', 'delete');
    expect(
      listOperations(next).find((item) => item.method === 'delete')!.value
        .parameters,
    ).toBeUndefined();
    expect(next.paths!['/pets/{id}'].parameters).toEqual(
      doc.paths!['/pets/{id}'].parameters,
    );
  });
  it('preserves referenced path parameters without inventing overrides', () => {
    const doc = emptyDocument();
    doc.paths = {
      '/items/{id}': { parameters: [{ $ref: '#/components/parameters/id' }] },
    };
    expect(
      listOperations(addOperation(doc, '/items/{id}', 'get'))[0].value
        .parameters,
    ).toBeUndefined();
  });
  it('flags a response map containing only extensions', () => {
    const doc = addOperation(emptyDocument(), '/items', 'get');
    const changed = patchOperation(doc, listOperations(doc)[0], {
      responses: { 'x-note': 'No actual responses' },
    });
    expect(checkDocument(changed)).toContainEqual({
      location: 'GET /items',
      message: 'Define at least one response.',
    });
  });
  it.each([
    '/items/{}',
    '/items/{id',
    '/items/id}',
    'items',
    '/items?x=1',
    '/items#fragment',
    '/items with spaces',
  ])('rejects malformed new path %s', (path) => {
    expect(() => addOperation(emptyDocument(), path, 'get')).toThrow();
  });
  it('applies the document limit to UTF-8 bytes, not character count', () => {
    const source = `${fixture}\nx-note: ${'é'.repeat(maxDocumentSize / 2)}`;
    expect(source.length).toBeLessThan(maxDocumentSize);
    expect(() => parseApi(source)).toThrow('2 MB');
  });
  it('rejects cycles and non-finite values rather than changing them', () => {
    expect(() => parseApi(`${fixture}\nx-cycle: &cycle [*cycle]`)).toThrow();
    expect(() => parseApi(`${fixture}\nx-number: .inf`)).toThrow('finite');
  });
  it.each(['yaml', 'json'] as const)(
    'preserves definitions, references, and extensions through %s export',
    (format) => {
      const original = parseApi(fixture);
      const operation = listOperations(original)[0];
      const edited = patchOperation(original, operation, {
        summary: 'Fetch one pet',
      });
      const exported = parseApi(serializeApi(edited, format));
      expect(exported.components).toEqual(original.components);
      expect(exported['x-internal']).toEqual(original['x-internal']);
      expect(exported.info).toEqual(original.info);
      expect(exported.paths?.['/pets/{id}'].parameters).toEqual(
        original.paths?.['/pets/{id}'].parameters,
      );
      expect(listOperations(exported)[0].value.responses).toEqual(
        operation.value.responses,
      );
      expect(listOperations(original)[0].value.summary).toBeUndefined();
      expect(listOperations(exported)[0].value.summary).toBe('Fetch one pet');
    },
  );
  it('creates required path parameters and prevents overwriting an operation', () => {
    const doc = addOperation(emptyDocument(), '/pets/{id}', 'get');
    expect(listOperations(doc)[0].value.parameters).toEqual([
      { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
    ]);
    expect(() => addOperation(doc, '/pets/{id}', 'get')).toThrow(
      'already exists',
    );
  });
  it('preserves path-level fields when deleting the final operation', () => {
    const doc = parseApi(fixture);
    const next = removeOperation(doc, listOperations(doc)[0]);
    expect(listOperations(next)).toEqual([]);
    expect(next.paths?.['/pets/{id}']['x-route']).toBe('pets');
    expect(next.paths?.['/pets/{id}'].parameters).toEqual(
      doc.paths?.['/pets/{id}'].parameters,
    );
  });
  it.each([
    'null',
    '[]',
    'openapi: 3.1.0\ninfo: []',
    'openapi: 3.1.0\ninfo: {title: Test, version: 1}',
    `${fixture}\npaths: {}`,
    `${fixture.replace('    get:', '    get: null\n    other:')}`,
  ])(
    'rejects unsafe or malformed input without normalization: %s',
    (source) => {
      expect(() => parseApi(source)).toThrow();
    },
  );
  it('rejects unsupported dialects explicitly', () => {
    expect(() => parseApi('swagger: "2.0"')).toThrow('Swagger 2.0');
    expect(() => parseApi('asyncapi: "4.0.0"')).toThrow('AsyncAPI');
  });
  it('does not attempt to fetch external references', () => {
    const doc = parseApi(
      fixture.replace(
        '#/components/schemas/Pet',
        'https://example.invalid/pet.json',
      ),
    );
    expect(serializeApi(doc, 'yaml')).toContain(
      'https://example.invalid/pet.json',
    );
  });
  it('reports response and duplicate operation ID problems', () => {
    const doc = parseApi(fixture);
    doc.paths!['/other'] = {
      get: { operationId: 'getPet', responses: { '999': {} } },
    };
    expect(checkDocument(doc).map((item) => item.message)).toEqual(
      expect.arrayContaining([
        'Response 999 needs an HTTP status code, range, or "default".',
        'Response 999 needs a description or a reference.',
        'The operation ID "getPet" is already used.',
      ]),
    );
  });
});

describe('draft recovery and undo', () => {
  it('bounds history and clears redo when branching', () => {
    let state = {
      past: [] as ReturnType<typeof createWorkspace>[],
      present: createWorkspace(),
      future: [] as ReturnType<typeof createWorkspace>[],
    };
    for (let i = 0; i < 35; i++)
      state = historyReducer(state, {
        type: 'commit',
        workspace: createWorkspace({
          ...emptyDocument(),
          info: { title: String(i), version: '1' },
        }),
      });
    expect(state.past).toHaveLength(30);
    state = historyReducer(state, { type: 'undo' });
    expect(state.present.document.info.title).toBe('33');
    state = historyReducer(state, {
      type: 'commit',
      workspace: createWorkspace(),
    });
    expect(historyReducer(state, { type: 'redo' })).toBe(state);
  });
  it('preserves source comments and detects mismatched saved source', () => {
    const document = parseApi(fixture);
    const workspace = {
      ...createWorkspace(document),
      source: `# Keep this comment\n${fixture}`,
    };
    expect(restoreWorkspace(encodeWorkspace(workspace))).toEqual(workspace);
    expect(
      restoreWorkspace(
        encodeWorkspace({ ...workspace, source: 'info: [broken' }),
      ).dirty,
    ).toBe(true);
  });
  it('recovers invalid source independently from the last applied document', () => {
    const workspace = {
      ...createWorkspace(parseApi(fixture)),
      source: 'info: [unfinished',
      dirty: true,
    };
    expect(restoreWorkspace(encodeWorkspace(workspace))).toEqual(workspace);
  });
  it('restores a replaced document and its unfinished source with undo/redo', () => {
    const previous = {
      ...createWorkspace(parseApi(fixture)),
      source: 'invalid: [',
      dirty: true,
    };
    const replacement = createWorkspace();
    const state = historyReducer(
      { past: [], present: previous, future: [] },
      { type: 'commit', workspace: replacement },
    );
    const undone = historyReducer(state, { type: 'undo' });
    expect(undone.present).toEqual(previous);
    expect(historyReducer(undone, { type: 'redo' }).present).toEqual(
      replacement,
    );
  });
  it('does not silently accept corrupted saved data', () => {
    expect(() => restoreWorkspace('{"version":1,"workspace":{}}')).toThrow();
    expect(() => restoreWorkspace('{"version":2}')).toThrow();
  });
});
