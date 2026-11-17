import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { EditorView } from '@uiw/react-codemirror';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import SourceEditor from '../src/components/SourceEditor';
import EditorBoundary from '../src/components/EditorBoundary';
import {
  acceptCompletion,
  currentCompletions,
  startCompletion,
} from '@codemirror/autocomplete';

// JSDOM has no layout engine; CodeMirror measures popup anchors with Range.
beforeAll(() => {
  Range.prototype.getClientRects = () => [] as unknown as DOMRectList;
  Range.prototype.getBoundingClientRect = () => new DOMRect();
});

describe('real CodeMirror integration', () => {
  it.each(['yaml', 'json'] as const)(
    'opens and accepts %s suggestions through CodeMirror',
    async (format) => {
      const source =
        format === 'yaml' ? 'info:\n  ver' : '{"info":{"ver":"1.0"}}';
      const pos = source.indexOf('ver') + 3;
      const onChange = vi.fn();
      render(
        <SourceEditor source={source} format={format} onChange={onChange} />,
      );
      const editor = EditorView.findFromDOM(
        await screen.findByRole('textbox', { name: 'API source' }),
      )!;
      act(() => {
        editor.dispatch({ selection: { anchor: pos } });
        startCompletion(editor);
      });
      await waitFor(() =>
        expect(
          currentCompletions(editor.state).map((item) => item.label),
        ).toEqual(['version']),
      );
      expect(onChange).not.toHaveBeenCalled();
      await waitFor(() =>
        act(() => {
          expect(acceptCompletion(editor)).toBe(true);
        }),
      );
      expect(editor.state.doc.toString()).toBe(
        format === 'yaml' ? 'info:\n  version: ' : '{"info":{"version":"1.0"}}',
      );
      expect(onChange).toHaveBeenCalled();
    },
  );
  it('emits actual source edits and accepts external document changes without echoing them', async () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <SourceEditor source="paths: {}" format="yaml" onChange={onChange} />,
    );
    const input = await screen.findByRole('textbox', { name: 'API source' });
    const editor = EditorView.findFromDOM(input)!;
    act(() =>
      editor.dispatch({
        changes: {
          from: 0,
          to: editor.state.doc.length,
          insert: 'info: [unfinished',
        },
      }),
    );
    expect(onChange).toHaveBeenLastCalledWith(
      'info: [unfinished',
      expect.anything(),
    );
    onChange.mockClear();
    rerender(
      <SourceEditor
        source={'{"paths":{}}'}
        format="json"
        theme="dark"
        onChange={onChange}
      />,
    );
    await waitFor(() =>
      expect(editor.state.doc.toString()).toBe('{"paths":{}}'),
    );
    expect(onChange).not.toHaveBeenCalled();
    expect(document.querySelector('.cm-theme-dark')).toBeInTheDocument();
    rerender(
      <SourceEditor
        source={'{"paths":{}}'}
        format="json"
        theme="light"
        readOnly
        onChange={onChange}
      />,
    );
    expect(input).toHaveAttribute('contenteditable', 'false');
  });
  it('keeps an editable fallback if the rich editor crashes', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    function BrokenEditor(): never {
      throw new Error('Chunk unavailable');
    }
    const onChange = vi.fn();
    render(
      <EditorBoundary
        source="openapi: 3.1.0"
        readOnly={false}
        onChange={onChange}
      >
        <BrokenEditor />
      </EditorBoundary>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('plain text editor');
    fireEvent.change(screen.getByRole('textbox', { name: 'API source' }), {
      target: { value: 'draft source' },
    });
    expect(onChange).toHaveBeenCalledWith('draft source');
    spy.mockRestore();
  });
});
