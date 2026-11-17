import { maxDocumentSize } from './document';

export async function readDefinitionUrl(
  input: string,
  signal?: AbortSignal,
): Promise<string> {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    throw new Error('Enter a complete HTTP or HTTPS URL.');
  }
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password
  )
    throw new Error('Use an HTTP or HTTPS URL without embedded credentials.');
  const controller = new AbortController();
  let timedOut = false;
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  if (signal?.aborted) controller.abort();
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, 30000);
  try {
    let response: Response;
    try {
      response = await fetch(url.href, {
        signal: controller.signal,
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        mode: 'cors',
        headers: {
          Accept: 'application/json, application/yaml, text/yaml, text/plain',
        },
      });
    } catch (error) {
      if (controller.signal.aborted) throw error;
      throw new Error(
        'Could not download the definition. Check the URL and browser access (CORS), or download the file and import it.',
      );
    }
    if (!response.ok)
      throw new Error(
        `The server returned HTTP ${response.status}. Check the URL or import a downloaded file.`,
      );
    if (Number(response.headers.get('content-length')) > maxDocumentSize) {
      await response.body?.cancel();
      throw new Error('This document exceeds the 2 MB editor limit.');
    }
    if (!response.body) {
      const source = await response.text();
      if (new TextEncoder().encode(source).byteLength > maxDocumentSize)
        throw new Error('This document exceeds the 2 MB editor limit.');
      return source;
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let bytes = 0,
      source = '';
    try {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        bytes += chunk.value.byteLength;
        if (bytes > maxDocumentSize) {
          await reader.cancel();
          throw new Error('This document exceeds the 2 MB editor limit.');
        }
        source += decoder.decode(chunk.value, { stream: true });
      }
      return source + decoder.decode();
    } finally {
      reader.releaseLock();
    }
  } catch (error) {
    if (timedOut)
      throw new Error(
        'The download timed out. Retry or import a downloaded file.',
      );
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}
