declare module 'swagger2openapi' {
  export function convertObj(
    value: object,
    options: { resolve: boolean; patch: boolean; warnOnly: boolean },
  ): Promise<{ openapi: unknown }>;
}
