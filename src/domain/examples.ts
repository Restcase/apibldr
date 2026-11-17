import petstore from '../examples/petstore.yaml?raw';
import streetlights from '../examples/streetlights.yaml?raw';
import { parseApi } from './document';
import type { Workspace } from './workspace';

export const examples = [
  {
    id: 'petstore',
    title: 'Swagger Petstore',
    specification: 'OpenAPI 3.1.0',
    description:
      'Explore 13 HTTP paths, 19 operations, reusable schemas, and authentication.',
    source: petstore,
  },
  {
    id: 'streetlights',
    title: 'Streetlights Kafka API',
    specification: 'AsyncAPI 2.6.0',
    description:
      'Explore four Kafka channels, messages, payload schemas, and secured brokers.',
    source: streetlights,
  },
] as const;
export type ExampleId = (typeof examples)[number]['id'];

export function exampleWorkspace(id: ExampleId = 'petstore'): Workspace {
  const example = examples.find((item) => item.id === id)!;
  return {
    document: parseApi(example.source),
    source: example.source,
    format: 'yaml',
    dirty: false,
  };
}
