import { useEffect, useRef, useState } from 'react';
export default function NewDocumentDialog({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (spec: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [spec, setSpec] = useState('asyncapi:2.6.0');
  useEffect(() => {
    const node = dialog.current!;
    node.showModal();
    node.querySelector<HTMLButtonElement>('button')?.focus();
    return () => node.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="component-dialog"
      onCancel={onClose}
      aria-labelledby="new-document-heading"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onCreate(spec);
          onClose();
        }}
      >
        <h2 id="new-document-heading">Choose an API specification</h2>
        <p>
          Create a new definition. Your current document can be restored with
          Undo. Export it first if you need a separate copy.
        </p>
        <label>
          Specification
          <select value={spec} onChange={(e) => setSpec(e.target.value)}>
            <optgroup label="OpenAPI — HTTP APIs">
              <option value="openapi:3.1.0">OpenAPI 3.1</option>
              <option value="openapi:3.0.3">OpenAPI 3.0</option>
            </optgroup>
            <optgroup label="AsyncAPI — event-driven APIs">
              <option value="asyncapi:2.6.0">
                AsyncAPI 2.6 (publish / subscribe)
              </option>
              <option value="asyncapi:2.0.0">
                AsyncAPI 2.0 (original ApiBldr)
              </option>
              <option value="asyncapi:3.0.0">
                AsyncAPI 3.0 (send / receive)
              </option>
              <option value="asyncapi:3.1.0">
                AsyncAPI 3.1 (send / receive)
              </option>
            </optgroup>
          </select>
        </label>
        <p className="muted">
          Changing the specification creates a fresh document; it does not
          convert the semantics of your existing API.
        </p>
        <div className="form-actions">
          <button type="button" autoFocus onClick={onClose}>
            Cancel
          </button>
          <button className="primary" type="submit">
            Create definition
          </button>
        </div>
      </form>
    </dialog>
  );
}
