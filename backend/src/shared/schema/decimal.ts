import { z } from "zod";
import { roundHalfUp } from "../utils/decimal/decimal.js";

export interface DecimalSchemaOptions {
    readonly scale: number;
    readonly min?: number | undefined;
    readonly max?: number | undefined;
    readonly exclusiveMin?: boolean | undefined;
}

export function decimalSchema({ scale, min, max, exclusiveMin = false }: DecimalSchemaOptions) {
    let bounded = z.number();
    if (min !== undefined) bounded = exclusiveMin ? bounded.gt(min) : bounded.min(min);
    if (max !== undefined) bounded = bounded.max(max);
    return z
        .number()
        .refine(Number.isFinite, "must be a finite number")
        .transform(value => roundHalfUp(value, scale))
        .pipe(bounded);
}
