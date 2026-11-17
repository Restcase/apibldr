import { useLayoutEffect, useState } from 'react';

export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';
export const themeStorageKey = 'apibldr.theme';

export function readThemePreference(): ThemePreference {
  try {
    const saved = localStorage.getItem(themeStorageKey);
    return saved === 'light' || saved === 'dark' ? saved : 'system';
  } catch {
    return 'system';
  }
}

export function useTheme() {
  const [preference, setPreference] = useState(readThemePreference);
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches,
  );
  const [error, setError] = useState('');
  const resolved: ResolvedTheme =
    preference === 'system' ? (systemDark ? 'dark' : 'light') : preference;

  useLayoutEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setSystemDark(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = resolved;
    document.documentElement.style.colorScheme = resolved;
  }, [resolved]);

  function chooseTheme(next: ThemePreference) {
    setPreference(next);
    try {
      localStorage.setItem(themeStorageKey, next);
      setError('');
    } catch {
      setError(
        'Theme changed for this session. Browser storage is unavailable.',
      );
    }
  }
  return { preference, resolved, chooseTheme, error };
}
