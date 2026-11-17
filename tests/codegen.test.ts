import { describe, it, expect, vi } from 'vitest';
import {
  generateCode,
  loadGenerators,
  loadGeneratorOptions,
  generatorUrl,
} from '../src/domain/codegen';
import { emptyDocument } from '../src/domain/document';
describe('Code generation service', () => {
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
