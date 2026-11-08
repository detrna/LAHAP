import { describe, expect, it } from "vitest";
import { distinctCookIds, toComponentRecords } from "./menu-components.js";

describe("distinctCookIds", () => {
    it("returns unique non-null cookIds preserving insertion order", () => {
        expect(
            distinctCookIds([
                { cookId: "cook-1" },
                { cookId: null },
                { cookId: undefined },
                { cookId: "cook-2" },
                { cookId: "cook-1" },
            ]),
        ).toEqual(["cook-1", "cook-2"]);
    });

    it("returns an empty array when no cookId is present", () => {
        expect(distinctCookIds([{ cookId: null }, {}])).toEqual([]);
    });
});

describe("toComponentRecords", () => {
    it("normalizes missing cookId to null", () => {
        expect(
            toComponentRecords([
                { name: "Nasi Merah" },
                { name: "Ayam Bakar", cookId: "cook-1" },
                { name: "Sambal", cookId: null },
            ]),
        ).toEqual([
            { name: "Nasi Merah", cookId: null },
            { name: "Ayam Bakar", cookId: "cook-1" },
            { name: "Sambal", cookId: null },
        ]);
    });
});
