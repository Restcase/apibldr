# Bundled examples

These public examples load locally without connecting to their API servers.

- `streetlights.yaml`: Streetlights Kafka API from the
  [AsyncAPI specification v2.6.0 examples](https://github.com/asyncapi/spec/blob/v2.6.0/examples/streetlights-kafka.yml),
  licensed under [Apache 2.0](https://github.com/asyncapi/spec/blob/v2.6.0/LICENSE).
- `petstore.yaml`: Swagger Petstore, adapted from the
  [Swagger Petstore definition](https://github.com/swagger-api/swagger-petstore/blob/master/src/main/resources/openapi.yaml)
  to the OpenAPI 3.1.0 sample (API version 1.0.12). Changes include JSON Schema
  `examples`, additional reusable schemas, and default error responses.
  The upstream project is licensed under
  [Apache 2.0](https://github.com/swagger-api/swagger-petstore/blob/master/LICENSE).

The original API metadata, descriptions, and license information are retained.
Sample credentials and hosts are illustrative. Keep these files bundled rather
than downloading mutable upstream examples during application startup.
