import CodeMirror, { EditorView } from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import { yaml } from '@codemirror/lang-yaml';
import { autocompletion } from '@codemirror/autocomplete';
import { useMemo } from 'react';
import { openApiCompletions } from '../editor/completions';
import type { Format } from '../domain/document';
import type { ResolvedTheme } from '../hooks/useTheme';

export default function SourceEditor({
  source,
  format,
  onChange,
  theme = 'light',
  readOnly = false,
}: {
  source: string;
  format: Format;
  onChange: (value: string) => void;
  theme?: ResolvedTheme;
  readOnly?: boolean;
}) {
  const extensions = useMemo(
    () => [
      format === 'json' ? json() : yaml(),
      EditorView.contentAttributes.of({ 'aria-label': 'API source' }),
      autocompletion({ override: [openApiCompletions(format)] }),
    ],
    [format],
  );
  return (
    <CodeMirror
      value={source}
      height="100%"
      theme={theme}
      readOnly={readOnly}
      editable={!readOnly}
      extensions={extensions}
      onChange={onChange}
      basicSetup={{
        foldGutter: true,
        highlightActiveLine: true,
        autocompletion: false,
      }}
    />
  );
}
