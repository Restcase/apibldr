import { Monitor, Moon, Sun } from 'lucide-react';
import type { ThemePreference } from '../hooks/useTheme';

export default function ThemePicker({
  value,
  onChange,
}: {
  value: ThemePreference;
  onChange: (value: ThemePreference) => void;
}) {
  return (
    <fieldset className="theme-picker">
      <legend className="sr-only">Color theme</legend>
      {(
        [
          { value: 'light', label: 'Light', Icon: Sun },
          { value: 'dark', label: 'Dark', Icon: Moon },
          { value: 'system', label: 'System', Icon: Monitor },
        ] as const
      ).map(({ value: option, label, Icon }) => (
        <label key={option} title={`${label} theme`}>
          <input
            className="sr-only"
            type="radio"
            name="color-theme"
            value={option}
            checked={value === option}
            onChange={() => onChange(option)}
          />
          <span>
            <Icon size={16} />
            <span className="theme-label">{label}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}
