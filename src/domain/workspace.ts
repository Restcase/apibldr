import {
  emptyDocument,
  isObject,
  parseApi,
  serializeApi,
  type ApiDocument,
  type Format,
} from './document';

export const storageKey = 'apibldr.workspace.v1';
export type Workspace = {
  document: ApiDocument;
  source: string;
  format: Format;
  dirty: boolean;
};
export type History = {
  past: Workspace[];
  present: Workspace;
  future: Workspace[];
};

export function createWorkspace(
  document = emptyDocument(),
  format: Format = 'yaml',
): Workspace {
  return {
    document,
    source: serializeApi(document, format),
    format,
    dirty: false,
  };
}

export function restoreWorkspace(raw: string): Workspace {
  const value: unknown = JSON.parse(raw);
  if (!isObject(value) || value.version !== 1 || !isObject(value.workspace))
    throw new Error('This saved workspace format is not supported.');
  const saved = value.workspace;
  if (
    typeof saved.source !== 'string' ||
    (saved.format !== 'yaml' && saved.format !== 'json') ||
    typeof saved.dirty !== 'boolean'
  )
    throw new Error('The saved workspace is incomplete.');
  const document = parseApi(JSON.stringify(saved.document));
  let dirty = saved.dirty;
  if (!dirty) {
    try {
      dirty =
        JSON.stringify(parseApi(saved.source)) !== JSON.stringify(document);
    } catch {
      dirty = true;
    }
  }
  return {
    document,
    format: saved.format,
    dirty,
    source: saved.source,
  };
}

export function encodeWorkspace(workspace: Workspace): string {
  return JSON.stringify({ version: 1, workspace });
}

export type HistoryAction =
  | { type: 'commit'; workspace: Workspace }
  | { type: 'undo' }
  | { type: 'redo' };
export function historyReducer(state: History, action: HistoryAction): History {
  if (action.type === 'undo') {
    const previous = state.past.at(-1);
    return previous
      ? {
          past: state.past.slice(0, -1),
          present: previous,
          future: [state.present, ...state.future].slice(0, 30),
        }
      : state;
  }
  if (action.type === 'redo') {
    const next = state.future[0];
    return next
      ? {
          past: [...state.past, state.present].slice(-30),
          present: next,
          future: state.future.slice(1),
        }
      : state;
  }
  return {
    past: [...state.past, state.present].slice(-30),
    present: action.workspace,
    future: [],
  };
}
