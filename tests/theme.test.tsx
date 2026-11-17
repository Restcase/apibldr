import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ThemePicker from '../src/components/ThemePicker';
import { themeStorageKey, useTheme } from '../src/hooks/useTheme';

function ThemeHarness() {
  const theme = useTheme();
  return (
    <>
      <ThemePicker value={theme.preference} onChange={theme.chooseTheme} />
      <output>{theme.resolved}</output>
      {theme.error && <p role="status">{theme.error}</p>}
    </>
  );
}

describe('color themes', () => {
  it('switches light/dark immediately and restores the choice after remount', () => {
    const { unmount } = render(<ThemeHarness />);
    fireEvent.click(screen.getByRole('radio', { name: /Dark/ }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
    expect(localStorage.getItem(themeStorageKey)).toBe('dark');
    unmount();
    render(<ThemeHarness />);
    expect(screen.getByRole('radio', { name: /Dark/ })).toBeChecked();
    fireEvent.click(screen.getByRole('radio', { name: /Light/ }));
    expect(document.documentElement.dataset.theme).toBe('light');
  });
  it('follows system changes only when System is selected', () => {
    let callback = () => {};
    const media = {
      matches: false,
      addEventListener: vi.fn((_name: string, fn: () => void) => {
        callback = fn;
      }),
      removeEventListener: vi.fn(),
    };
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => media),
    );
    const { unmount } = render(<ThemeHarness />);
    act(() => {
      media.matches = true;
      callback();
    });
    expect(document.documentElement.dataset.theme).toBe('dark');
    fireEvent.click(screen.getByRole('radio', { name: /Light/ }));
    act(() => {
      media.matches = false;
      callback();
      media.matches = true;
      callback();
    });
    expect(document.documentElement.dataset.theme).toBe('light');
    fireEvent.click(screen.getByRole('radio', { name: /System/ }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    unmount();
    expect(media.removeEventListener).toHaveBeenCalledWith(
      'change',
      expect.any(Function),
    );
  });
  it('still applies themes when storage fails and explains the persistence limit', () => {
    const spy = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new Error('Storage blocked');
      });
    render(<ThemeHarness />);
    fireEvent.click(screen.getByRole('radio', { name: /Dark/ }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(screen.getByText(/Theme changed for this session/)).toHaveAttribute(
      'role',
      'status',
    );
    spy.mockRestore();
  });
});
