# Code generation status

Built-in client and server code generation has been retired. The generation
service is no longer available, so the application no longer offers generator
targets, downloads generated ZIP archives, or uploads definitions for generation.

## Export a definition

1. Apply any pending Source edits.
2. Use Validation to check the definition.
3. Choose YAML or JSON in Source and use Export to download it.
4. Use the exported file with external tooling that supports your specification
   and version.

Export works locally for OpenAPI and AsyncAPI. ApiBldr does not validate the
output or dependencies produced by external generators.

## Existing deployments

`VITE_GENERATOR_URL` is no longer used and can be removed from deployment settings
and local environment files. No replacement service is configured. This change
does not alter saved API definitions or their import/export format.
