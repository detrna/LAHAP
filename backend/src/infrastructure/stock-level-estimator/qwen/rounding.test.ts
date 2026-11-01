import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { calculateBottles, sumFills } from "./rounding.js";

describe("calculateBottles rounding", () => {
    const tolerance = 0.15;

    it("keeps 3.0 as 3 (acceptance criterion: 3.0 stays 3)", () => {
        expect(calculateBottles(3.0, tolerance)).toBe(3);
    });

    it("rounds 3.2 up to 4 (acceptance criterion: 3.2 becomes 4)", () => {
        expect(calculateBottles(3.2, tolerance)).toBe(4);
    });

    it("keeps empty (0) as 0 (acceptance criterion: empty stays 0)", () => {
        expect(calculateBottles(0, tolerance)).toBe(0);
        expect(calculateBottles(-0.5, tolerance)).toBe(0);
    });

    it("handles tolerance boundary cases", () => {
        // 3.15 - 0.15 = 3.00 -> ceil(3.00) = 3
        expect(calculateBottles(3.15, tolerance)).toBe(3);
        // 3.16 - 0.15 = 3.01 -> ceil(3.01) = 4
        expect(calculateBottles(3.16, tolerance)).toBe(4);
        // 3.10 - 0.15 = 2.95 -> ceil(2.95) = 3
        expect(calculateBottles(3.1, tolerance)).toBe(3);
    });

    it("handles partial container fill levels", () => {
        // A single half-full bottle: 0.5 - 0.15 = 0.35 -> 1 bottle
        expect(calculateBottles(0.5, tolerance)).toBe(1);
        // A full bottle: 1.0 - 0.15 = 0.85 -> 1 bottle
        expect(calculateBottles(1.0, tolerance)).toBe(1);
        // Two full bottles: 2.0 - 0.15 = 1.85 -> 2 bottles
        expect(calculateBottles(2.0, tolerance)).toBe(2);
        // Total fill within tolerance: 0.15 - 0.15 = 0 -> 0 bottles
        expect(calculateBottles(0.15, tolerance)).toBe(0);
        // Total fill just above tolerance: 0.16 - 0.15 = 0.01 -> 1 bottle
        expect(calculateBottles(0.16, tolerance)).toBe(1);
    });

    it("works with default tolerance when omitted", () => {
        expect(calculateBottles(3.0)).toBe(3);
        expect(calculateBottles(3.2)).toBe(4);
        expect(calculateBottles(0)).toBe(0);
    });

    it("prevents floating point precision drift near boundaries", () => {
        // 0.1 + 0.2 in JS is 0.30000000000000004
        const floatSum = 0.1 + 0.2;
        expect(calculateBottles(floatSum, tolerance)).toBe(1);

        // 3.0000000000000004 stays 3
        expect(calculateBottles(3.0000000000000004, tolerance)).toBe(3);

        // 2.9999999999999995 stays 3
        expect(calculateBottles(2.9999999999999995, tolerance)).toBe(3);
    });

    it("correctly calculates quantities for all 22 test scenes in fixtures/labels.json", () => {
        const labelsPath = join(import.meta.dirname, "fixtures/labels.json");
        const raw = readFileSync(labelsPath, "utf8");
        const labels = JSON.parse(raw) as Array<{
            file: string;
            exact_total_bottles: number;
            fill_levels_percent: number[];
            expected_output: { item: { quantity: number } };
        }>;

        expect(labels.length).toBe(22);

        for (const scene of labels) {
            // Test calculation using exact_total_bottles
            const bottlesFromExact = calculateBottles(scene.exact_total_bottles, tolerance);
            expect(bottlesFromExact, `Failed for scene ${scene.file} from exact_total_bottles`).toBe(
                scene.expected_output.item.quantity,
            );

            // Test calculation using sumFills from fill_levels_percent
            const fractionalFills = scene.fill_levels_percent.map(p => p / 100);
            const totalFromFills = sumFills(fractionalFills);
            const bottlesFromFills = calculateBottles(totalFromFills, tolerance);
            expect(bottlesFromFills, `Failed for scene ${scene.file} from fill_levels_percent`).toBe(
                scene.expected_output.item.quantity,
            );
        }
    });
});

describe("sumFills", () => {
    it("sums container fills", () => {
        expect(sumFills([1, 1, 1, 0.5])).toBe(3.5);
        expect(sumFills([1, 1, 1, 0.2])).toBeCloseTo(3.2);
        expect(sumFills([])).toBe(0);
        expect(sumFills([0, 0, 0])).toBe(0);
    });
});
