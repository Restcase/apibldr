import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  ChevronRight,
  Focus,
  Minus,
  Network,
  Plus,
  Search,
  Layers,
  Radio,
  Route,
  Braces,
  Box,
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
const nodeWidth = 240;
const nodeHeight = 112;
const columnStep = 312;
const rowStep = 132;
const inset = 32;
const nodeIcon = (kind: string) =>
  kind === 'API'
    ? Network
    : kind === 'Path'
      ? Route
      : kind === 'Channel'
        ? Radio
        : kind === 'Schema' || kind === 'Property'
          ? Braces
          : kind === 'Operation'
            ? Layers
            : Box;
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
  const levelState = useRef(
    new Map<
      string,
      { query: string; page: number; left: number; top: number; zoom: number }
    >(),
  );
  const pendingPan = useRef<{ restore?: { left: number; top: number } } | null>(
    null,
  );
  const viewport = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const selectedNode = useRef<HTMLButtonElement>(null);
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
  const height = Math.max(420, visible.length * rowStep + inset * 2);
  const width = columnStep * crumbs.length + nodeWidth + inset * 2;
  const parentY = height / 2 - nodeHeight / 2;
  const currentX = inset + (crumbs.length - 1) * columnStep;
  const childX = inset + crumbs.length * columnStep;
  const nodes = [
    ...crumbs.map((node, index) => ({
      node,
      x: inset + index * columnStep,
      y: parentY,
      context: true,
      selected: node.id === current.id,
    })),
    ...visible
      .filter((node) => !crumbs.some((crumb) => crumb.id === node.id))
      .map((node) => ({
        node,
        x: childX,
        y: inset + visible.indexOf(node) * rowStep,
        context: false,
        selected: false,
      })),
  ];
  const reducedMotion = () =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  useLayoutEffect(() => {
    const pending = pendingPan.current;
    const canvas = viewport.current;
    if (!pending || !canvas) return;
    pendingPan.current = null;
    const position = pending.restore ?? {
      left: Math.max(
        0,
        (childX + nodeWidth + inset) * zoom - canvas.clientWidth,
      ),
      top: Math.max(
        0,
        (parentY + nodeHeight / 2) * zoom - canvas.clientHeight / 2,
      ),
    };
    if (canvas.scrollTo)
      canvas.scrollTo({
        ...position,
        behavior: reducedMotion() ? 'instant' : 'smooth',
      });
    requestAnimationFrame(() =>
      selectedNode.current?.focus({ preventScroll: true }),
    );
  }, [current.id, childX, parentY, zoom]);
  const reference = graphReference(document, current);
  const value = isObject(current.value) ? current.value : {};
  const preview = useMemo(
    () => JSON.stringify(current.value, null, 2) ?? '',
    [document, current.id],
  );
  function visit(node: GraphNode) {
    if (node.id === current.id) {
      heading.current?.focus({ preventScroll: true });
      return;
    }
    levelState.current.set(current.id, {
      query,
      page: activePage,
      left: viewport.current?.scrollLeft ?? 0,
      top: viewport.current?.scrollTop ?? 0,
      zoom,
    });
    const existing = crumbs.findIndex((item) => item.id === node.id);
    const saved = levelState.current.get(node.id);
    // Keep the whole route visible while it fits at a readable scale.
    // Longer routes pan instead of shrinking labels indefinitely.
    const nextDepth = existing >= 0 ? existing + 1 : crumbs.length + 1;
    const nextWidth = columnStep * nextDepth + nodeWidth + inset * 2;
    const available = viewport.current?.clientWidth ?? 0;
    const fittingZoom = (available - 24) / nextWidth;
    if (saved) setZoom(saved.zoom);
    else if (available > 0 && fittingZoom >= 0.75 && fittingZoom < zoom)
      setZoom(fittingZoom);
    pendingPan.current =
      existing >= 0 && saved
        ? { restore: { left: saved.left, top: saved.top } }
        : {};
    setTrail(
      existing >= 0
        ? crumbs.slice(0, existing + 1).map((item) => item.id)
        : [...crumbs.map((item) => item.id), node.id],
    );
    setQuery(saved?.query ?? '');
    setPage(saved?.page ?? 0);
  }
  function fit() {
    if (viewport.current) {
      setZoom(
        Math.max(
          0.5,
          Math.min(
            1,
            (viewport.current.clientWidth - 24) / width,
            (viewport.current.clientHeight - 24) / height,
          ),
        ),
      );
      viewport.current.scrollTo?.({
        top: 0,
        left: 0,
        behavior: reducedMotion() ? 'instant' : 'smooth',
      });
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
            Follow connections from your API to its definitions. Your route
            stays on the canvas.
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
                  {crumbs.slice(1).map((node, index) => (
                    <path
                      className="graph-route-edge"
                      key={`route-${node.id}`}
                      d={`M ${inset + index * columnStep + nodeWidth} ${parentY + nodeHeight / 2} H ${inset + (index + 1) * columnStep}`}
                    />
                  ))}
                  {visible.map((node, index) => {
                    const ancestor = crumbs.findIndex(
                      (crumb) => crumb.id === node.id,
                    );
                    const x =
                      ancestor >= 0 ? inset + ancestor * columnStep : childX;
                    const y =
                      ancestor >= 0
                        ? parentY + nodeHeight / 2
                        : inset + index * rowStep + nodeHeight / 2;
                    return (
                      <path
                        className="graph-connection-edge"
                        key={`${current.id}-${node.id}`}
                        d={
                          ancestor >= 0
                            ? `M ${currentX + nodeWidth / 2} ${parentY} C ${currentX + nodeWidth / 2} ${parentY - 60}, ${x + nodeWidth / 2} ${parentY - 60}, ${x + nodeWidth / 2} ${parentY}`
                            : `M ${currentX + nodeWidth} ${parentY + nodeHeight / 2} C ${currentX + nodeWidth + 36} ${parentY + nodeHeight / 2}, ${childX - 36} ${y}, ${x} ${y}`
                        }
                      />
                    );
                  })}
                </svg>
                {nodes.map(({ node, x, y, context, selected }) => {
                  const Icon = nodeIcon(node.kind);
                  return (
                    <button
                      ref={selected ? selectedNode : undefined}
                      className={`graph-node ${selected ? 'graph-current' : context ? 'graph-ancestor' : 'graph-child'}`}
                      style={{ left: x, top: y }}
                      key={node.id}
                      onClick={() => visit(node)}
                      aria-label={
                        selected
                          ? `Selected ${node.label}`
                          : context
                            ? `Return to ${node.label}`
                            : `Explore ${node.label}`
                      }
                      aria-current={selected ? 'location' : undefined}
                      title={node.label}
                    >
                      <span className="graph-kind">
                        <span>
                          <Icon size={15} aria-hidden="true" /> {node.kind}
                        </span>
                        {selected ? (
                          <span className="graph-selected-label">Selected</span>
                        ) : context ? (
                          <ArrowLeft size={14} />
                        ) : (
                          <ChevronRight size={14} />
                        )}
                      </span>
                      <strong>{node.label}</strong>
                      <span>
                        {selected
                          ? `${connections.length} connections`
                          : context
                            ? 'Earlier in your route'
                            : node.summary || 'Explore definition'}
                      </span>
                    </button>
                  );
                })}
                {!visible.length && (
                  <div
                    className="graph-empty"
                    style={{ left: childX, top: parentY - 16 }}
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
            <span className="sr-only" aria-live="polite">
              Selected {current.label}. Level {crumbs.length}.
            </span>
            <span role="status">
              {filtered.length
                ? `${activePage * pageSize + 1}–${Math.min((activePage + 1) * pageSize, filtered.length)} of ${filtered.length} connections`
                : '0 connections'}
              {query && ` matching “${query}”`}
            </span>
            {filtered.length > pageSize && (
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
            )}
          </div>
          <p className="graph-help muted small">
            Your route stays connected. Select an earlier node to go back. Drag
            or scroll to pan; Fit shows more of the route.
          </p>
        </div>
        <aside className="graph-details" aria-label="Selected node details">
          <div className="graph-details-heading">
            <span className="eyebrow">
              Selected {current.kind.toLowerCase()}
            </span>
            <span className="graph-depth">Level {crumbs.length}</span>
          </div>
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
            <p className="graph-location">
              <span>Location</span>
              <code>{current.id}</code>
            </p>
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
