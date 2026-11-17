import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import {
  generateCode,
  loadGenerators,
  loadGeneratorOptions,
  getGeneratorConfig,
} from '../src/domain/codegen';
import { emptyDocument } from '../src/domain/document';
const generatorUrl = 'https://generator.example.com/api/gen/';
beforeEach(() => vi.stubEnv('VITE_GENERATOR_URL', generatorUrl));
afterEach(() => vi.unstubAllEnvs());
describe('Code generation service', () => {
  it('makes no requests when no service is configured', async () => {
    vi.stubEnv('VITE_GENERATOR_URL', '');
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    expect(getGeneratorConfig().url).toBe('');
    await expect(loadGenerators('clients')).rejects.toThrow('not enabled');
    await expect(
      generateCode(emptyDocument(), 'clients', 'java', {}),
    ).rejects.toThrow('not enabled');
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each([
    'not-a-url',
    'http://generator.example.com/',
    'https://user:password@generator.example.com/',
    'https://generator.example.com/?token=secret',
    'https://generator.example.com/#secret',
    '/api/gen/',
  ])(
    'rejects unsafe or invalid configuration without a request: %s',
    async (url) => {
      vi.stubEnv('VITE_GENERATOR_URL', url);
      const fetch = vi.fn();
      vi.stubGlobal('fetch', fetch);
      await expect(loadGenerators('clients')).rejects.toThrow(
        'not configured correctly',
      );
      expect(getGeneratorConfig().url).toBe('');
      expect(fetch).not.toHaveBeenCalled();
    },
  );
  it('normalizes the configured base path', () => {
    vi.stubEnv(
      'VITE_GENERATOR_URL',
      '  https://generator.example.com/api/gen  ',
    );
    expect(getGeneratorConfig().url).toBe(generatorUrl);
  });
  it('loads targets and options, posts the selected options and downloads the archive', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(['typescript-fetch'])))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ packageName: { default: 'client' } })),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ code: 'archive-id' })),
      )
      .mockResolvedValueOnce(new Response('zip-data'));
    vi.stubGlobal('fetch', fetch);
    expect(await loadGenerators('clients')).toEqual(['typescript-fetch']);
    expect(
      await loadGeneratorOptions('clients', 'typescript-fetch'),
    ).toHaveProperty('packageName');
    const doc = emptyDocument();
    await generateCode(doc, 'clients', 'typescript-fetch', {
      packageName: 'orders',
    });
    expect(JSON.parse(fetch.mock.calls[2][1].body)).toEqual({
      openAPIUrl: '',
      spec: doc,
      options: { packageName: 'orders' },
    });
    expect(fetch.mock.calls[3][0]).toBe(generatorUrl + 'download/archive-id');
  });
  it('surfaces service errors and rejects AsyncAPI before uploading', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('', { status: 503 }));
    vi.stubGlobal('fetch', fetch);
    await expect(loadGenerators('servers')).rejects.toThrow('503');
    fetch.mockClear();
    await expect(
      generateCode(emptyDocument('asyncapi:2.6.0'), 'clients', 'java', {}),
    ).rejects.toThrow('OpenAPI');
    expect(fetch).not.toHaveBeenCalled();
  });
});
