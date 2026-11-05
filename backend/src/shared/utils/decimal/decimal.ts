const SIGNIFICANT_DIGITS = 15;

export function roundHalfUp(value: number, scale: number): number {
    if (!Number.isFinite(value)) {
        throw new RangeError(`cannot round ${value}`);
    }
    if (!Number.isInteger(scale) || scale < 0) {
        throw new RangeError(`scale must be a non-negative integer, got ${scale}`);
    }
    const factor = 10 ** scale;
    const scaled = Number((Math.abs(value) * factor).toPrecision(SIGNIFICANT_DIGITS));
    const rounded = (Math.sign(value) * Math.round(scaled)) / factor;
    return rounded === 0 ? 0 : rounded;
}
