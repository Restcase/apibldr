# ApiBldr — Visual API Designer

Design HTTP and event-driven APIs with visual forms or JSON/YAML source. This
repository contains the modern React + TypeScript implementation of
[ApiBldr](https://apibldr.com), prepared for Cloudflare Workers Static Assets.

The implementation runs locally in your browser, with reusable components,
contextual guidance, autocomplete, and light/dark/system themes. The existing
public site and this repository are separate deployments.

[Open the current ApiBldr app](https://apibldr-next.gena-levin.workers.dev).

## Quick start

Use Node **24.22.0** (recorded in `.nvmrc`) and npm. With
[nvm](https://github.com/nvm-sh/nvm) installed:

```sh
git clone https://github.com/Restcase/apibldr.git
cd apibldr
nvm install
nvm use
npm ci
npm run dev
```

Open the address printed by Vite, normally `http://127.0.0.1:5173`. If that port
is occupied, Vite selects another. No account, database, or environment variables
are required for local editing.

## Supported specifications

| Format             | Support                                                                         |
| ------------------ | ------------------------------------------------------------------------------- |
| OpenAPI 3.0 / 3.1  | Visual design, source editing, import/export, and schema checks                 |
| Swagger 2.0        | Imported and converted locally to OpenAPI 3.0; exports use OpenAPI              |
| AsyncAPI 2.0–2.6   | Channels, publish/subscribe operations, messages, components, and schema checks |
| AsyncAPI 3.0 / 3.1 | Channels, send/receive operations, messages, components, and schema checks      |

Choose **New API** for a fresh definition in the current specification, or
**Change specification** to select a different family/version. Changing the
specification creates a new document; it does not convert an existing HTTP API
into an event-driven API. Undo can restore the previous workspace.

## Features

- **Visual API design:** metadata, contact/license/documentation, servers, tags,
  and security settings; OpenAPI paths, operations, parameters, request bodies,
  responses, and shared path settings.
- **AsyncAPI design:** channels, messages, correlation IDs, operation/message
  traits, and server/channel/operation/message protocol bindings. Version-specific
  structures are preserved.
- **Reusable components:** category lists, explanations, quick adds, editing,
  duplication, renaming with local-reference updates, and protected removal.
- **Schema modeling:** nested object properties, array items, required fields,
  formats and constraints; infer models from JSON and compare proposed properties
  before merging them.
- **Source editing:** CodeMirror JSON/YAML highlighting, contextual OpenAPI and
  AsyncAPI autocomplete, formatting, and explicit **Apply source**. Invalid or
  unfinished source remains recoverable.
- **Import/export:** file picker or drag-and-drop, JSON/YAML round trips, and local
  Swagger conversion. Unrecognized fields and extensions survive visual edits.
- **Validation:** basic authoring checks plus on-demand official specification
  schema and local JSON Pointer checks.
- **Workspace:** automatic browser-local saving, undo/redo for the last 30 edits
  within the tab, Markdown formatting/preview, responsive forms, and persistent
  light/dark/system themes.

Complex examples, schema composition, callbacks, protocol substructures, and
some collection settings use scoped JSON editors inside Designer. Apply those
edits before changing sections. The complete document remains available in Source.

## Editing workflow

1. Create a definition or import a `.json`, `.yaml`, or `.yml` file.
2. Configure General settings and reusable Components, then add Paths or Channels.
3. In Source, press **Ctrl+Space** for suggestions; use **↑/↓**, **Enter**, and
   **Esc** to select, insert, or dismiss them. Apply source changes to resume
   visual editing.
4. Run **Validation → Validate specification** and review the reported locations.
5. Choose JSON or YAML in Source, then **Export** a durable copy.

Form suggestions use native browser dropdowns and allow custom values.
Autocomplete assists authoring; it does not replace validation.

## Development

The stack is React, TypeScript, Vite, CodeMirror 6, YAML, Ajv, and Vitest with
Testing Library. Dependency versions are recorded in `package-lock.json`.

| Command                | Purpose                                        |
| ---------------------- | ---------------------------------------------- |
| `npm run dev`          | Start the local development server             |
| `npm test`             | Run the regression suite                       |
| `npm run test:watch`   | Run tests while editing                        |
| `npm run typecheck`    | Check strict TypeScript types                  |
| `npm run format:check` | Check source formatting                        |
| `npm run format`       | Format source and tests with Prettier          |
| `npm run build`        | Typecheck and produce Cloudflare Build Output  |
| `npm run preview`      | Preview the built application locally          |
| `npm run deploy:check` | Build and dry-run deployment without uploading |
| `npm run deploy`       | Build and deploy the configured Worker         |

GitHub Actions runs formatting checks, tests, and the deployment dry run on
pushes and pull requests. Tests cover document preservation, supported-version
round trips, component/reference operations, UI editing, conversion, validation,
source completion, persistence, and recovery.

Read [DESIGN.md](DESIGN.md) before changing the UI. Use two-space indentation,
Prettier, PascalCase React components, and `*.test.ts(x)` tests. Contributions
should explain behavior changes and verification; include screenshots for UI
changes and regression tests for document mutations.

## Project structure

| Path                          | Responsibility                                                                 |
| ----------------------------- | ------------------------------------------------------------------------------ |
| `src/components/`             | Visual designers, scoped editors, theme and source controls                    |
| `src/domain/`                 | Parsing, immutable document edits, import, validation, and history |
| `src/editor/`                 | Context-aware source completions                                               |
| `src/hooks/`                  | Theme preference and system appearance handling                                |
| `src/schemas/`                | Bundled official schemas and provenance                                        |
| `src/browser/`                | Browser adapters for local Swagger conversion                                  |
| `src/App.tsx`                 | Workspace navigation, import/export, and persistence                           |
| `src/styles.css`, `DESIGN.md` | Layout, tokens, and design conventions                                         |
| `public/`                     | Application assets and response headers                                        |
| `tests/`                      | Domain and React regression tests                                              |
| `docs/`                       | Architecture, features, and integration configuration                          |

## Cloudflare deployment

`cloudflare.config.ts` configures the Worker as **`apibldr-next`**. The build is
written to `.cloudflare/output/v1/`. No custom domain, database, or application
secrets are configured, and pushing this repository does not deploy the site.

After authenticating and selecting the intended Cloudflare account:

```sh
npx cf auth login
npm run deploy:check
npm run deploy
```

Use your CLI profile or `CLOUDFLARE_ACCOUNT_ID` to select an account. The `cf` CLI
and Cloudflare Vite plugin versions used here are release candidates; use
`npm ci` for reproducible installation. See the official
[Cloudflare project commands](https://developers.cloudflare.com/cf/projects/) and
[Workers Static Assets documentation](https://developers.cloudflare.com/workers/static-assets/).

## Storage, network use, and limits

Editing, import conversion, and validation run locally. There is no application
backend, cloud save, or collaboration. The editor does not send usage analytics. One workspace is saved per
browser origin; storage is not encrypted, and tabs do not coordinate edits.
Export backups before clearing browser data or changing origins.

Built-in code generation has been retired because the generation service is no
longer available. Export your definition as YAML or JSON to use it with external
tooling. See [code generation status](docs/generator.md).

The header includes GitHub resources and Help, and the footer shows local date/time.
The feedback button loads the existing ApiBldr Appzi form on demand.
Set `VITE_APPZI_PORTAL` and `VITE_APPZI_SURVEY` to use your own form, or set both
to empty strings to disable it. These identifiers are public, not credentials.
Page screenshot capture is disabled. Feedback is handled
by that external service, which can access the page once loaded. Markdown preview
can load images included in the Markdown.

- Documents are limited to **2 MB**. Do not include real credentials in examples.
- Visual edits and exports regenerate source; YAML comments, anchors, whitespace,
  and original formatting are not retained. Source drafts preserve their text
  while editing, applying, saving, and restoring.
- External references are preserved and reported as unchecked; they are not
  automatically fetched. Schema checks do not certify every semantic constraint
  or runtime behavior.
- OpenAPI 3.2 and standalone JSON Schema workspaces are not supported. Schema
  modeling is available within API documents.
- A loaded tab can continue local editing offline; offline reopening is not
  supported by a service worker.
- Not every specification edge case has been exhaustively
  verified. See [supported features and limits](docs/features.md).

Further details: [architecture](docs/architecture.md),
[supported features](docs/features.md), and [contributor guide](AGENTS.md).

## License

ApiBldr is licensed under the [Apache License 2.0](LICENSE).
Third-party dependencies and bundled specification schemas retain their respective
licenses; see the [schema provenance](src/schemas/README.md) for bundled schema details.
