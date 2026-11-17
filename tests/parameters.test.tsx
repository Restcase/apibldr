import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import ComponentFields from '../src/components/ComponentFields';
import { type JsonObject } from '../src/domain/document';

function Harness({ initial }: { initial: JsonObject }) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <ComponentFields
        category="parameters"
        value={value}
        schemas={[]}
        patch={(fields) => setValue((current) => ({ ...current, ...fields }))}
      />
      <output data-testid="parameter">{JSON.stringify(value)}</output>
    </>
  );
}

it.each([false, undefined])(
  'shows and repairs imported path parameters with required=%s',
  async (required) => {
    const user = userEvent.setup();
    const initial = {
      name: 'id',
      in: 'path',
      required,
      schema: { type: 'integer', minimum: 1 },
      'x-owner': 'example',
    };
    render(<Harness initial={initial} />);
    const checkbox = screen.getByLabelText('Required parameter');
    expect(checkbox).not.toBeChecked();
    expect(checkbox).toBeEnabled();
    expect(checkbox).toHaveAttribute('aria-invalid', 'true');
    expect(checkbox).toHaveAccessibleDescription(/Select Required parameter/);
    await user.click(checkbox);
    expect(checkbox).toBeChecked();
    expect(checkbox).toBeDisabled();
    expect(checkbox).not.toHaveAttribute('aria-invalid');
    expect(JSON.parse(screen.getByTestId('parameter').textContent!)).toEqual({
      ...initial,
      required: true,
    });
  },
);

it('allows optional query parameters and requires them when changed to path', async () => {
  const user = userEvent.setup();
  render(<Harness initial={{ name: 'id', in: 'path', required: true }} />);
  await user.selectOptions(
    screen.getByLabelText('Parameter location'),
    'query',
  );
  await user.click(screen.getByLabelText('Required parameter'));
  expect(screen.getByLabelText('Required parameter')).not.toBeChecked();
  await user.selectOptions(screen.getByLabelText('Parameter location'), 'path');
  expect(screen.getByLabelText('Required parameter')).toBeChecked();
  expect(screen.getByLabelText('Required parameter')).toBeDisabled();
});

it('preserves long descriptions through repeated edits and repairs', async () => {
  const user = userEvent.setup();
  render(<Harness initial={{ name: 'id', in: 'path', required: false }} />);
  const description = 'A detailed explanation of the parameter.\n'.repeat(150);
  for (let index = 0; index < 50; index++)
    fireEvent.change(screen.getByLabelText('Description (optional)'), {
      target: { value: `${description}${index}` },
    });
  await user.click(screen.getByLabelText('Required parameter'));
  expect(
    JSON.parse(screen.getByTestId('parameter').textContent!).description,
  ).toBe(`${description}49`);
});
