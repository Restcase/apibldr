# Code generation configuration

Code generation has no default service. Local editing, validation, and export
work without one. To enable generation, set the following before starting Vite
or building the application:

```dotenv
VITE_GENERATOR_URL=https://generator.example.com/api/gen/
```

Use `.env.local` for local development or a build environment variable in your
deployment system. Restart Vite or rebuild after changing it. Copy `.env.example`
for an empty configuration template.

The base URL must be absolute HTTPS, without credentials, query parameters, or a
fragment. It is embedded in the public browser bundle. Do not use it for secrets.
The server must permit your site's origin through CORS, including JSON POSTs.

## Service contract

The service must implement these routes relative to the base URL. `kind` is
`clients` or `servers`; `language` and download codes are URL-encoded.

| Request                  | Expected response                                      |
| ------------------------ | ------------------------------------------------------ |
| `GET {kind}`             | JSON array of language/framework identifiers           |
| `GET {kind}/{language}`  | JSON object of option definitions keyed by option name |
| `POST {kind}/{language}` | JSON object containing a string `code` for downloading |
| `GET download/{code}`    | Generated ZIP archive                                  |

Option definitions can include `type`, `description`, and `default`. Boolean
options render as checkboxes; other options use text fields.

The generation request body is:

```json
{
  "openAPIUrl": "",
  "options": { "packageName": "example" },
  "spec": {
    "openapi": "3.0.3",
    "info": { "title": "Example", "version": "1.0.0" },
    "paths": {}
  }
}
```

## Data sent and consent

Opening the dialog fetches target lists and options. A checked consent box and
an explicit Generate action are required before sending the complete OpenAPI
definition, including examples and descriptions. The dialog displays the configured
destination. AsyncAPI documents are rejected before upload.

Operators are responsible for the chosen service's access controls, limits, and
data retention. An unavailable or invalid configuration makes no generator
requests. Service failures are shown with a retry action; users can still export
their definition and generate code elsewhere.
