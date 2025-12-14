import type { z, ZodRawShape, ZodTypeAny } from 'zod'

export type SchemaTypeOf<Schema extends ZodRawShape> = z.objectOutputType<Schema, ZodTypeAny>
export type MaybePromise<T> = T | Promise<T>
