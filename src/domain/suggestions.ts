import { listOperations, type ApiDocument, type Operation } from './document';

export const responseStatuses: Record<string, string> = {
  '200': 'OK',
  '201': 'Created',
  '202': 'Accepted',
  '204': 'No Content',
  '301': 'Moved Permanently',
  '302': 'Found',
  '304': 'Not Modified',
  '400': 'Bad Request',
  '401': 'Unauthorized',
  '403': 'Forbidden',
  '404': 'Not Found',
  '405': 'Method Not Allowed',
  '409': 'Conflict',
  '415': 'Unsupported Media Type',
  '422': 'Unprocessable Content',
  '429': 'Too Many Requests',
  '500': 'Internal Server Error',
  '502': 'Bad Gateway',
  '503': 'Service Unavailable',
  '2XX': 'Successful response',
  '4XX': 'Client error',
  '5XX': 'Server error',
  default: 'Unexpected error',
};

export function suggestOperationId(
  operation: Operation,
  document: ApiDocument,
) {
  const words = operation.path
    .split('/')
    .filter(Boolean)
    .map((part) => (part.startsWith('{') ? `by ${part.slice(1, -1)}` : part))
    .join(' ')
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean);
  const base =
    operation.method +
    words.map((word) => word[0].toUpperCase() + word.slice(1)).join('');
  const used = new Set(
    listOperations(document)
      .filter(
        (item) =>
          item.path !== operation.path || item.method !== operation.method,
      )
      .map((item) => item.value.operationId),
  );
  let suggestion = base;
  for (let index = 2; used.has(suggestion); index++)
    suggestion = `${base}${index}`;
  return suggestion;
}

export function suggestPaths(document: ApiDocument) {
  return [
    ...new Set(
      Object.keys(document.paths ?? {})
        .filter((path) => path.startsWith('/'))
        .flatMap((path) => [
          path,
          ...(path.includes('{') ? [] : [`${path.replace(/\/$/, '')}/{id}`]),
        ]),
    ),
  ].sort();
}
