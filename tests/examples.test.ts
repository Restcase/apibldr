import { expect, it } from 'vitest';
import { examples, exampleWorkspace } from '../src/domain/examples';
import { checkDocument } from '../src/domain/document';
import { validateSpecification } from '../src/domain/validation';

it.each(examples)(
  'bundles a valid $title example with resolved local references',
  async ({ id }) => {
    const workspace = exampleWorkspace(id);
    expect(checkDocument(workspace.document)).toEqual([]);
    expect(await validateSpecification(workspace.document)).toEqual([]);
    expect(workspace.dirty).toBe(false);
  },
);
it('pins the requested versions and returns independent editable documents', () => {
  const petstore = exampleWorkspace();
  expect(petstore.document.openapi).toBe('3.1.0');
  expect(petstore.document.info.version).toBe('1.0.12');
  expect(Object.keys(petstore.document.paths!)).toHaveLength(13);
  const streetlights = exampleWorkspace('streetlights');
  expect(streetlights.document.asyncapi).toBe('2.6.0');
  expect(Object.keys(streetlights.document.channels!)).toHaveLength(4);
  petstore.document.info.title = 'Edited';
  expect(exampleWorkspace().document.info.title).toBe(
    'Swagger Petstore - OpenAPI 3.1',
  );
});
it('still rejects invalid OpenAPI 3.1 schema shapes and invalid document fields', async () => {
  const doc = exampleWorkspace().document;
  doc.components = {
    schemas: { Allowed: true, Forbidden: false, Invalid: 42 },
  };
  const issues = await validateSpecification(doc);
  expect(issues).toContainEqual(
    expect.objectContaining({ location: '/components/schemas/Invalid' }),
  );
  expect(
    issues.some((issue) =>
      ['/components/schemas/Allowed', '/components/schemas/Forbidden'].includes(
        issue.location,
      ),
    ),
  ).toBe(false);
});
