import { useEffect, useRef, useState } from 'react';
import { CircleHelp, ExternalLink } from 'lucide-react';
import { openFeedback } from '../integrations/feedback';

const repository = 'https://github.com/Restcase/apibldr';
export default function HeaderLinks() {
  const menu = useRef<HTMLDetailsElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (menu.current && !menu.current.contains(event.target as Node))
        menu.current.open = false;
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);
  async function feedback() {
    setError('');
    setLoading(true);
    try {
      await openFeedback();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Feedback could not open. Please try again or use GitHub issues.',
      );
    } finally {
      setLoading(false);
    }
  }
  return (
    <>
      <details
        ref={menu}
        className="github-links"
        onKeyDown={(event) => {
          if (event.key === 'Escape' && menu.current) {
            menu.current.open = false;
            menu.current.querySelector('summary')?.focus();
          }
        }}
      >
        <summary
          className="icon-button"
          aria-label="GitHub links"
          title="GitHub links"
        >
          <img
            src="/github-mark.png"
            className="github-mark"
            width="20"
            height="20"
            alt=""
          />
        </summary>
        <nav className="header-popover" aria-label="GitHub resources">
          {[
            ['Repository', repository],
            ['Submit / view issues', `${repository}/issues`],
            ['Release notes', `${repository}/releases`],
          ].map(([label, href]) => (
            <a
              key={href}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                if (menu.current) menu.current.open = false;
              }}
            >
              {label}
              <ExternalLink size={14} aria-hidden="true" />
            </a>
          ))}
        </nav>
      </details>
      <div className="feedback-control">
        <button
          className="icon-button"
          aria-label="Help and feedback"
          title="Help and feedback"
          disabled={loading}
          aria-busy={loading}
          onClick={feedback}
        >
          <CircleHelp size={20} />
        </button>
        {loading && (
          <div className="header-popover" role="status">
            Loading feedback…
          </div>
        )}
        {error && (
          <div className="header-popover feedback-error" role="alert">
            <p>{error}</p>
            <a
              href={`${repository}/issues`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open GitHub issues
            </a>
            <div className="form-actions">
              <button onClick={() => setError('')}>Dismiss</button>
              <button onClick={feedback}>Retry</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
