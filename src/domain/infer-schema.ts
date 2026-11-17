import { isObject, type JsonObject } from './document';
/** Infer observations only; required fields and business constraints need review. */
export function inferSchema(
  value: unknown,
  openapi30 = false,
  depth = 0,
): JsonObject {
  if (depth > 64)
    throw new Error(
      'Example nesting exceeds 64 levels. Use a smaller example.',
    );
  if (value === null) return openapi30 ? { nullable: true } : { type: 'null' };
  if (Array.isArray(value)) {
    const variants = [
      ...new Map(
        value.map((item) => {
          const schema = inferSchema(item, openapi30, depth + 1);
          return [JSON.stringify(schema), schema];
        }),
      ).values(),
    ];
    return {
      type: 'array',
      items:
        variants.length === 0
          ? {}
          : variants.length === 1
            ? variants[0]
            : { anyOf: variants },
    };
  }
  if (isObject(value))
    return {
      type: 'object',
      properties: Object.fromEntries(
        Object.entries(value).map(([key, item]) => [
          key,
          inferSchema(item, openapi30, depth + 1),
        ]),
      ),
    };
  if (typeof value === 'number')
    return { type: Number.isInteger(value) ? 'integer' : 'number' };
  return { type: typeof value };
}
