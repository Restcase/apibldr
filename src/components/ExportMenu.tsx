import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Download } from 'lucide-react';
import type { Format } from '../domain/document';
export default function ExportMenu({
  disabled,
  primary,
  onExport,
}: {
  disabled: boolean;
  primary: boolean;
  onExport: (format: Format) => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  return (
    <div
      className="export-menu"
      ref={root}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          setOpen(false);
          trigger.current?.focus();
        }
      }}
    >
      <button
        ref={trigger}
        className={primary ? 'primary' : ''}
        disabled={disabled}
        aria-expanded={open && !disabled}
        aria-controls="export-options"
        onClick={() => setOpen(!open)}
      >
        <Download size={16} /> Export <ChevronDown size={14} />
      </button>
      {open && !disabled && (
        <div
          id="export-options"
          className="export-options"
          role="group"
          aria-label="Export format"
        >
          {(['yaml', 'json'] as const).map((format) => (
            <button
              key={format}
              onClick={() => {
                setOpen(false);
                onExport(format);
                trigger.current?.focus();
              }}
            >
              Export {format.toUpperCase()}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
