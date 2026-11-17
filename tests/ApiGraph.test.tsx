import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import ApiGraph from '../src/components/ApiGraph';
import { exampleWorkspace } from '../src/domain/examples';
import { emptyDocument } from '../src/domain/document';

it('drills down, opens the correct operation, filters and returns through breadcrumbs', async () => {
  const user = userEvent.setup();
  const open = vi.fn();
  render(
    <ApiGraph
      document={exampleWorkspace().document}
      dirty={false}
      onOpen={open}
      onSource={() => {}}
    />,
  );
  await user.click(screen.getByRole('button', { name: 'Explore /pet' }));
  await user.click(screen.getByRole('button', { name: 'Explore POST /pet' }));
  expect(
    screen.getByRole('heading', { name: 'POST /pet' }),
  ).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Open in Designer' }));
  expect(open).toHaveBeenCalledWith({
    kind: 'operation',
    path: '/pet',
    method: 'post',
  });
  await user.click(screen.getByRole('button', { name: 'API overview' }));
  await user.type(screen.getByLabelText('Filter connections'), 'missing-node');
  expect(screen.getByText('No matching connections')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Clear filter' }));
  await user.click(screen.getByRole('button', { name: 'Next' }));
  expect(screen.getByText(/7–12 of/)).toBeInTheDocument();
});
it('handles empty APIs, draft notices and zoom using native accessible controls', async () => {
  const user = userEvent.setup();
  const source = vi.fn();
  render(
    <ApiGraph
      document={emptyDocument()}
      dirty
      onOpen={() => {}}
      onSource={source}
    />,
  );
  expect(screen.getByText('Your API starts here')).toBeInTheDocument();
  await user.click(
    screen.getByRole('button', { name: 'Review unapplied source' }),
  );
  expect(source).toHaveBeenCalledOnce();
  await user.click(screen.getByRole('button', { name: 'Zoom in' }));
  expect(
    screen.getByRole('button', { name: 'Reset graph zoom' }),
  ).toHaveTextContent('110%');
  fireEvent.click(screen.getByRole('button', { name: 'Reset graph zoom' }));
  expect(
    screen.getByRole('button', { name: 'Reset graph zoom' }),
  ).toHaveTextContent('100%');
});
