import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import {
  Check,
  ChevronRight,
  Code2,
  Download,
  FilePlus2,
  FileText,
  FolderOpen,
  Globe,
  Info,
  KeyRound,
  Menu,
  Maximize2,
  PencilRuler,
  Layers,
  Tags,
  Plus,
  Redo2,
  Search,
  ShieldCheck,
  Undo2,
  Upload,
  X,
} from 'lucide-react';
import {
  addOperation,
  emptyDocument,
  isAsync,
  specLabel,
  checkDocument,
  listOperations,
  maxDocumentSize,
  methods,
  parseApi,
  patchOperation,
  removeOperation,
  serializeApi,
  text,
  isObject,
  type ApiDocument,
  type Format,
  type Method,
} from './domain/document';
import {
  createWorkspace,
  encodeWorkspace,
  historyReducer,
  restoreWorkspace,
  storageKey,
  type Workspace,
} from './domain/workspace';
import { importDefinition } from './domain/import';
import GeneralSettings, {
  type GeneralSection,
} from './components/GeneralSettings';
import SpecificationChecks from './components/SpecificationChecks';
import CodeGenerator from './components/CodeGenerator';
import HeaderLinks from './components/HeaderLinks';
import FooterClock from './components/FooterClock';
import { version } from '../package.json';
import MarkdownInput from './components/MarkdownInput';
import PathSettings from './components/PathSettings';
import AsyncChannels from './components/AsyncChannels';
import NewDocumentDialog from './components/NewDocumentDialog';
import { TextField } from './components/ComponentFields';
import OperationEditor from './components/OperationEditor';
import ThemePicker from './components/ThemePicker';
import ComponentWorkspace from './components/ComponentWorkspace';
import {
  componentCategories,
  asyncComponentCategories,
  componentCatalog,
  type ComponentCategory,
} from './domain/components';
import EditorBoundary from './components/EditorBoundary';
import { useTheme } from './hooks/useTheme';
import { suggestOperationId, suggestPaths } from './domain/suggestions';

const SourceEditor = lazy(() => import('./components/SourceEditor'));

function loadWorkspace(): { workspace: Workspace; error: string } {
  try {
    const raw = localStorage.getItem(storageKey);
    return {
      workspace: raw ? restoreWorkspace(raw) : createWorkspace(),
      error: '',
    };
  } catch {
    return {
      workspace: createWorkspace(),
      error:
        'Your previous draft could not be opened. It has not been overwritten. Download the saved data before starting over.',
    };
  }
}

function download(content: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function App() {
  const theme = useTheme();
  const [initial] = useState(loadWorkspace);
  const [showCodegen, setShowCodegen] = useState(false);
  const [choosingSpec, setChoosingSpec] = useState(false);
  const [generalSection, setGeneralSection] =
    useState<GeneralSection>('details');
  const [history, dispatch] = useReducer(historyReducer, {
    past: [],
    present: initial.workspace,
    future: [],
  });
  const workspace = history.present;
  const { document, source, format, dirty } = workspace;
  const async = isAsync(document);
  const [recoveryError, setRecoveryError] = useState(initial.error);
  const [storageError, setStorageError] = useState('');
  const [saved, setSaved] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [touchedInfo, setTouchedInfo] = useState({
    title: false,
    version: false,
  });
  const [selected, setSelected] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [view, setView] = useState<'design' | 'source' | 'validation'>(
    'design',
  );
  const [navTab, setNavTab] = useState<'general' | 'paths' | 'components'>(
    'general',
  );
  const [componentCategory, setComponentCategory] =
    useState<ComponentCategory>('securitySchemes');
  const [navigationOpen, setNavigationOpen] = useState(
    () => !window.matchMedia('(max-width: 767px)').matches,
  );
  const [importing, setImporting] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const fileInput = useRef<HTMLInputElement>(null);
  const importBusy = useRef(false);
  const operations = useMemo(() => listOperations(document), [document]);
  const operation = operations.find(
    (item) => `${item.method} ${item.path}` === selected,
  );
  const filtered = operations.filter((item) =>
    `${item.method} ${item.path} ${text(item.value.summary)}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const diagnostics = useMemo(() => checkDocument(document), [document]);
  const titleError = touchedInfo.title && !document.info.title.trim();
  const versionError = touchedInfo.version && !document.info.version.trim();

  function persist(current: Workspace) {
    try {
      localStorage.setItem(storageKey, encodeWorkspace(current));
      setStorageError('');
      setSaved(true);
    } catch {
      setStorageError(
        'This browser could not save your draft. Retry saving or download your source to keep a copy.',
      );
      setSaved(false);
    }
  }
  useEffect(() => {
    if (recoveryError) return;
    persist(workspace);
  }, [workspace, recoveryError]);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  useEffect(() => {
    if (!storageError && !recoveryError) return;
    const preventLoss = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', preventLoss);
    return () => window.removeEventListener('beforeunload', preventLoss);
  }, [storageError, recoveryError]);

  function commit(next: Workspace, message = '') {
    dispatch({ type: 'commit', workspace: next });
    setNotice(message);
    setError('');
  }
  function updateDocument(next: ApiDocument, message = '') {
    commit(createWorkspace(next, format), message);
  }
  function applySource(): ApiDocument | null {
    try {
      const next = parseApi(source);
      // Preserve comments and formatting in the applied source until a visual edit.
      commit(
        { ...workspace, document: next, dirty: false },
        'Source applied to the visual editor.',
      );
      return next;
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Could not read this source. Check its JSON or YAML syntax.',
      );
      return null;
    }
  }
  function changeFormat(nextFormat: Format) {
    if (nextFormat === format) return;
    const next = dirty ? applySource() : document;
    if (next)
      commit(
        createWorkspace(next, nextFormat),
        `Source converted to ${nextFormat.toUpperCase()}.`,
      );
  }
  async function importFile(file?: File) {
    if (!file || importBusy.current) return;
    if (file.size > maxDocumentSize) {
      setError(
        'This file exceeds the 2 MB editor limit. Choose a smaller file.',
      );
      return;
    }
    if (
      dirty &&
      !window.confirm(
        'Replace your unfinished source edit with this file? You can restore it with Undo.',
      )
    )
      return;
    importBusy.current = true;
    setImporting(true);
    setError('');
    try {
      const contents = await file.text();
      const imported = await importDefinition(contents);
      const next = imported.document;
      const nextFormat = imported.format;
      commit(
        {
          document: next,
          source: imported.source,
          format: nextFormat,
          dirty: false,
        },
        `Imported ${file.name}.${imported.converted ? ' Converted Swagger 2.0 to OpenAPI 3.0.' : ''} Undo is available.`,
      );
      setSelected(null);
      setAdding(false);
      setQuery('');
      setNavTab('general');
      setGeneralSection('details');
      setTouchedInfo({ title: false, version: false });
    } catch (cause) {
      setError(
        `Import failed. ${cause instanceof Error ? cause.message : 'Choose a readable JSON or YAML file.'} Your current document is unchanged.`,
      );
    } finally {
      importBusy.current = false;
      setImporting(false);
    }
  }
  function exportDocument() {
    const next = dirty ? applySource() : document;
    if (!next) {
      setView('source');
      return;
    }
    const filename =
      next.info.title
        .replace(/[^a-z\d_-]+/gi, '-')
        .replace(/^-|-$/g, '')
        .toLowerCase() || 'openapi';
    download(
      serializeApi(next, format),
      `${filename}.${format}`,
      format === 'json' ? 'application/json' : 'application/yaml',
    );
    setNotice(`Exported ${filename}.${format}.`);
  }
  function createOperation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const path = String(values.get('path')).trim();
    const method = String(values.get('method')) as Method;
    try {
      updateDocument(
        addOperation(document, path, method),
        `Added ${method.toUpperCase()} ${path}.`,
      );
      setSelected(`${method} ${path}`);
      setAdding(false);
      setQuery('');
      setNavTab('paths');
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Could not add this operation. Check its method and path.',
      );
    }
  }
  const locked = dirty || importing;

  function startOperation() {
    setAdding(!async);
    setNavTab('paths');
    setView('design');
  }
  function openSourceSection(section: string) {
    setView('source');
    setNotice(
      `Edit ${section} in the source document, then choose Apply source.`,
    );
  }
  function changeSource(value: string) {
    if (!importing && value !== source)
      commit({ ...workspace, source: value, dirty: true });
  }
  function newApi() {
    if (
      !window.confirm(
        'Start a new API? Undo can restore the previous document within the last 30 edits in this tab.',
      )
    )
      return;
    commit(
      createWorkspace(
        emptyDocument(
          async
            ? `asyncapi:${document.asyncapi}`
            : `openapi:${document.openapi}`,
        ),
      ),
      'New API created. Undo restores the previous document.',
    );
    setSelected(null);
    setAdding(false);
    setQuery('');
    setNavTab('general');
    setGeneralSection('details');
    setTouchedInfo({ title: false, version: false });
    setView('design');
  }
  const components = isObject(document.components) ? document.components : {};
  const serverCount = Array.isArray(document.servers)
    ? document.servers.length
    : isObject(document.servers)
      ? Object.keys(document.servers).length
      : 0;
  const tagCount = Array.isArray(document.tags) ? document.tags.length : 0;
  const logo = isObject(document.info['x-logo']) ? document.info['x-logo'] : {};
  const showingComponents = navTab === 'components' && !adding;
  const operationCount = async
    ? document.asyncapi?.startsWith('3.')
      ? Object.keys(document.operations ?? {}).length
      : Object.values(document.channels ?? {}).reduce(
          (n, channel) =>
            n + Number(!!channel.publish) + Number(!!channel.subscribe),
          0,
        )
    : operations.length;
  useEffect(() => {
    if (
      !(async ? asyncComponentCategories : componentCategories).some(
        (key) => key === componentCategory,
      )
    )
      setComponentCategory('securitySchemes');
  }, [async, componentCategory]);

  return (
    <div
      className="app-shell"
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes('Files')) event.preventDefault();
      }}
      onDrop={(event) => {
        if (event.dataTransfer.files.length) {
          event.preventDefault();
          void importFile(event.dataTransfer.files[0]);
        }
      }}
    >
      {showCodegen && (
        <CodeGenerator
          document={document}
          onClose={() => setShowCodegen(false)}
        />
      )}
      {choosingSpec && (
        <NewDocumentDialog
          onClose={() => setChoosingSpec(false)}
          onCreate={(spec) => {
            commit(
              createWorkspace(emptyDocument(spec)),
              'New definition created. Undo restores the previous document.',
            );
            setSelected(null);
            setAdding(false);
            setNavTab('general');
            setGeneralSection('details');
            setComponentCategory('securitySchemes');
            setView('design');
          }}
        />
      )}
      <a
        className="skip-link"
        href={
          view === 'design'
            ? '#editor'
            : view === 'source'
              ? '#source-editor'
              : '#validation-editor'
        }
      >
        Skip to editor
      </a>
      <header className="brandbar">
        <img
          src="/apibldr-logo.png"
          width="160"
          height="40"
          alt="ApiBldr"
          className="brand-logo"
        />
        <div className="document-actions" aria-label="API workspace actions">
          <button
            className="new-api-button"
            disabled={importing}
            onClick={newApi}
          >
            <FilePlus2 size={16} /> New API
          </button>
          <button disabled={importing} onClick={() => setChoosingSpec(true)}>
            Change specification
          </button>
        </div>
        <div className="brand-actions">
          <ThemePicker value={theme.preference} onChange={theme.chooseTheme} />
          <HeaderLinks />
          <button
            className="icon-button"
            aria-label="Toggle fullscreen"
            title="Toggle fullscreen"
            onClick={async () => {
              try {
                const page = globalThis.document;
                if (page.fullscreenElement) await page.exitFullscreen();
                else if (page.documentElement.requestFullscreen)
                  await page.documentElement.requestFullscreen();
                else
                  setNotice(
                    'Use your browser’s View menu to enter fullscreen.',
                  );
              } catch {
                setError(
                  'Fullscreen is unavailable in this browser context. Use your browser’s View menu.',
                );
              }
            }}
          >
            <Maximize2 size={19} />
          </button>
        </div>
      </header>
      <div className="application-body">
        <nav className="app-rail" aria-label="Workspace views">
          <div className="rail-section rail-toggle">
            <button
              className="icon-button"
              aria-label={
                view === 'design' && navigationOpen
                  ? 'Hide navigation'
                  : 'Show navigation'
              }
              aria-expanded={view === 'design' && navigationOpen}
              onClick={() => {
                if (view !== 'design') {
                  setView('design');
                  setNavigationOpen(true);
                } else setNavigationOpen(!navigationOpen);
              }}
            >
              <Menu size={21} />
            </button>
          </div>
          <div className="rail-section">
            <button
              aria-label="Designer"
              aria-current={view === 'design' ? 'page' : undefined}
              onClick={() => setView('design')}
            >
              <PencilRuler size={23} />
              <span>Designer</span>
            </button>
          </div>
          <div className="rail-section">
            <button
              aria-label="Source"
              aria-current={view === 'source' ? 'page' : undefined}
              onClick={() => setView('source')}
            >
              <Code2 size={23} />
              <span>Source</span>
              {dirty && (
                <span
                  className="draft-dot"
                  aria-label="Unapplied source changes"
                />
              )}
            </button>
          </div>
          <div className="rail-section">
            <button
              aria-label="Validation"
              aria-current={view === 'validation' ? 'page' : undefined}
              onClick={() => setView('validation')}
            >
              <ShieldCheck size={23} />
              <span>Validation</span>
            </button>
          </div>
        </nav>
        <div className="application-main">
          <header className="topbar">
            <div className="page-heading">
              <h1>
                {view === 'design'
                  ? 'API Designer'
                  : view === 'source'
                    ? 'API Source'
                    : 'API Validation'}
              </h1>
            </div>
            <div className="toolbar">
              {!async && (
                <button disabled={locked} onClick={() => setShowCodegen(true)}>
                  Generate code
                </button>
              )}
              <span className="save-status" role="status">
                {saved && !recoveryError ? (
                  <>
                    <Check size={14} /> Saved locally
                  </>
                ) : (
                  'Draft not saved'
                )}
              </span>
              <button
                className="icon-button"
                disabled={!history.past.length || importing}
                aria-label="Undo"
                title="Undo"
                onClick={() => {
                  dispatch({ type: 'undo' });
                  setError('');
                  setNotice('Previous edit restored.');
                }}
              >
                <Undo2 size={17} />
              </button>
              <button
                className="icon-button"
                disabled={!history.future.length || importing}
                aria-label="Redo"
                title="Redo"
                onClick={() => {
                  dispatch({ type: 'redo' });
                  setError('');
                  setNotice('Edit reapplied.');
                }}
              >
                <Redo2 size={17} />
              </button>
              <button
                className="import-button"
                disabled={importing}
                onClick={() => fileInput.current?.click()}
              >
                <Upload size={16} /> {importing ? 'Importing…' : 'Import'}
              </button>
              <input
                hidden
                ref={fileInput}
                type="file"
                accept=".json,.yaml,.yml,application/json,application/yaml,text/yaml"
                aria-label="Import API file"
                onChange={(event) => {
                  void importFile(event.target.files?.[0]);
                  event.target.value = '';
                }}
              />
              <button
                className={
                  (dirty && view === 'source') ||
                  (view === 'design' && (showingComponents || adding))
                    ? ''
                    : 'primary'
                }
                disabled={importing}
                onClick={exportDocument}
              >
                <Download size={16} /> Export {format.toUpperCase()}
              </button>
            </div>
          </header>
          {theme.error && (
            <div className="banner" role="status">
              {theme.error}
            </div>
          )}
          {recoveryError && (
            <div className="banner error" role="alert">
              <span>{recoveryError}</span>
              <button
                onClick={() => {
                  try {
                    download(
                      localStorage.getItem(storageKey) ?? '',
                      'apibldr-recovery.json',
                      'application/json',
                    );
                  } catch {
                    setError(
                      'Browser storage is unavailable. Keep this tab open and retry recovery.',
                    );
                  }
                }}
              >
                Download saved data
              </button>
              <button
                onClick={() => {
                  if (
                    window.confirm(
                      'Replace the unreadable saved workspace? Download its data first if you need it.',
                    )
                  )
                    setRecoveryError('');
                }}
              >
                Start a fresh draft
              </button>
            </div>
          )}
          {storageError && (
            <div className="banner error" role="alert">
              <span>{storageError}</span>
              <button onClick={() => persist(workspace)}>Retry saving</button>
              <button
                onClick={() =>
                  download(source, `apibldr-draft.${format}`, 'text/plain')
                }
              >
                Download draft
              </button>
            </div>
          )}
          {!online && (
            <div className="banner">
              You’re offline. You can keep editing, importing, and exporting in
              this open tab.
            </div>
          )}
          {error && (
            <div className="banner error" role="alert">
              <span>{error}</span>
              <button
                className="icon-button"
                aria-label="Dismiss error"
                onClick={() => setError('')}
              >
                <X size={16} />
              </button>
            </div>
          )}

          <div
            className={`workspace ${view !== 'design' || !navigationOpen ? 'workspace-wide' : ''}`}
          >
            {view === 'design' && navigationOpen && (
              <aside className="sidebar" aria-label="API navigation">
                <div className="navigation-tabs" aria-label="Designer sections">
                  {(['general', 'paths', 'components'] as const).map((tab) => (
                    <button
                      key={tab}
                      aria-pressed={navTab === tab}
                      onClick={() => {
                        setNavTab(tab);
                        setAdding(false);
                        if (tab === 'general') {
                          setGeneralSection('details');
                          setSelected(null);
                          setAdding(false);
                        }
                      }}
                    >
                      {tab === 'paths' && async
                        ? 'Channels'
                        : tab[0].toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </div>
                <div className="sidebar-content">
                  {navTab === 'general' && (
                    <>
                      <button
                        className={`detail-nav ${generalSection === 'details' && !operation && !adding ? 'selected' : ''}`}
                        aria-current={
                          generalSection === 'details' && !operation && !adding
                            ? 'page'
                            : undefined
                        }
                        aria-label="API Details"
                        onClick={() => {
                          setSelected(null);
                          setGeneralSection('details');
                          setAdding(false);
                        }}
                      >
                        <Info size={20} />
                        <span>
                          <strong>API Details</strong>
                          <small>Name, version, description</small>
                        </span>
                      </button>
                      <button
                        className={`detail-nav ${generalSection === 'security' ? 'selected' : ''}`}
                        onClick={() => {
                          setGeneralSection('security');
                          setSelected(null);
                          setAdding(false);
                        }}
                      >
                        <KeyRound size={20} />
                        <span>
                          <strong>API Security</strong>
                          <small>Apply authentication requirements</small>
                        </span>
                      </button>
                      <button
                        className={`detail-nav ${generalSection === 'documentation' ? 'selected' : ''}`}
                        onClick={() => setGeneralSection('documentation')}
                      >
                        <FileText size={20} />
                        <span>
                          <strong>API Documentation</strong>
                          <small>Contact, license, external docs</small>
                        </span>
                      </button>
                      <button
                        className={`section-nav ${generalSection === 'servers' ? 'selected' : ''}`}
                        onClick={() => setGeneralSection('servers')}
                      >
                        <span className="section-count">{serverCount}</span>{' '}
                        Servers <Globe size={15} />
                      </button>
                      {Array.isArray(document.servers) &&
                        document.servers.map(
                          (server, index) =>
                            isObject(server) && (
                              <button
                                className="nav-item server-link"
                                key={index}
                                onClick={() => setGeneralSection('servers')}
                              >
                                <Globe size={15} />
                                <code>
                                  {text(server.url) || 'Unnamed server'}
                                </code>
                              </button>
                            ),
                        )}
                      <button
                        className={`section-nav ${generalSection === 'tags' ? 'selected' : ''}`}
                        onClick={() => setGeneralSection('tags')}
                      >
                        <span className="section-count">{tagCount}</span> Tags{' '}
                        <Tags size={15} />
                      </button>
                      <p className="sidebar-hint">
                        {async
                          ? 'Use Channels to describe message flows.'
                          : 'Use Paths to add endpoints.'}{' '}
                        Advanced fields are available in Source.
                      </p>
                    </>
                  )}
                  {navTab === 'paths' && !async && (
                    <>
                      <div className="section-nav section-title">
                        <span className="section-count">
                          {operations.length}
                        </span>{' '}
                        Operations
                      </div>
                      <label className="search-field">
                        <Search size={15} />
                        <span className="sr-only">Find an operation</span>
                        <input
                          value={query}
                          placeholder="Find an operation…"
                          onChange={(event) => setQuery(event.target.value)}
                        />
                      </label>
                      <nav className="operation-list" aria-label="Operations">
                        {filtered.map((item) => (
                          <button
                            className={`nav-item ${selected === `${item.method} ${item.path}` ? 'selected' : ''}`}
                            aria-current={
                              selected === `${item.method} ${item.path}`
                                ? 'page'
                                : undefined
                            }
                            title={`${item.method.toUpperCase()} ${item.path}${text(item.value.summary) ? ` — ${text(item.value.summary)}` : ''}`}
                            key={`${item.method} ${item.path}`}
                            onClick={() => {
                              setSelected(`${item.method} ${item.path}`);
                              setAdding(false);
                            }}
                          >
                            <span className={`method ${item.method}`}>
                              {item.method}
                            </span>{' '}
                            <code>{item.path}</code>
                          </button>
                        ))}
                      </nav>
                      {!operations.length && (
                        <p className="sidebar-hint">
                          No paths defined. Add an operation to start designing
                          your API.
                        </p>
                      )}
                      {operations.length > 0 && !filtered.length && (
                        <div className="sidebar-hint">
                          No matching operations.
                          <button
                            className="text-button"
                            onClick={() => setQuery('')}
                          >
                            Clear search
                          </button>
                        </div>
                      )}
                      <button
                        className="add-operation"
                        disabled={locked}
                        onClick={startOperation}
                      >
                        <Plus size={16} /> Add operation
                      </button>
                    </>
                  )}
                  {navTab === 'paths' && async && (
                    <>
                      <div className="section-nav section-title">
                        <span className="section-count">
                          {Object.keys(document.channels ?? {}).length}
                        </span>{' '}
                        Channels
                      </div>
                      <nav
                        className="operation-list"
                        aria-label="Channel navigation"
                      >
                        {Object.keys(document.channels ?? {}).map((name) => (
                          <button
                            key={name}
                            className={`nav-item ${selected === `channel ${name}` ? 'selected' : ''}`}
                            onClick={() => setSelected(`channel ${name}`)}
                          >
                            <code>{name}</code>
                          </button>
                        ))}
                      </nav>
                      <p className="sidebar-hint">
                        Channels describe topics and queues. Add operations and
                        message definitions in the editor.
                      </p>
                    </>
                  )}
                  {navTab === 'components' && (
                    <>
                      <p className="sidebar-hint">
                        Reusable definitions. Choose a category to add and edit
                        components.
                      </p>
                      {(async
                        ? asyncComponentCategories
                        : componentCategories
                      ).map((key) => (
                        <button
                          className={`section-nav ${componentCategory === key ? 'selected' : ''}`}
                          key={key}
                          aria-current={
                            componentCategory === key ? 'page' : undefined
                          }
                          onClick={() => {
                            setComponentCategory(key);
                            setAdding(false);
                          }}
                        >
                          <span className="section-count">
                            {isObject(components[key])
                              ? Object.keys(components[key]).length
                              : 0}
                          </span>
                          {componentCatalog[key].title}
                          <Layers size={15} />
                        </button>
                      ))}
                    </>
                  )}
                  {locked && (
                    <p className="sidebar-hint">
                      {dirty
                        ? 'Apply your source changes to continue visual editing.'
                        : 'Import is in progress.'}
                    </p>
                  )}
                </div>
                <div className="sidebar-bottom">
                  <FolderOpen size={16} />
                  <div>
                    <strong>{document.info.title || 'Untitled API'}</strong>
                    <span>{specLabel(document)} · Browser workspace</span>
                  </div>
                </div>
              </aside>
            )}

            <div className="editor-area">
              <div className="content-breadcrumb">
                <span>
                  {view === 'design'
                    ? 'Design'
                    : view === 'source'
                      ? 'Code'
                      : 'Validate'}
                </span>
                <span>/</span>
                <strong>
                  {view === 'source'
                    ? 'Source'
                    : view === 'validation'
                      ? 'Document checks'
                      : showingComponents
                        ? componentCatalog[componentCategory].title
                        : adding
                          ? 'New operation'
                          : operation
                            ? operation.path
                            : async && navTab === 'paths'
                              ? 'Channels'
                              : generalSection === 'details'
                                ? 'Information'
                                : generalSection[0].toUpperCase() +
                                  generalSection.slice(1)}
                </strong>
              </div>
              <main
                id="editor"
                tabIndex={-1}
                className="visual-editor"
                hidden={view !== 'design'}
              >
                {dirty && (
                  <div className="inline-notice">
                    Your source has unapplied changes.{' '}
                    <button
                      className="text-button"
                      onClick={() => setView('source')}
                    >
                      Open Source to apply them
                    </button>
                  </div>
                )}
                <fieldset disabled={locked} className="editor-fieldset">
                  {showingComponents ? (
                    <ComponentWorkspace
                      key={componentCategory}
                      category={componentCategory}
                      document={document}
                      onChange={updateDocument}
                    />
                  ) : navTab === 'general' && generalSection !== 'details' ? (
                    <GeneralSettings
                      key={generalSection}
                      section={generalSection}
                      onNavigate={setGeneralSection}
                      document={document}
                      onChange={updateDocument}
                    />
                  ) : async && navTab === 'paths' ? (
                    <AsyncChannels
                      selectedChannel={
                        selected?.startsWith('channel ')
                          ? selected.slice(8)
                          : undefined
                      }
                      onSelectChannel={(name) => setSelected(`channel ${name}`)}
                      document={document}
                      onChange={updateDocument}
                    />
                  ) : adding ? (
                    <>
                      <h2 className="content-title">Add an operation</h2>
                      <p className="lede">
                        Start with the method and path. Describe the details
                        next.
                      </p>
                      <form onSubmit={createOperation} className="form-section">
                        <label>
                          HTTP method
                          <select name="method">
                            {methods.map((method) => (
                              <option key={method} value={method}>
                                {method.toUpperCase()}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Path
                          <input
                            name="path"
                            list="path-suggestions"
                            autoComplete="off"
                            autoFocus
                            placeholder="/resources/{id}"
                            required
                            aria-describedby="path-hint"
                          />
                        </label>
                        <datalist id="path-suggestions">
                          {suggestPaths(document).map((path) => (
                            <option key={path} value={path} />
                          ))}
                        </datalist>
                        <p id="path-hint" className="muted small">
                          Use braces for path parameters. Existing path-level
                          definitions are preserved.
                        </p>
                        <div className="form-actions">
                          <button
                            type="button"
                            onClick={() => setAdding(false)}
                          >
                            Cancel
                          </button>
                          <button type="submit" className="primary">
                            <Plus size={15} /> Add operation
                          </button>
                        </div>
                      </form>
                    </>
                  ) : operation ? (
                    <>
                      <PathSettings
                        key={operation.path}
                        document={document}
                        path={operation.path}
                        onChange={updateDocument}
                        onRename={(path) =>
                          setSelected(`${operation.method} ${path}`)
                        }
                      />
                      <OperationEditor
                        key={selected}
                        operation={operation}
                        document={document}
                        onOpenSource={() =>
                          openSourceSection(
                            `parameters and schemas for ${operation.method.toUpperCase()} ${operation.path}`,
                          )
                        }
                        suggestedId={suggestOperationId(operation, document)}
                        onPatch={(patch) =>
                          updateDocument(
                            patchOperation(document, operation, patch),
                          )
                        }
                        onDelete={() => {
                          updateDocument(
                            removeOperation(document, operation),
                            'Operation removed. Use Undo to restore it.',
                          );
                          setSelected(null);
                        }}
                      />
                    </>
                  ) : (
                    <>
                      <div className="editor-intro">
                        <h2 className="content-title">API details</h2>
                        <p className="lede">
                          Give your API a name and describe what it does.
                        </p>
                      </div>
                      <section className="metadata-form">
                        <div className="metadata-row">
                          <label>
                            <span className="field-caption">API title</span>
                            <div>
                              <input
                                aria-label="API title"
                                required
                                aria-invalid={titleError || undefined}
                                aria-describedby="api-title-hint"
                                onBlur={() =>
                                  setTouchedInfo((current) => ({
                                    ...current,
                                    title: true,
                                  }))
                                }
                                value={document.info.title}
                                onChange={(event) =>
                                  updateDocument({
                                    ...document,
                                    info: {
                                      ...document.info,
                                      title: event.target.value,
                                    },
                                  })
                                }
                              />
                              <small
                                id="api-title-hint"
                                className={
                                  titleError ? 'field-error' : undefined
                                }
                                role={titleError ? 'alert' : undefined}
                              >
                                {titleError
                                  ? 'Enter an API title so people can identify this definition.'
                                  : 'Required · A name people will recognize.'}
                              </small>
                            </div>
                          </label>
                          <label>
                            <span className="field-caption">API version</span>
                            <div>
                              <input
                                aria-label="API version"
                                required
                                aria-invalid={versionError || undefined}
                                aria-describedby="api-version-hint"
                                onBlur={() =>
                                  setTouchedInfo((current) => ({
                                    ...current,
                                    version: true,
                                  }))
                                }
                                className="mono"
                                value={document.info.version}
                                onChange={(event) =>
                                  updateDocument({
                                    ...document,
                                    info: {
                                      ...document.info,
                                      version: event.target.value,
                                    },
                                  })
                                }
                              />
                              <small
                                id="api-version-hint"
                                className={
                                  versionError ? 'field-error' : undefined
                                }
                                role={versionError ? 'alert' : undefined}
                              >
                                {versionError
                                  ? 'Enter an API version, for example 1.0.0.'
                                  : 'Required · For example, 1.0.0.'}
                              </small>
                            </div>
                          </label>
                        </div>
                        <div className="description-field">
                          <label
                            htmlFor="api-description"
                            className="field-caption"
                          >
                            Description <span>(optional)</span>
                          </label>
                          <div>
                            <MarkdownInput
                              id="api-description"
                              label="API description"
                              describedBy="api-description-hint"
                              placeholder="Describe your API…"
                              value={text(document.info.description)}
                              onChange={(description) =>
                                updateDocument({
                                  ...document,
                                  info: { ...document.info, description },
                                })
                              }
                            />
                            <small id="api-description-hint">
                              Explain the purpose of your API. Markdown is
                              supported.
                            </small>
                          </div>
                        </div>
                        <details
                          className="advanced-details"
                          open={
                            Boolean(document.info.termsOfService || logo.url) ||
                            undefined
                          }
                        >
                          <summary>
                            Additional details{' '}
                            <span>Terms of service & logo</span>
                          </summary>
                          <div className="advanced-fields">
                            {async && (
                              <>
                                <TextField
                                  label="Application identifier (optional)"
                                  value={document.id}
                                  hint="A globally unique identifier, for example urn:example:orders."
                                  onChange={(id) =>
                                    updateDocument({ ...document, id })
                                  }
                                />
                                <TextField
                                  label="Default content type (optional)"
                                  value={document.defaultContentType}
                                  onChange={(defaultContentType) =>
                                    updateDocument({
                                      ...document,
                                      defaultContentType,
                                    })
                                  }
                                />
                              </>
                            )}
                            <label>
                              <span className="field-caption">
                                Terms of service <span>(optional)</span>
                              </span>
                              <div>
                                <input
                                  aria-label="Terms of service"
                                  aria-describedby="api-terms-hint"
                                  type="url"
                                  placeholder="https://example.com/terms"
                                  value={text(document.info.termsOfService)}
                                  onChange={(event) =>
                                    updateDocument({
                                      ...document,
                                      info: {
                                        ...document.info,
                                        termsOfService: event.target.value,
                                      },
                                    })
                                  }
                                />
                                <small id="api-terms-hint">
                                  The Terms of Service for the API.
                                </small>
                              </div>
                            </label>
                            <label>
                              <span className="field-caption">
                                Logo URL <span>(optional)</span>
                              </span>
                              <div>
                                <input
                                  aria-label="Logo URL"
                                  aria-describedby="api-logo-hint"
                                  type="url"
                                  placeholder="https://example.com/logo.png"
                                  value={text(logo.url)}
                                  onChange={(event) =>
                                    updateDocument({
                                      ...document,
                                      info: {
                                        ...document.info,
                                        'x-logo': {
                                          ...logo,
                                          url: event.target.value,
                                        },
                                      },
                                    })
                                  }
                                />
                                <small id="api-logo-hint">
                                  Included in the exported definition. No
                                  preview is loaded.
                                </small>
                              </div>
                            </label>
                          </div>
                        </details>
                      </section>
                      <section className="overview-next">
                        <span>
                          {operationCount
                            ? `${operationCount} operation${operationCount === 1 ? '' : 's'} defined`
                            : 'No operations defined yet'}
                        </span>
                        <button onClick={startOperation}>
                          <Plus size={16} /> Add operation
                        </button>
                      </section>
                    </>
                  )}
                </fieldset>
                <button
                  className={`validation-summary ${diagnostics.length ? 'has-issues' : ''}`}
                  onClick={() => setView('validation')}
                >
                  <ShieldCheck size={17} />
                  <span>
                    {diagnostics.length
                      ? `${diagnostics.length} basic check issue${diagnostics.length === 1 ? '' : 's'}`
                      : 'No basic check issues found'}
                  </span>
                  <ChevronRight size={15} />
                </button>
              </main>

              <section
                id="validation-editor"
                tabIndex={-1}
                className="checks validation-page"
                hidden={view !== 'validation'}
              >
                <h2 className="content-title">Document checks</h2>
                <p className="lede">
                  Review your API contract before exporting.
                </p>
                {dirty && (
                  <div className="inline-notice">
                    Results reflect the last applied source.{' '}
                    <button
                      className="text-button"
                      onClick={() => setView('source')}
                    >
                      Review source changes
                    </button>
                  </div>
                )}
                <p className="validation-scope">
                  Checks titles, versions, response descriptions, status codes,
                  and duplicate operation IDs. Run specification validation
                  below for structural checks and local references.
                </p>
                {diagnostics.length ? (
                  <ul>
                    {diagnostics.map((issue, index) => (
                      <li key={index}>
                        <code>{issue.location}</code>
                        <span>{issue.message}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="check-success">
                    <Check size={20} /> No issues found by these checks.
                  </p>
                )}
                <SpecificationChecks document={document} />
                <button onClick={() => setView('design')}>
                  Back to Designer
                </button>
              </section>

              <section
                id="source-editor"
                tabIndex={-1}
                className="source-pane"
                hidden={view !== 'source'}
                aria-label="Source editor"
              >
                <div className="source-toolbar">
                  <span>
                    <Code2 size={16} /> {document.info.title || 'Untitled API'}
                  </span>
                  <button
                    disabled={importing}
                    onClick={() => {
                      try {
                        const next = parseApi(source);
                        commit(
                          { ...workspace, source: serializeApi(next, format) },
                          'Source formatted.',
                        );
                      } catch (cause) {
                        setError(
                          cause instanceof Error
                            ? cause.message
                            : 'Correct the source before formatting.',
                        );
                      }
                    }}
                  >
                    Format source
                  </button>
                  <div className="format-toggle" aria-label="Source format">
                    {(['yaml', 'json'] as Format[]).map((item) => (
                      <button
                        key={item}
                        disabled={importing}
                        aria-pressed={format === item}
                        onClick={() => changeFormat(item)}
                      >
                        {item.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="source-description">
                  {dirty
                    ? 'Unapplied changes · draft source'
                    : 'Your API contract · editable source'}
                  <span className="completion-hint">
                    Autocomplete: Ctrl+Space · ↑↓ to choose · Enter to insert ·
                    Esc to dismiss
                  </span>
                </div>
                <div className="code-container">
                  <EditorBoundary
                    source={source}
                    onChange={changeSource}
                    readOnly={importing}
                  >
                    <Suspense
                      fallback={
                        <div className="editor-loading" role="status">
                          Loading source editor…
                        </div>
                      }
                    >
                      <SourceEditor
                        source={source}
                        format={format}
                        theme={theme.resolved}
                        readOnly={importing}
                        onChange={changeSource}
                      />
                    </Suspense>
                  </EditorBoundary>
                </div>
                <div className="source-actions">
                  <span className="muted small">
                    {dirty
                      ? 'Apply to update the visual editor.'
                      : 'Visual edits update this source.'}
                  </span>
                  <button
                    className={dirty ? 'primary' : ''}
                    disabled={!dirty || importing}
                    onClick={applySource}
                  >
                    <Check size={15} /> Apply source
                  </button>
                </div>
              </section>
            </div>
          </div>
          <footer className="statusbar">
            <span>
              © {new Date().getFullYear()} ApiBldr v{version}
              <span className="muted"> · {specLabel(document)}</span>
            </span>
            <span className="status-message" role="status">
              {notice ||
                'Ready to design. Your documents stay in this browser.'}
            </span>
            <FooterClock />
          </footer>
        </div>
      </div>
    </div>
  );
}
