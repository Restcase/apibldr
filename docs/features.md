# Features and supported formats

## Specifications

| Format             | Editing and validation                                                    |
| ------------------ | ------------------------------------------------------------------------- |
| OpenAPI 3.0 / 3.1  | Visual paths, operations, components, source, and schema checks           |
| Swagger 2.0        | Local import conversion to OpenAPI 3.0; exported documents use OpenAPI    |
| AsyncAPI 2.0–2.6   | Channels with publish/subscribe operations, messages, and components      |
| AsyncAPI 3.0 / 3.1 | Channels with top-level send/receive operations, messages, and components |

## Common workflow

Create or import a definition, configure General settings, add reusable Components,
then design Paths or Channels. Each component category includes explanations and
quick-add presets. Use Source for the full JSON/YAML document; apply changes before
returning to visual editing. Run specification checks and export a backup.

General settings include metadata, Markdown descriptions, contact and license
information, external documentation, servers, tags, and security. Source completion
suggests specification fields and reusable references. Light, dark, and system
appearance settings persist across visits.

## OpenAPI design

Paths support shared parameters, servers, summaries, and descriptions. Rename,
copy, or remove a path and edit individual operations. Operations include IDs,
tags, request parameters and bodies, response media types, and security settings.
Advanced fields remain available through JSON editors within Designer.

Reusable components include schemas, security schemes, parameters, responses,
examples, headers, request bodies, links, and callbacks. Rename repairs supported
local references; removal protects referenced definitions. Schemas support nested
properties, arrays, required fields, formats, and constraints. Infer properties
from JSON and review them before merging into an existing schema.

## AsyncAPI design

Channels support messages, parameters, descriptions, bindings, and server
associations. Version-specific operation and security structures are preserved.
Reusable definitions include schemas, parameters, security schemes, messages,
correlation IDs, operation/message traits, and four binding categories.

Selected HTTP, Kafka, AMQP, MQTT, and WebSocket settings have visual controls.
Complex protocol structures and collections can be edited as JSON without
leaving Designer. Message payloads can use inline or reusable schemas.

## Integrations and workspace tools

Built-in code generation is no longer available. Export OpenAPI or AsyncAPI
definitions as YAML or JSON for use with external tooling.

Header controls provide repository, issues, releases, feedback, and fullscreen
access. The footer displays local date/time. Feedback uses the configured Appzi
form; availability depends on that external service.

## Limits

- One browser-local workspace; no accounts, cloud save, or collaboration.
- Undo/redo retains 30 edits within the current tab.
- Files are limited to 2 MB. Export backups before clearing browser data.
- Apply advanced JSON drafts before switching sections.
- External references are preserved but not fetched or fully validated.
- Source regeneration does not preserve original YAML formatting or comments.
- OpenAPI 3.2 and standalone JSON Schema workspaces are not supported.
- No request execution or mock server is included.
- Local editing works in a loaded tab offline; reopening offline is not supported.
