# Architecture

ApiBldr is a React and TypeScript application served as static assets. Editing,
import conversion, validation, and workspace persistence run in the browser.
Cloudflare Workers Static Assets serves the production build.

## Document model and editing

`src/domain/` owns parsing and immutable document transformations. The imported
API definition is the editing model, including unfamiliar fields and extensions.
Visual controls update selected fields without rebuilding the whole contract.
OpenAPI and AsyncAPI retain their different document structures; creating a new
specification does not convert an existing document between families.

`src/App.tsx` coordinates navigation, import/export, history, and persistence.
React forms live in `src/components/`. Advanced structures use JSON editors for
the selected definition. Apply these drafts before leaving their section.

Source editing uses CodeMirror with JSON/YAML completion from `src/editor/`.
Unapplied source is separate from the active document. Invalid source remains
editable and blocks conflicting visual changes until applied or discarded.

## Persistence and import

One workspace is stored per browser origin in localStorage. Source drafts are
recoverable; undo/redo retains the last 30 edits in the current tab. Tabs do not
coordinate writes. Export files for backups or transfers between deployments.

JSON/YAML imports are limited to 2 MB. Swagger 2 conversion runs locally through
browser adapters that disable file and network resolution. Visual edits and
exports regenerate source, so original YAML comments and formatting are not
preserved.

## Validation

Basic checks provide authoring feedback. On-demand specification validation uses
Ajv and bundled official schemas from `src/schemas/`; provenance is documented
there. Local JSON Pointer references are checked. External references remain
unchanged and are reported as unchecked. Validation does not execute APIs or
prove every semantic or runtime constraint.

## External integrations

The retired code-generation integration makes no requests. The editor exports
YAML and JSON definitions locally for use with external tooling.

The feedback control loads the configured Appzi widget on demand, with screenshot
capture disabled. Public portal and survey IDs can be overridden at build time. Its form,
contact link, and delivery are managed by Appzi. No API definition is explicitly
attached by ApiBldr; the third-party widget can access the page after loading.
Markdown previews can also load images referenced by their content.

## Verification and deployment

Vitest covers domain logic and Testing Library covers user interactions. Network
integrations use mocked services in tests. CI runs formatting checks, tests, and
a Cloudflare deployment dry run. See the README for local and deployment commands.

## Assets

The GitHub mark in `public/github-mark.png` comes from the
[GitHub brand assets](https://github.com/logos). It identifies the repository links.
