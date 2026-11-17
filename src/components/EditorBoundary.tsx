import { Component, type ReactNode } from 'react';

export default class EditorBoundary extends Component<
  {
    source: string;
    onChange: (value: string) => void;
    readOnly: boolean;
    children: ReactNode;
  },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="editor-fallback">
        <p role="alert">
          The code editor could not load. You can still edit and export using
          the plain text editor below.
        </p>
        <label className="sr-only" htmlFor="fallback-source">
          API source
        </label>
        <textarea
          id="fallback-source"
          value={this.props.source}
          readOnly={this.props.readOnly}
          onChange={(event) => this.props.onChange(event.target.value)}
          spellCheck={false}
        />
      </div>
    );
  }
}
