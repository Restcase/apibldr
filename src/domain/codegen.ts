import { isObject, type ApiDocument, type JsonObject } from './document';
export function getGeneratorConfig(): { url: string; error?: string } {
  const value = import.meta.env.VITE_GENERATOR_URL?.trim();
  if (!value) return { url: '' };
  try {
    const url = new URL(value);
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    )
      throw new Error('Invalid generator URL');
    url.pathname = url.pathname.replace(/\/$/, '') + '/';
    return { url: url.href };
  } catch {
    return {
      url: '',
      error:
        'The code generation service is not configured correctly. Contact the site administrator, or export your definition to generate code elsewhere.',
    };
  }
}
export type GeneratorKind = 'clients' | 'servers';
async function request(
  path: string,
  init: RequestInit = {},
  signal?: AbortSignal,
) {
  const config = getGeneratorConfig();
  if (!config.url)
    throw new Error(
      config.error || 'Code generation is not enabled on this site.',
    );
  const response = await fetch(`${config.url}${path}`, { ...init, signal });
  if (!response.ok)
    throw new Error(
      `Generator returned HTTP ${response.status}. Retry or choose another target.`,
    );
  return response;
}
export async function loadGenerators(
  kind: GeneratorKind,
  signal?: AbortSignal,
): Promise<string[]> {
  const result: unknown = await (await request(kind, {}, signal)).json();
  if (!Array.isArray(result) || !result.every((v) => typeof v === 'string'))
    throw new Error('The generator returned an unreadable language list.');
  return result;
}
export async function loadGeneratorOptions(
  kind: GeneratorKind,
  language: string,
  signal?: AbortSignal,
): Promise<JsonObject> {
  const result: unknown = await (
    await request(`${kind}/${encodeURIComponent(language)}`, {}, signal)
  ).json();
  if (!isObject(result))
    throw new Error('The generator returned unreadable options.');
  return result;
}
export async function generateCode(
  doc: ApiDocument,
  kind: GeneratorKind,
  language: string,
  options: JsonObject,
  signal?: AbortSignal,
): Promise<Blob> {
  if (doc.asyncapi)
    throw new Error('This generator accepts OpenAPI documents.');
  const result: unknown = await (
    await request(
      `${kind}/${encodeURIComponent(language)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ openAPIUrl: '', options, spec: doc }),
      },
      signal,
    )
  ).json();
  if (!isObject(result) || typeof result.code !== 'string')
    throw new Error('The generator did not return a download code.');
  return (
    await request(
      `download/${encodeURIComponent(result.code)}`,
      { headers: { Accept: 'application/octet-stream' } },
      signal,
    )
  ).blob();
}
