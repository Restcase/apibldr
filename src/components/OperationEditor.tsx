import OperationExtras from './OperationExtras';
import { useState, type FormEvent } from 'react';
import { ArrowDownRight, Plus, Trash2 } from 'lucide-react';
import {
  isObject,
  text,
  type JsonObject,
  type ApiDocument,
  type Operation,
} from '../domain/document';
import { responseStatuses } from '../domain/suggestions';

export default function OperationEditor({
  operation,
  document,
  onPatch,
  onDelete,
  suggestedId,
  onOpenSource,
}: {
  operation: Operation;
  document?: ApiDocument;
  onPatch: (patch: JsonObject) => void;
  onDelete: () => void;
  suggestedId?: string;
  onOpenSource: () => void;
}) {
  const [responseError, setResponseError] = useState('');
  const [responseStatus, setResponseStatus] = useState('');
  const [responseDescription, setResponseDescription] = useState('');
  const responses = isObject(operation.value.responses)
    ? operation.value.responses
    : {};
  function addResponse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = responseStatus.trim();
    if (!/^(default|[1-5](\d{2}|XX))$/.test(code))
      return setResponseError(
        'Use a status such as 200, 404, 2XX, or default.',
      );
    if (Object.hasOwn(responses, code))
      return setResponseError(
        `Response ${code} already exists. Edit it above.`,
      );
    onPatch({
      responses: {
        ...responses,
        [code]: { description: responseDescription },
      },
    });
    setResponseError('');
    setResponseStatus('');
    setResponseDescription('');
  }
  return (
    <>
      <div className="eyebrow">Operation</div>
      <h2 className="operation-title">
        <span className={`method ${operation.method}`}>{operation.method}</span>{' '}
        <code>{operation.path}</code>
      </h2>
      <p className="lede">
        Describe what this endpoint does and what it returns.
      </p>
      <section className="form-section operation-details">
        <h2>Details</h2>
        <div className="operation-fields">
          <label>
            Summary <span>(optional)</span>
            <input
              value={text(operation.value.summary)}
              placeholder="A short description of this operation"
              onChange={(e) => onPatch({ summary: e.target.value })}
            />
          </label>
          <label>
            Operation ID <span>(optional)</span>
            <input
              className="mono"
              list="operation-id-suggestions"
              autoComplete="off"
              value={text(operation.value.operationId)}
              placeholder="listResources"
              onChange={(e) => onPatch({ operationId: e.target.value })}
            />
          </label>
          <datalist id="operation-id-suggestions">
            {suggestedId && <option value={suggestedId} />}
          </datalist>
          <label>
            Description <span>(optional)</span>
            <textarea
              rows={3}
              value={text(operation.value.description)}
              placeholder="Explain the behavior, constraints, and expected use."
              onChange={(e) => onPatch({ description: e.target.value })}
            />
          </label>
        </div>
      </section>
      <section className="form-section">
        <h2>
          <ArrowDownRight size={17} /> Responses{' '}
          <span className="count">
            {
              Object.keys(responses).filter((key) => !key.startsWith('x-'))
                .length
            }
          </span>
        </h2>
        {!Object.keys(responses).some((key) => !key.startsWith('x-')) && (
          <p className="muted response-empty">
            No responses yet. Add a status and description to explain what this
            operation returns.
          </p>
        )}
        {Object.entries(responses)
          .filter(([key]) => !key.startsWith('x-'))
          .map(([code, response]) => (
            <div className="response-row" key={code}>
              <code className="status-code">{code}</code>
              {isObject(response) && !response.$ref ? (
                <label className="grow">
                  <span className="sr-only">Response {code} description</span>
                  <input
                    value={text(response.description)}
                    onChange={(e) =>
                      onPatch({
                        responses: {
                          ...responses,
                          [code]: { ...response, description: e.target.value },
                        },
                      })
                    }
                  />
                </label>
              ) : (
                <p className="muted grow">
                  {isObject(response) && response.$ref
                    ? `Reference: ${text(response.$ref)}`
                    : 'Edit this response in source.'}
                </p>
              )}
              <button
                className="icon-button danger"
                aria-label={`Remove response ${code}`}
                title="Remove response (Undo available)"
                onClick={() => {
                  const next = { ...responses };
                  delete next[code];
                  onPatch({ responses: next });
                }}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        <form className="response-form" onSubmit={addResponse}>
          <label>
            Status
            <input
              name="status"
              list="response-status-suggestions"
              autoComplete="off"
              value={responseStatus}
              onChange={(event) => {
                setResponseStatus(event.target.value);
                setResponseError('');
              }}
              aria-invalid={Boolean(responseError) || undefined}
              placeholder="201"
              required
              aria-describedby={responseError ? 'response-error' : undefined}
            />
          </label>
          <datalist id="response-status-suggestions">
            {Object.entries(responseStatuses)
              .filter(([code]) => !Object.hasOwn(responses, code))
              .map(([code, description]) => (
                <option key={code} value={code}>
                  {description}
                </option>
              ))}
          </datalist>
          <label className="grow">
            Description
            <input
              name="description"
              list="response-description-suggestions"
              autoComplete="off"
              value={responseDescription}
              onChange={(event) => setResponseDescription(event.target.value)}
              placeholder="Resource created"
              required
            />
          </label>
          <datalist id="response-description-suggestions">
            {responseStatuses[responseStatus.trim()] && (
              <option value={responseStatuses[responseStatus.trim()]} />
            )}
          </datalist>
          <button
            type="submit"
            className="icon-button"
            aria-label="Add response"
          >
            <Plus size={18} />
          </button>
        </form>
        {responseError && (
          <p role="alert" id="response-error" className="error-text">
            {responseError}
          </p>
        )}
      </section>
      <OperationExtras
        value={operation.value}
        document={
          document ?? { openapi: '3.1.0', info: { title: '', version: '' } }
        }
        patch={onPatch}
      />
      <div className="form-section">
        <button className="text-button danger" onClick={onDelete}>
          <Trash2 size={15} /> Remove operation
        </button>
        <p className="muted small">You can restore it with Undo.</p>
      </div>
    </>
  );
}
