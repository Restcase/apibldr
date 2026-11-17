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

## Examples, import, and export

**Examples** loads Swagger Petstore (OpenAPI 3.1.0, API version 1.0.12) or
Streetlights Kafka (AsyncAPI 2.6.0). Definitions are bundled and work offline in a
loaded tab. A fresh browser workspace starts with Petstore. Existing saved work
is retained; loading an example explicitly replaces it and can be undone.

**Import** opens File and URL choices. Both accept JSON/YAML up to 2 MB and retain
the current document on failure. URL imports require a direct HTTP(S) URL and
browser access (CORS), omit login credentials, support cancellation, and time out
after 30 seconds. File drag-and-drop remains available.

**Export** offers JSON and YAML independently of the Source format. Unapplied
source must parse successfully before export; invalid drafts remain editable.

## API graph

Use **Graph** to explore paths/channels, operations, messages, payloads, reusable
components, and local references. Select a connection to drill down; breadcrumbs
and **API overview** navigate back. Earlier nodes remain connected on the canvas
as the next level animates into view. Returning to a level restores its filter,
page, and pan position. Filter the current level, page through its connections,
zoom, fit, or pan. Reduced-motion preferences disable transitions and smooth panning. The details panel opens the corresponding
Designer section, or Source for structures without a dedicated editor.

Exploration does not alter the document or contact API servers. Circular
references can be followed safely; missing references are explained, and external
references are not fetched. Unapplied source is excluded until applied.

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
