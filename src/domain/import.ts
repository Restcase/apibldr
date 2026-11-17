import { parseDocument } from 'yaml';
import {
  isObject,
  parseApi,
  serializeApi,
  maxDocumentSize,
  type ApiDocument,
  type Format,
} from './document';
export async function importDefinition(source: string): Promise<{
  document: ApiDocument;
  source: string;
  format: Format;
  converted: boolean;
}> {
  const format: Format = source.trimStart().startsWith('{') ? 'json' : 'yaml';
  if (new TextEncoder().encode(source).byteLength > maxDocumentSize)
    throw new Error('This document exceeds the 2 MB editor limit.');
  const parsed = parseDocument(source, { uniqueKeys: true, schema: 'core' });
  if (parsed.errors.length) throw new Error(parsed.errors[0].message);
  const raw: unknown = parsed.toJS({ maxAliasCount: 50 });
  if (!isObject(raw) || raw.swagger !== '2.0')
    return { document: parseApi(source), source, format, converted: false };
  const converter = await import('swagger2openapi');
  const result = await converter.convertObj(raw, {
    resolve: false,
    patch: false,
    warnOnly: false,
  });
  const document = parseApi(JSON.stringify(result.openapi));
  return {
    document,
    source: serializeApi(document, format),
    format,
    converted: true,
  };
}
