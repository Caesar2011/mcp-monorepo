import type { z, ZodRawShape } from 'zod'

export type SchemaTypeOf<Schema extends ZodRawShape> = z.infer<z.ZodObject<Schema>>
export type MaybePromise<T> = T | Promise<T>
