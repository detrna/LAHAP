import { z } from "zod";

export const DUPLICATES_MESSAGE = "must not contain duplicates";

export interface UniqueArrayOptions<T> {
    readonly by?: (item: T) => unknown;
}

export function uniqueArray<T extends z.ZodType>(item: T, options: UniqueArrayOptions<z.output<T>> = {}) {
    const keyOf = options.by ?? ((value: z.output<T>) => value);
    return z.array(item).refine(items => new Set(items.map(keyOf)).size === items.length, DUPLICATES_MESSAGE);
}
