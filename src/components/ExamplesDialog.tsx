import { useEffect, useRef, useState } from 'react';
import { examples, type ExampleId } from '../domain/examples';

export default function ExamplesDialog({
  onClose,
  onLoad,
}: {
  onClose: () => void;
  onLoad: (id: ExampleId) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState<ExampleId>('petstore');
  useEffect(() => {
    const node = dialog.current!;
    node.showModal();
    return () => node.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="component-dialog examples-dialog"
      aria-labelledby="examples-title"
      onCancel={onClose}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onLoad(selected);
          onClose();
        }}
      >
        <h2 id="examples-title">Explore an example API</h2>
        <p>
          Loading an example replaces your current definition and any unapplied
          source changes. Undo restores your previous work. Export first to keep
          a separate copy.
        </p>
        <fieldset className="example-options">
          <legend>Choose an example</legend>
          {examples.map((example) => (
            <label key={example.id} className="example-option">
              <input
                type="radio"
                name="example"
                checked={selected === example.id}
                onChange={() => setSelected(example.id)}
              />
              <span>
                <strong>{example.title}</strong>
                <span className="muted">{example.specification}</span>
                <span>{example.description}</span>
              </span>
            </label>
          ))}
        </fieldset>
        <p className="muted small">
          Examples are bundled with the app. Loading them does not connect to
          the sample API servers or Kafka brokers.
        </p>
        <div className="form-actions">
          <button type="button" autoFocus onClick={onClose}>
            Cancel
          </button>
          <button className="primary" type="submit">
            Load example
          </button>
        </div>
      </form>
    </dialog>
  );
}
