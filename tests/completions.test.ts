import { describe, expect, it } from 'vitest';
import { EditorState } from '@codemirror/state';
import { CompletionContext } from '@codemirror/autocomplete';
import { yaml } from '@codemirror/lang-yaml';
import { json } from '@codemirror/lang-json';
import { parse } from 'yaml';
import { openApiCompletions } from '../src/editor/completions';
import { suggestOperationId, suggestPaths } from '../src/domain/suggestions';
import {
  addOperation,
  listOperations,
  parseApi,
  type Format,
} from '../src/domain/document';

function complete(marked: string, format: Format = 'yaml', readOnly = false) {
  const pos = marked.indexOf('|');
  const source = marked.replace('|', '');
  const state = EditorState.create({
    doc: source,
    extensions: [
      format === 'json' ? json() : yaml(),
      EditorState.readOnly.of(readOnly),
    ],
  });
  const result = openApiCompletions(format)(
    new CompletionContext(state, pos, true),
  );
  return {
    labels: result?.options.map((option) => option.label) ?? [],
    apply(label: string) {
      const option = result?.options.find((option) => option.label === label);
      expect(option, `Missing completion ${label}`).toBeDefined();
      return (
        source.slice(0, result!.from) +
        option!.apply +
        source.slice(result!.to!)
      );
    },
  };
}

describe('OpenAPI source completion', () => {
  it('uses YAML nesting, omits existing keys and preserves adjacent text', () => {
    const result = complete(
      'openapi: 3.1.0\ninfo:\n  title: Example\n  ver|\npaths: {}',
    );
    expect(result.labels).toEqual(['version']);
    expect(result.apply('version')).toContain('  version: \npaths: {}');
    expect(complete('info:\n  title: Example\n  |').labels).not.toContain(
      'title',
    );
    expect(complete('paths:\n  /pets:\n    get:\n      res|').labels).toEqual([
      'responses',
    ]);
  });
  it('replaces JSON quoted keys without duplicating quotes or colons', () => {
    const result = complete('{"info":{"title":"Pets","ver|":"1.0"}}', 'json');
    expect(JSON.parse(result.apply('version')).info.version).toBe('1.0');
    expect(complete('{"info":{"|"}}', 'json').apply('title')).toBe(
      '{"info":{"title": }}',
    );
    expect(complete('{"info":{ver|}}', 'json').apply('version')).toBe(
      '{"info":{"version": }}',
    );
  });
  it('suggests schema keys inside arrays and component property maps', () => {
    expect(
      complete(
        'components:\n  schemas:\n    Pet:\n      properties:\n        name:\n          ty|',
      ).labels,
    ).toContain('type');
    expect(
      complete('components:\n  schemas:\n    Pet:\n      allOf:\n        - |')
        .labels,
    ).toContain('$ref');
    expect(
      complete('{"paths":{"/pets":{"get":{"parameters":[{"|"}]}}}}', 'json')
        .labels,
    ).toContain('in');
  });
  it('suggests type, format, security and parameter values by context', () => {
    expect(
      complete('components:\n  schemas:\n    Pet:\n      type: in|').labels,
    ).toEqual(['integer']);
    expect(
      complete(
        'components:\n  schemas:\n    Pet:\n      type: integer\n      format: |',
      ).labels,
    ).toEqual(['int32', 'int64']);
    expect(
      complete('components:\n  securitySchemes:\n    Key:\n      type: |')
        .labels,
    ).toContain('apiKey');
    expect(
      complete('paths:\n  /pets:\n    get:\n      parameters:\n        - in: |')
        .labels,
    ).toContain('query');
    expect(
      complete('components:\n  securitySchemes:\n    Key:\n      in: |').labels,
    ).not.toContain('path');
  });
  it('inserts booleans as booleans and YAML null type as a string', () => {
    const result = complete(
      'components:\n  schemas:\n    Pet:\n      readOnly: "tr|"',
    );
    expect(parse(result.apply('true')).components.schemas.Pet.readOnly).toBe(
      true,
    );
    const type = complete('components:\n  schemas:\n    Pet:\n      type: nu|');
    expect(parse(type.apply('null')).components.schemas.Pet.type).toBe('null');
  });
  it('respects OpenAPI 3.0 versus 3.1 vocabulary', () => {
    expect(
      complete('openapi: 3.0.3\ncomponents:\n  schemas:\n    Pet:\n      |')
        .labels,
    ).toContain('nullable');
    expect(
      complete('openapi: 3.1.0\ncomponents:\n  schemas:\n    Pet:\n      |')
        .labels,
    ).not.toContain('nullable');
    expect(complete('openapi: 3.0.3\n|').labels).not.toContain('webhooks');
    expect(complete('openapi: 3.1.0\n|').labels).toContain('webhooks');
  });
  it('suggests response codes with safe quoting and media types', () => {
    expect(
      complete(
        'paths:\n  /pets:\n    get:\n      responses:\n        40|',
      ).apply('404'),
    ).toContain('        "404": ');
    expect(
      complete(
        'paths:\n  /pets:\n    get:\n      responses:\n        "200": {}\n        |',
      ).labels,
    ).not.toContain('200');
    expect(
      complete(
        'paths:\n  /pets:\n    get:\n      responses:\n        "200":\n          content:\n            app|',
      ).labels,
    ).toContain('application/json');
  });
  it('suggests only matching local component refs, with JSON Pointer escaping', () => {
    const result = complete(
      'components:\n  schemas:\n    Pet: {}\n    "Pet/Detail~": {}\n  responses:\n    NotFound: {}\npaths:\n  /pets:\n    get:\n      responses:\n        "200":\n          content:\n            application/json:\n              schema:\n                $ref: "#/components/schemas/P|"',
    );
    expect(result.labels).toEqual([
      '#/components/schemas/Pet',
      '#/components/schemas/Pet~1Detail~0',
    ]);
    expect(result.apply('#/components/schemas/Pet')).toContain(
      '$ref: "#/components/schemas/Pet"',
    );
    const unquoted = complete(
      'components:\n  schemas:\n    Pet: {}\n    Other:\n      $ref: |',
    );
    expect(
      parse(unquoted.apply('#/components/schemas/Pet')).components.schemas.Other
        .$ref,
    ).toBe('#/components/schemas/Pet');
  });
  it('does not autocomplete descriptions, examples, comments or read-only editors', () => {
    for (const source of [
      'info:\n  description: ver|',
      'info:\n  description: >\n    ver|',
      '# ver|',
      'info:\n  title: Pets # ver|',
      'components:\n  schemas:\n    Pet:\n      example:\n        ty|',
    ]) {
      expect(complete(source).labels, source).toEqual([]);
    }
    expect(complete('info:\n  ver|', 'yaml', true).labels).toEqual([]);
    expect(complete('{"info":{"description":"ver|"}}', 'json').labels).toEqual(
      [],
    );
  });
});

describe('form suggestions', () => {
  it('reuses paths and proposes parameterized paths without duplicate suffixes', () => {
    const doc = parseApi(
      'openapi: 3.1.0\ninfo: {title: Pets, version: "1"}\npaths: {"/pets": {}, "/pets/{id}": {}}',
    );
    expect(suggestPaths(doc)).toEqual(['/pets', '/pets/{id}']);
  });
  it('suggests unique operation IDs without changing the document', () => {
    let doc = parseApi(
      'openapi: 3.1.0\ninfo: {title: Pets, version: "1"}\npaths: {}',
    );
    doc = addOperation(doc, '/pets/{id}', 'get');
    doc = addOperation(doc, '/other', 'get');
    doc.paths!['/other'] = {
      get: { operationId: 'getPetsById', responses: {} },
    };
    const operation = listOperations(doc).find(
      (item) => item.path === '/pets/{id}',
    )!;
    expect(suggestOperationId(operation, doc)).toBe('getPetsById2');
    expect(operation.value.operationId).toBeUndefined();
  });
});

describe('AsyncAPI source completion', () => {
  it('offers version-specific channel and operation fields', () => {
    const two = complete('asyncapi: 2.6.0\nchannels:\n  orders:\n    |').labels;
    expect(two).toContain('publish');
    expect(two).not.toContain('address');
    const three = complete(
      'asyncapi: 3.0.0\nchannels:\n  orders:\n    |',
    ).labels;
    expect(three).toContain('address');
    expect(three).not.toContain('publish');
    expect(
      complete('asyncapi: 3.0.0\noperations:\n  receiveOrder:\n    action: |')
        .labels,
    ).toEqual(['send', 'receive']);
  });
  it('suggests reusable messages and broker protocols', () => {
    expect(
      complete('asyncapi: 2.6.0\nservers:\n  production:\n    protocol: ka|')
        .labels,
    ).toEqual(['kafka', 'kafka-secure']);
    expect(
      complete(
        'asyncapi: 2.6.0\ncomponents:\n  messages:\n    Order: {}\nchannels:\n  orders:\n    publish:\n      message:\n        $ref: |',
      ).labels,
    ).toContain('#/components/messages/Order');
  });
});
