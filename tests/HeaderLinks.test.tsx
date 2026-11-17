import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import HeaderLinks from '../src/components/HeaderLinks';
import FooterClock from '../src/components/FooterClock';
import { openFeedback } from '../src/integrations/feedback';
vi.mock('../src/integrations/feedback', () => ({ openFeedback: vi.fn() }));
afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe('header and footer utilities', () => {
  it('exposes repository, issues, and releases and closes the menu with Escape', async () => {
    const user = userEvent.setup();
    render(<HeaderLinks />);
    await user.click(screen.getByLabelText('GitHub links'));
    expect(screen.getByRole('link', { name: 'Repository' })).toHaveAttribute(
      'href',
      'https://github.com/Restcase/apibldr',
    );
    expect(
      screen.getByRole('link', { name: 'Submit / view issues' }),
    ).toHaveAttribute('href', 'https://github.com/Restcase/apibldr/issues');
    expect(screen.getByRole('link', { name: 'Release notes' })).toHaveAttribute(
      'href',
      'https://github.com/Restcase/apibldr/releases',
    );
    await user.keyboard('{Escape}');
    expect(
      screen.getByLabelText('GitHub links').closest('details'),
    ).not.toHaveAttribute('open');
  });
  it('opens the existing feedback integration and offers recovery if unavailable', async () => {
    const user = userEvent.setup();
    vi.mocked(openFeedback).mockRejectedValueOnce(
      new Error('Feedback could not load.'),
    );
    render(<HeaderLinks />);
    expect(openFeedback).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Help and feedback' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'could not load',
    );
    expect(
      screen.getByRole('link', { name: 'Open GitHub issues' }),
    ).toBeInTheDocument();
    vi.mocked(openFeedback).mockResolvedValueOnce();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(openFeedback).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
  it('updates the local date and time across midnight without a live announcement', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 17, 23, 59, 59));
    const { container, unmount } = render(<FooterClock />);
    expect(container.querySelector('time')).toHaveTextContent('17');
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(container.querySelector('time')).toHaveTextContent('18');
    expect(container.querySelector('time')).not.toHaveAttribute('aria-live');
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
