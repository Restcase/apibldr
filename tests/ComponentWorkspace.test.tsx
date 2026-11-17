import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import ComponentWorkspace from '../src/components/ComponentWorkspace';
import {
  componentCategories,
  componentCatalog,
  type ComponentCategory,
} from '../src/domain/components';
import { emptyDocument, type ApiDocument } from '../src/domain/document';

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
  };
});
function Harness({
  category,
  initial = emptyDocument(),
}: {
  category: ComponentCategory;
  initial?: ApiDocument;
}) {
  const [document, setDocument] = useState(initial);
  return (
    <>
      <ComponentWorkspace
        category={category}
        document={document}
        onChange={setDocument}
      />
      <output data-testid="definition">{JSON.stringify(document)}</output>
    </>
  );
}
const saved = () => JSON.parse(screen.getByTestId('definition').textContent!);

describe('visual components', () => {
  it('repairs imported reusable path parameters without changing references', async () => {
    const user = userEvent.setup();
    render(
      <Harness
        category="parameters"
        initial={{
          ...emptyDocument(),
          paths: {
            '/items/{id}': {
              parameters: [{ $ref: '#/components/parameters/id' }],
            },
          },
          components: {
            parameters: {
              id: {
                name: 'id',
                in: 'path',
                required: false,
                schema: { type: 'string' },
              },
            },
          },
        }}
      />,
    );
    await user.click(screen.getByLabelText('Required parameter'));
    expect(saved().components.parameters.id.required).toBe(true);
    expect(saved().paths['/items/{id}'].parameters).toEqual([
      { $ref: '#/components/parameters/id' },
    ]);
  });
  it.each(componentCategories)(
    'keeps %s creation in Designer with guidance and quick adds',
    async (category) => {
      const user = userEvent.setup();
      render(<Harness category={category} />);
      expect(
        screen.getByRole('heading', { name: componentCatalog[category].title }),
      ).toBeInTheDocument();
      expect(
        screen.getByText(componentCatalog[category].usage),
      ).toBeInTheDocument();
      const preset = componentCatalog[category].presets[0];
      await user.click(screen.getByRole('button', { name: preset.label }));
      expect(screen.getByLabelText('Component name')).toHaveValue(preset.name);
      expect(saved().components[category][preset.name]).toEqual(preset.value);
      await user.click(screen.getByRole('button', { name: preset.label }));
      expect(screen.getByLabelText('Component name')).toHaveValue(
        `${preset.name}2`,
      );
    },
  );
  it('edits API key and OAuth fields while preserving extensions', async () => {
    const user = userEvent.setup();
    render(<Harness category="securitySchemes" />);
    await user.click(screen.getByRole('button', { name: 'API key' }));
    await user.clear(screen.getByLabelText('API key name'));
    await user.type(screen.getByLabelText('API key name'), 'X-Client-Key');
    await user.selectOptions(
      screen.getByLabelText('API key location'),
      'query',
    );
    expect(saved().components.securitySchemes.ApiKeyAuth).toMatchObject({
      name: 'X-Client-Key',
      in: 'query',
    });
    await user.selectOptions(
      screen.getByLabelText('Authentication type'),
      'oauth2',
    );
    expect(saved().components.securitySchemes.ApiKeyAuth.name).toBeUndefined();
    expect(screen.getByLabelText('Authorization URL')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Scope name'), 'read:orders');
    await user.type(screen.getByLabelText('Scope description'), 'Read orders');
    await user.click(screen.getByRole('button', { name: 'Add scope' }));
    expect(
      saved().components.securitySchemes.ApiKeyAuth.flows.authorizationCode
        .scopes,
    ).toEqual({ 'read:orders': 'Read orders' });
  });
  it('adds properties, required flags, and schema types without dropping imported fields', async () => {
    const user = userEvent.setup();
    render(
      <Harness
        category="schemas"
        initial={{
          ...emptyDocument(),
          components: {
            schemas: {
              Pet: {
                type: 'object',
                properties: { id: { type: 'integer', minimum: 1 } },
                'x-keep': true,
              },
            },
          },
        }}
      />,
    );
    await user.selectOptions(screen.getByLabelText('id type'), 'number');
    expect(saved().components.schemas.Pet.properties.id).toEqual({
      type: 'number',
      minimum: 1,
    });
    await user.type(screen.getByLabelText('Property name'), 'name');
    await user.click(screen.getByRole('button', { name: 'Add property' }));
    await user.click(screen.getByLabelText('name required'));
    expect(saved().components.schemas.Pet.required).toEqual(['name']);
    expect(saved().components.schemas.Pet['x-keep']).toBe(true);
  });
  it('renames, duplicates, filters, and removes definitions', async () => {
    const user = userEvent.setup();
    render(<Harness category="schemas" />);
    await user.click(screen.getByRole('button', { name: 'Object model' }));
    await user.clear(screen.getByLabelText('Component name'));
    await user.type(screen.getByLabelText('Component name'), 'Order');
    await user.click(screen.getByRole('button', { name: 'Rename' }));
    expect(saved().components.schemas.Order).toBeDefined();
    await user.click(screen.getByRole('button', { name: 'Duplicate' }));
    expect(screen.getByLabelText('Component name')).toHaveValue('OrderCopy');
    await user.type(screen.getByLabelText('Find a component'), 'missing');
    expect(screen.getByText(/No matching definitions/)).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: 'Clear component search' }),
    );
    await user.click(screen.getByRole('button', { name: 'Remove schema' }));
    expect(saved().components.schemas.OrderCopy).toBeUndefined();
    expect(saved().components.schemas.Order).toBeDefined();
  });
  it('retains malformed advanced JSON, applies valid changes, and cancels explicitly', async () => {
    const user = userEvent.setup();
    render(<Harness category="examples" />);
    await user.click(screen.getByRole('button', { name: 'JSON example' }));
    await user.click(screen.getByRole('button', { name: 'Advanced JSON' }));
    fireEvent.change(screen.getByLabelText('Component JSON'), {
      target: { value: '{ broken' },
    });
    await user.click(screen.getByRole('button', { name: 'Apply component' }));
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByLabelText('Component JSON')).toHaveValue('{ broken');
    fireEvent.change(screen.getByLabelText('Component JSON'), {
      target: {
        value: '{"summary":"Order", "value":{"id":42}, "x-extra":true}',
      },
    });
    await user.click(screen.getByRole('button', { name: 'Apply component' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(saved().components.examples.Example['x-extra']).toBe(true);
    await user.click(screen.getByRole('button', { name: 'Advanced JSON' }));
    fireEvent.change(screen.getByLabelText('Component JSON'), {
      target: { value: '{}' },
    });
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(saved().components.examples.Example.value).toEqual({ id: 42 });
  });
});
