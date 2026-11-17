import { useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  ChevronRight,
  Focus,
  Minus,
  Network,
  Plus,
  Search,
} from 'lucide-react';
import { isObject, text, type ApiDocument } from '../domain/document';
import {
  graphChildren,
  graphNode,
  graphReference,
  type GraphNode,
  type GraphTarget,
} from '../domain/graph';

const pageSize = 6;
export default function ApiGraph({
  document,
  dirty,
  onOpen,
  onSource,
}: {
  document: ApiDocument;
  dirty: boolean;
  onOpen: (target: GraphTarget) => void;
  onSource: () => void;
}) {
  const [trail, setTrail] = useState(['#']);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [zoom, setZoom] = useState(1);
  const viewport = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const drag = useRef<{
    x: number;
    y: number;
    left: number;
    top: number;
  } | null>(null);
  const crumbs = trail
    .map((id) => graphNode(document, id))
    .filter((node): node is GraphNode => Boolean(node));
  const current = crumbs.at(-1) ?? graphNode(document)!;
  const connections = useMemo(
    () => graphChildren(document, current),
    [document, current.id],
  );
  const filtered = connections.filter((node) =>
    `${node.label} ${node.kind} ${node.summary}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  const activePage = Math.min(
    page,
    Math.max(0, Math.ceil(filtered.length / pageSize) - 1),
  );
  const visible = filtered.slice(
    activePage * pageSize,
    (activePage + 1) * pageSize,
  );
  const height = Math.max(320, visible.length * 112 + 48);
  const width = 704;
  const parentY = height / 2 - 44;
  const reference = graphReference(document, current);
  const value = isObject(current.value) ? current.value : {};
  const preview = useMemo(
    () => JSON.stringify(current.value, null, 2) ?? '',
    [document, current.id],
  );
  function visit(node: GraphNode) {
    const existing = crumbs.findIndex((item) => item.id === node.id);
    setTrail(
      existing >= 0
        ? crumbs.slice(0, existing + 1).map((item) => item.id)
        : [...crumbs.map((item) => item.id), node.id],
    );
    setQuery('');
    setPage(0);
    if (viewport.current) {
      viewport.current.scrollTop = 0;
      viewport.current.scrollLeft = 0;
    }
    requestAnimationFrame(() =>
      heading.current?.focus({ preventScroll: true }),
    );
  }
  function fit() {
    if (viewport.current) {
      setZoom(
        Math.max(0.5, Math.min(1, (viewport.current.clientWidth - 24) / width)),
      );
      viewport.current.scrollTop = 0;
      viewport.current.scrollLeft = 0;
    }
  }
  return (
    <section
      id="graph-editor"
      tabIndex={-1}
      className="api-graph"
      aria-label="API graph"
    >
      {dirty && (
        <div className="inline-notice">
          This graph shows the last applied definition.{' '}
          <button onClick={onSource}>Review unapplied source</button>
        </div>
      )}
      <div className="graph-header">
        <div>
          <h2>Explore your API</h2>
          <p className="muted">
            Follow a connection to drill down. Your definition stays unchanged.
          </p>
        </div>
        <button onClick={() => visit(graphNode(document)!)}>
          <Network size={17} /> API overview
        </button>
      </div>
      <nav className="graph-breadcrumbs" aria-label="Graph location">
        {crumbs.map((node, index) => (
          <span key={`${node.id}-${index}`}>
            {index > 0 && <ChevronRight size={14} aria-hidden="true" />}
            <button
              onClick={() => visit(node)}
              aria-current={node.id === current.id ? 'location' : undefined}
              title={node.label}
            >
              {index === 0 ? 'API' : node.label}
            </button>
          </span>
        ))}
      </nav>
      <div className="graph-layout">
        <div className="graph-main">
          <div className="graph-controls">
            <label className="graph-search">
              <Search size={16} aria-hidden="true" />
              <span className="sr-only">Filter connections</span>
              <input
                type="search"
                placeholder="Filter connections…"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(0);
                }}
              />
            </label>
            <div className="graph-zoom" aria-label="Graph zoom">
              <button
                aria-label="Zoom out"
                disabled={zoom <= 0.5}
                onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
              >
                <Minus size={16} />
              </button>
              <button aria-label="Reset graph zoom" onClick={() => setZoom(1)}>
                {Math.round(zoom * 100)}%
              </button>
              <button
                aria-label="Zoom in"
                disabled={zoom >= 1.5}
                onClick={() => setZoom(Math.min(1.5, zoom + 0.1))}
              >
                <Plus size={16} />
              </button>
              <button aria-label="Fit graph to width" onClick={fit}>
                <Focus size={16} /> Fit
              </button>
            </div>
          </div>
          <div
            className="graph-viewport"
            ref={viewport}
            tabIndex={0}
            aria-label="Graph canvas. Scroll to pan; use Tab to reach nodes."
            onPointerDown={(event) => {
              if (
                event.pointerType !== 'mouse' ||
                event.button !== 0 ||
                (event.target as HTMLElement).closest('button')
              )
                return;
              drag.current = {
                x: event.clientX,
                y: event.clientY,
                left: event.currentTarget.scrollLeft,
                top: event.currentTarget.scrollTop,
              };
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={(event) => {
              if (!drag.current) return;
              event.currentTarget.scrollLeft =
                drag.current.left + drag.current.x - event.clientX;
              event.currentTarget.scrollTop =
                drag.current.top + drag.current.y - event.clientY;
            }}
            onPointerUp={() => {
              drag.current = null;
            }}
            onPointerCancel={() => {
              drag.current = null;
            }}
          >
            <div
              className="graph-size"
              style={{ width: width * zoom, height: height * zoom }}
            >
              <div
                className="graph-scene"
                style={{ width, height, transform: `scale(${zoom})` }}
              >
                <svg
                  width={width}
                  height={height}
                  className="graph-edges"
                  aria-hidden="true"
                >
                  {visible.map((node, index) => (
                    <path
                      key={node.id}
                      d={`M 288 ${parentY + 44} C 344 ${parentY + 44}, 344 ${index * 112 + 76}, 400 ${index * 112 + 76}`}
                    />
                  ))}
                </svg>
                <div
                  className="graph-node graph-current"
                  style={{ left: 32, top: parentY }}
                >
                  <span className="graph-kind">{current.kind} · selected</span>
                  <strong title={current.label}>{current.label}</strong>
                  <span>{connections.length} connections</span>
                </div>
                {visible.map((node, index) => (
                  <button
                    className="graph-node"
                    style={{ left: 400, top: index * 112 + 32 }}
                    key={node.id}
                    onClick={() => visit(node)}
                    aria-label={`Explore ${node.label}`}
                    title={node.label}
                  >
                    <span className="graph-kind">
                      {node.kind}
                      <ChevronRight size={14} />
                    </span>
                    <strong>{node.label}</strong>
                    <span>{node.summary || 'Explore definition'}</span>
                  </button>
                ))}
                {!visible.length && (
                  <div
                    className="graph-empty"
                    style={{ left: 400, top: parentY - 16 }}
                  >
                    <strong>
                      {query
                        ? 'No matching connections'
                        : current.id === '#'
                          ? 'Your API starts here'
                          : 'No further connections'}
                    </strong>
                    <p>
                      {query
                        ? 'Try a name, method, or description.'
                        : current.id === '#'
                          ? 'Add paths or channels in Designer, or load an example to explore.'
                          : 'Inspect the definition in the details panel or return to a previous node.'}
                    </p>
                    {query && (
                      <button onClick={() => setQuery('')}>Clear filter</button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="graph-pagination">
            <span role="status">
              {filtered.length
                ? `${activePage * pageSize + 1}–${Math.min((activePage + 1) * pageSize, filtered.length)} of ${filtered.length} connections`
                : '0 connections'}
              {query && ` matching “${query}”`}
            </span>
            <div>
              <button
                disabled={activePage === 0}
                onClick={() => setPage(activePage - 1)}
              >
                Previous
              </button>
              <button
                disabled={(activePage + 1) * pageSize >= filtered.length}
                onClick={() => setPage(activePage + 1)}
              >
                Next
              </button>
            </div>
          </div>
          <p className="graph-help muted small">
            Select a node to follow its connections. Drag the canvas or scroll
            to pan.
          </p>
        </div>
        <aside className="graph-details" aria-label="Selected node details">
          <span className="eyebrow">{current.kind}</span>
          <h3 ref={heading} tabIndex={-1}>
            {current.label}
          </h3>
          {current.summary && <p>{current.summary}</p>}
          {text(value.description) &&
            text(value.description) !== current.summary && (
              <p>{text(value.description)}</p>
            )}
          <dl>
            {['type', 'format', 'operationId', 'action', 'address']
              .filter((key) => value[key] !== undefined)
              .map((key) => (
                <div key={key}>
                  <dt>{key}</dt>
                  <dd>{String(value[key])}</dd>
                </div>
              ))}
            <div>
              <dt>Location</dt>
              <dd>
                <code>{current.id}</code>
              </dd>
            </div>
          </dl>
          {reference.warning && (
            <p className="inline-notice">{reference.warning}</p>
          )}
          <button className="primary" onClick={() => onOpen(current.target)}>
            <ArrowUpRight size={16} />
            {current.target.kind === 'source'
              ? 'Open in Source'
              : 'Open in Designer'}
          </button>
          {crumbs.length > 1 && (
            <button onClick={() => visit(crumbs[crumbs.length - 2])}>
              <ArrowLeft size={16} /> Back one level
            </button>
          )}
          <details key={current.id} className="graph-definition">
            <summary>View definition</summary>
            <pre>{preview.slice(0, 12000)}</pre>
            {preview.length > 12000 && (
              <p className="muted">
                Preview truncated. Open Source for the complete definition.
              </p>
            )}
          </details>
        </aside>
      </div>
    </section>
  );
}
