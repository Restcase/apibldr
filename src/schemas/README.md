# Bundled specification schemas

The JSON files are unmodified official schema content, with formatting normalized by Prettier. `sources.json` records the retrieval URLs and SHA-256 hashes of the original downloaded bytes (2026-11-17).

- AsyncAPI schemas: https://github.com/asyncapi/spec-json-schemas — Apache-2.0.
- OpenAPI schemas: https://spec.openapis.org — Apache-2.0.

These files are data, loaded on demand by `src/domain/validation.ts`. No user document or reference is sent to these sites. Updating schemas requires running the validation fixture suite. The `without-$id` AsyncAPI variants keep their internal references self-contained.

Validation checks the document structure described by these schemas and local JSON Pointer references. It does not execute APIs, fetch external references, validate every protocol-specific semantic rule, or infer correctness of business constraints.

For the standalone OpenAPI 3.1 document schema, the runtime makes a copy and
resolves its `#meta` dynamic references statically to `$defs/schema`. This works
around [Ajv's nested dynamic-anchor limitation](https://ajv.js.org/guide/combining-schemas.html#extending-recursive-schemas)
while retaining the official schema's object-or-boolean constraint. The bundle
on disk is unchanged. As specified by this official schema, OpenAPI 3.1 Schema
Object keywords are not themselves validated; document structure and local
references are checked.
