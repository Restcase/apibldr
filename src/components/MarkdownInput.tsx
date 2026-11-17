import { lazy, Suspense, useRef, useState } from 'react';
const Preview = lazy(() => import('./MarkdownPreview'));
export default function MarkdownInput({
  id,
  label,
  value,
  onChange,
  describedBy,
  placeholder,
}: {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  describedBy?: string;
  placeholder?: string;
}) {
  const input = useRef<HTMLTextAreaElement>(null);
  const [preview, setPreview] = useState(false);
  function insert(before: string, after = '', fallback = 'text') {
    const node = input.current;
    if (!node) return;
    const start = node.selectionStart,
      end = node.selectionEnd;
    const selected = value.slice(start, end) || fallback;
    onChange(
      value.slice(0, start) + before + selected + after + value.slice(end),
    );
    requestAnimationFrame(() => {
      node.focus();
      node.setSelectionRange(
        start + before.length,
        start + before.length + selected.length,
      );
    });
  }
  return (
    <div className="markdown-input">
      <div
        className="markdown-tools"
        role="toolbar"
        aria-label="Markdown formatting"
      >
        {[
          ['Bold', '**', '**'],
          ['Italic', '_', '_'],
          ['Heading', '## ', ''],
          ['Code', '`', '`'],
          ['Quote', '> ', ''],
          ['List', '- ', ''],
          ['Link', '[', '](https://example.com)'],
          ['Image', '![', '](https://example.com/image.png)'],
        ].map(([name, before, after]) => (
          <button
            key={name}
            type="button"
            onClick={() => insert(before, after)}
          >
            {name}
          </button>
        ))}
        <button
          type="button"
          aria-pressed={preview}
          onClick={() => setPreview(!preview)}
        >
          {preview ? 'Hide preview' : 'Preview'}
        </button>
      </div>
      <textarea
        ref={input}
        id={id}
        aria-label={label}
        aria-describedby={describedBy}
        rows={4}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {preview && (
        <Suspense fallback={<p>Loading preview…</p>}>
          <Preview source={value} />
        </Suspense>
      )}
    </div>
  );
}
