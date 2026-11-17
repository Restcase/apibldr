# Repository Guidelines

## Project Structure & Module Organization

ApiBldr is a browser-based React and TypeScript API designer. Keep UI components
in `src/components/`, document transformations in `src/domain/`, completion logic
in `src/editor/`, hooks in `src/hooks/`, and external widget integration in `src/integrations/`. `src/schemas/` contains bundled
specification schemas and their provenance. Tests live in `tests/`; public assets
and response headers live in `public/`. Read `DESIGN.md` before changing the UI.

## Build, Test, and Development Commands

Use the Node version in `.nvmrc` and install dependencies with `npm ci`.

- `npm run dev`: start Vite locally; use the URL it prints.
- `npm test`: run Vitest and Testing Library regression tests.
- `npm run test:watch`: rerun tests while editing.
- `npm run typecheck`: check strict TypeScript types.
- `npm run format:check`: check Prettier formatting; `npm run format` applies it.
- `npm run build`: typecheck and create Cloudflare Build Output.
- `npm run deploy:check`: build and dry-run deployment without uploading.

GitHub Actions runs formatting, tests, and the deployment dry run. Actual
deployment uses `npm run deploy` with an authenticated Cloudflare account.

## Coding Style & Naming Conventions

Use two-space indentation, single quotes, trailing commas, and the existing
Prettier configuration. Name React components with PascalCase and domain modules
with descriptive lowercase names. Keep document transformations independent of
React. Preserve unknown specification fields and references when editing.

## Testing Guidelines

Name tests `*.test.ts` or `*.test.tsx`. Add regression coverage for document
mutations, reference handling, import failures, and draft recovery. Use synthetic
definitions and mocked external services. Test configured and unconfigured
integrations without submitting real feedback or API documents. No numeric
coverage threshold is configured.

## Commit & Pull Request Guidelines

Use short, imperative commit subjects, such as `Add schema validation`. Explain
behavior changes, link relevant issues, and report verification in pull requests.
Include screenshots for visible UI changes. Keep unrelated changes separate.

## Public Content & Configuration

Keep credentials, local checkout paths, private repository details, and internal
work notes out of tracked files. Document public behavior and supported limits.
Use `.env.local` for local settings and `.env.example` for placeholders. Browser
configuration is public; never put secrets in `VITE_*` variables. Retain third-party
license notices and schema provenance.
