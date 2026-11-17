import { describe, it, expect, vi } from 'vitest';
import { importDefinition } from '../src/domain/import';
import { validateSpecification } from '../src/domain/validation';
describe('Swagger import conversion', () => {
  it('converts definitions, body parameters, responses and security without fetching', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch');
    const input = {
      swagger: '2.0',
      info: { title: 'Orders', version: '1.0.0' },
      host: 'api.example.com',
      basePath: '/v1',
      schemes: ['https'],
      consumes: ['application/json'],
      produces: ['application/json'],
      definitions: {
        Order: { type: 'object', properties: { id: { type: 'integer' } } },
      },
      securityDefinitions: {
        key: { type: 'apiKey', name: 'X-Key', in: 'header' },
      },
      security: [{ key: [] }],
      paths: {
        '/orders': {
          post: {
            parameters: [
              {
                name: 'body',
                in: 'body',
                required: true,
                schema: { $ref: '#/definitions/Order' },
              },
            ],
            responses: {
              '201': {
                description: 'Created',
                schema: { $ref: '#/definitions/Order' },
              },
            },
          },
        },
      },
    };
    const result = await importDefinition(JSON.stringify(input));
    expect(result.converted).toBe(true);
    expect(result.document.openapi).toBe('3.0.0');
    expect(result.document.servers).toEqual([
      { url: 'https://api.example.com/v1' },
    ]);
    expect(await validateSpecification(result.document)).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
    fetch.mockRestore();
  });
  it('preserves non-Swagger source comments', async () => {
    const source =
      'openapi: 3.1.0\ninfo: {title: Example, version: "1"}\n# Keep this\npaths: {}';
    expect((await importDefinition(source)).source).toBe(source);
  });
});
