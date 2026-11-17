import { describe, expect, it } from 'vitest';
import {
  graphChildren,
  graphNode,
  graphPointer,
  graphReference,
} from '../src/domain/graph';
import { emptyDocument } from '../src/domain/document';
import { exampleWorkspace } from '../src/domain/examples';

describe('API graph structure', () => {
  it('follows Petstore paths, operations, response schemas and reusable models without changing the API', () => {
    const doc = exampleWorkspace().document;
    const before = JSON.stringify(doc);
    expect(
      graphChildren(doc, graphNode(doc)!).filter(
        (node) => node.kind === 'Path',
      ),
    ).toHaveLength(13);
    const path = graphNode(doc, graphPointer(['paths', '/pet']))!;
    expect(graphChildren(doc, path).map((node) => node.label)).toEqual([
      'POST /pet',
      'PUT /pet',
    ]);
    const schema = graphNode(
      doc,
      graphPointer([
        'paths',
        '/pet',
        'put',
        'responses',
        '200',
        'content',
        'application/json',
        'schema',
      ]),
    )!;
    const pet = graphReference(doc, schema).node!;
    expect(pet.target).toEqual({
      kind: 'component',
      category: 'schemas',
      name: 'Pet',
    });
    expect(graphChildren(doc, pet).map((node) => node.label)).toContain(
      'Properties',
    );
    expect(JSON.stringify(doc)).toBe(before);
  });
  it('follows AsyncAPI 2.6 operations through messages, payloads and traits', () => {
    const doc = exampleWorkspace('streetlights').document;
    const channel = graphChildren(doc, graphNode(doc)!).find(
      (node) => node.kind === 'Channel',
    )!;
    const operation = graphChildren(doc, channel).find(
      (node) => node.kind === 'Operation',
    )!;
    expect(operation.label).toContain('PUBLISH');
    const message = graphChildren(doc, operation).find(
      (node) => node.label === 'Message',
    )!;
    const resolved = graphReference(doc, message).node!;
    expect(resolved.label).toBe('lightMeasured');
    expect(graphChildren(doc, resolved).map((node) => node.label)).toContain(
      'Payload',
    );
  });
  it('maps AsyncAPI 3 operations to escaped channel references and keeps unlinked operations reachable', () => {
    const doc = emptyDocument('asyncapi:3.1.0');
    doc.channels = {
      'orders/new~event': { address: 'orders.new', messages: {} },
    };
    doc.operations = {
      send: {
        action: 'send',
        channel: { $ref: '#/channels/orders~1new~0event' },
      },
      orphan: { action: 'receive', channel: { $ref: '#/channels/missing' } },
    };
    const channel = graphNode(
      doc,
      graphPointer(['channels', 'orders/new~event']),
    )!;
    expect(graphChildren(doc, channel).map((node) => node.label)).toContain(
      'SEND send',
    );
    expect(graphChildren(doc, graphNode(doc, '#/operations')!)).toHaveLength(2);
    expect(graphNode(doc, '#/operations/send')?.target).toEqual({
      kind: 'channel',
      name: 'orders/new~event',
    });
  });
  it('handles cycles, missing and external references without fetching or expanding recursively', () => {
    const doc = emptyDocument();
    doc.components = {
      schemas: {
        Tree: {
          type: 'object',
          properties: { child: { $ref: '#/components/schemas/Tree' } },
        },
        missing: { $ref: '#/components/schemas/Gone' },
        external: { $ref: 'https://example.com/schema.json' },
        allowed: true,
      },
    };
    const child = graphNode(doc, '#/components/schemas/Tree/properties/child')!;
    expect(graphChildren(doc, child).map((node) => node.id)).toEqual([
      '#/components/schemas/Tree',
    ]);
    expect(
      graphReference(doc, graphNode(doc, '#/components/schemas/missing')!)
        .warning,
    ).toContain('could not be resolved');
    expect(
      graphReference(doc, graphNode(doc, '#/components/schemas/external')!)
        .warning,
    ).toContain('not fetched');
    expect(graphNode(doc, '#/components/schemas/allowed')?.value).toBe(true);
    expect(graphNode(doc, '#/components/%XX')).toBeUndefined();
  });
});
