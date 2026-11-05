import { roundHalfUp } from "../../../shared/utils/decimal/decimal.js";

export function fromNumeric(value: string): number {
    const parsed = Number(value);
    if (value.trim() === "" || !Number.isFinite(parsed)) {
        throw new RangeError(`not a numeric value: ${JSON.stringify(value)}`);
    }
    return parsed;
}

export function fromNumericOrNull(value: string | null): number | null {
    return value === null ? null : fromNumeric(value);
}

export function toNumeric(value: number, scale: number): string {
    return roundHalfUp(value, scale).toFixed(scale);
}

export function toNumericOrNull(value: number | null, scale: number): string | null {
    return value === null ? null : toNumeric(value, scale);
}
