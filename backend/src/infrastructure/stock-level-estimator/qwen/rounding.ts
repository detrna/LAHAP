/**
 * Computes whole number of bottles from the sum of container fill fractions.
 *
 * Formula:
 * total = sum(fills)
 * bottles = Math.ceil(total - tolerance)
 * Empty containers (total <= 0) count as 0.
 *
 * Normalized to prevent floating-point precision surprises near boundaries.
 * Default tolerance is 0.15.
 */
export function calculateBottles(total: number, tolerance = 0.15): number {
    if (total <= 0) {
        return 0;
    }
    const normalized = Math.round(total * 10_000) / 10_000;
    if (normalized <= 0) {
        return 0;
    }
    return Math.max(0, Math.ceil(normalized - tolerance));
}

/**
 * Computes total sum of container fills, treating negative values as 0.
 * Normalized to 4 decimal places to avoid floating-point drift.
 */
export function sumFills(fills: number[]): number {
    const sum = fills.reduce((acc, fill) => acc + Math.max(0, fill), 0);
    return Math.round(sum * 10_000) / 10_000;
}

