import { useState } from 'react';
import type { ApiDocument, Diagnostic } from '../domain/document';
export default function SpecificationChecks({
  document,
}: {
  document: ApiDocument;
}) {
  const [checked, setChecked] = useState<ApiDocument | null>(null);
  const [issues, setIssues] = useState<Diagnostic[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function run() {
    setBusy(true);
    setError('');
    try {
      const { validateSpecification } = await import('../domain/validation');
      setIssues(await validateSpecification(document));
      setChecked(document);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Validation could not run. Retry.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="component-subsection">
      <h3>Specification validation</h3>
      <p className="muted">
        Checks the bundled official schema and local references. Remote
        references are reported without fetching them. Schema checks do not
        prove runtime behavior or every semantic constraint.
      </p>
      <button disabled={busy} onClick={run}>
        {busy ? 'Validating…' : 'Validate specification'}
      </button>
      {checked && checked !== document && (
        <p role="status">
          The document changed. Run validation again for current results.
        </p>
      )}
      {error && (
        <p role="alert" className="error-text">
          {error}
        </p>
      )}
      {checked === document && (
        <>
          {issues.length ? (
            <ul>
              {issues.slice(0, 100).map((issue, i) => (
                <li key={i}>
                  <code>{issue.location}</code>
                  <span>{issue.message}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p role="status" className="check-success">
              Specification schema and local reference checks passed.
            </p>
          )}
          {issues.length > 100 && (
            <p>
              Showing the first 100 of {issues.length} issues. Fix these and
              validate again.
            </p>
          )}
        </>
      )}
    </section>
  );
}
