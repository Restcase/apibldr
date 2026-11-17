import { useId, useState } from 'react';
/** Scoped advanced editing: drafts stay local until Apply and never replace the whole document. */
export default function JsonField({
  label,
  value,
  onChange,
  hint,
  kind = 'object',
}: {
  label: string;
  value: unknown;
  onChange: (value: unknown) => void;
  hint?: string;
  kind?: 'object' | 'array' | 'any';
}) {
  const id = useId();
  const current = JSON.stringify(
    value ?? (kind === 'array' ? [] : {}),
    null,
    2,
  );
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  function apply() {
    try {
      const parsed: unknown = JSON.parse(draft ?? current);
      if (kind === 'array' && !Array.isArray(parsed))
        throw new Error('Enter a JSON array.');
      if (
        kind === 'object' &&
        (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed))
      )
        throw new Error('Enter a JSON object.');
      onChange(parsed);
      setDraft(null);
      setError('');
      setNotice(`${label} applied.`);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Correct the JSON and retry.',
      );
    }
  }
  return (
    <details className="advanced-details">
      <summary>{label}</summary>
      <div className="advanced-fields">
        {hint && <p className="muted">{hint}</p>}
        <label htmlFor={id}>{label} JSON</label>
        <textarea
          id={id}
          rows={7}
          className="mono"
          spellCheck={false}
          value={draft ?? current}
          onChange={(e) => {
            setDraft(e.target.value);
            setNotice('');
          }}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        {draft !== null && (
          <p className="muted small" role="status">
            Unapplied changes. Apply this edit before switching sections.
          </p>
        )}
        {error && (
          <p id={`${id}-error`} className="error-text" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          <button
            type="button"
            disabled={draft === null}
            onClick={() => {
              setDraft(null);
              setError('');
            }}
          >
            Discard edit
          </button>
          <button type="button" disabled={draft === null} onClick={apply}>
            Apply {label.toLowerCase()}
          </button>
        </div>
        {notice && (
          <p role="status" className="muted small">
            {notice}
          </p>
        )}
      </div>
    </details>
  );
}
