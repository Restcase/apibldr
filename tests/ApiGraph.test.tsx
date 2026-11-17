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

it('keeps the API and path nodes mounted while drilling deeper and restores the previous filter', async () => {
  const user = userEvent.setup();
  render(
    <ApiGraph
      document={exampleWorkspace().document}
      dirty={false}
      onOpen={() => {}}
      onSource={() => {}}
    />,
  );
  const root = screen.getByRole('button', {
    name: 'Selected Swagger Petstore - OpenAPI 3.1',
  });
  const canvas = screen.getByLabelText(
    'Graph canvas. Scroll to pan; use Tab to reach nodes.',
  );
  const scroll = vi.fn();
  canvas.scrollTo = scroll;
  Object.defineProperty(canvas, 'clientWidth', { value: 1000 });
  await user.type(screen.getByLabelText('Filter connections'), '/pet');
  canvas.scrollLeft = 120;
  canvas.scrollTop = 40;
  await user.click(screen.getByRole('button', { name: 'Explore /pet' }));
  const path = screen.getByRole('button', { name: 'Selected /pet' });
  await user.click(screen.getByRole('button', { name: 'Explore POST /pet' }));
  expect(
    screen.getByRole('button', {
      name: 'Return to Swagger Petstore - OpenAPI 3.1',
    }),
  ).toBe(root);
  expect(screen.getByRole('button', { name: 'Return to /pet' })).toBe(path);
  expect(scroll).toHaveBeenLastCalledWith(
    expect.objectContaining({ behavior: 'smooth' }),
  );
  expect(
    screen.getByRole('button', { name: 'Reset graph zoom' }),
  ).toHaveTextContent('79%');
  await user.click(root);
  expect(
    screen.getByRole('button', { name: 'Reset graph zoom' }),
  ).toHaveTextContent('100%');
  expect(scroll).toHaveBeenLastCalledWith(
    expect.objectContaining({ left: 120, top: 40 }),
  );
  expect(screen.getByLabelText('Filter connections')).toHaveValue('/pet');
  expect(
    screen.getByRole('button', { name: 'Explore /pet/findByStatus' }),
  ).toBeInTheDocument();
});

it('restores the previous connection page and respects reduced motion', async () => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: true })),
  );
  const user = userEvent.setup();
  render(
    <ApiGraph
      document={exampleWorkspace().document}
      dirty={false}
      onOpen={() => {}}
      onSource={() => {}}
    />,
  );
  const canvas = screen.getByLabelText(
    'Graph canvas. Scroll to pan; use Tab to reach nodes.',
  );
  const scroll = vi.fn();
  canvas.scrollTo = scroll;
  await user.click(screen.getByRole('button', { name: 'Next' }));
  await user.click(
    screen.getByRole('button', { name: 'Explore /store/order' }),
  );
  expect(scroll).toHaveBeenLastCalledWith(
    expect.objectContaining({ behavior: 'instant' }),
  );
  await user.click(screen.getByRole('button', { name: 'Back one level' }));
  expect(screen.getByText(/7–12 of/)).toBeInTheDocument();
});
