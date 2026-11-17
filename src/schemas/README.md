# Bundled specification schemas

The JSON files are unmodified official schema content, with formatting normalized by Prettier. `sources.json` records the retrieval URLs and SHA-256 hashes of the original downloaded bytes (2026-11-17).

- AsyncAPI schemas: https://github.com/asyncapi/spec-json-schemas — Apache-2.0.
- OpenAPI schemas: https://spec.openapis.org — Apache-2.0.

These files are data, loaded on demand by `src/domain/validation.ts`. No user document or reference is sent to these sites. Updating schemas requires running the validation fixture suite. The `without-$id` AsyncAPI variants keep their internal references self-contained.

Validation checks the document structure described by these schemas and local JSON Pointer references. It does not execute APIs, fetch external references, validate every protocol-specific semantic rule, or infer correctness of business constraints.
