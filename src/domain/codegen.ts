import { isObject, type ApiDocument, type JsonObject } from './document';
export const generatorUrl =
  'https://restcase-generator.azurewebsites.net/api/gen/';
export type GeneratorKind = 'clients' | 'servers';
async function request(
  path: string,
  init: RequestInit = {},
  signal?: AbortSignal,
) {
  const response = await fetch(`${generatorUrl}${path}`, { ...init, signal });
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
