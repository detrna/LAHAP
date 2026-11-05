import { describe, expect, it } from "vitest";
import { z } from "zod";
import { latitudeSchema, longitudeSchema, refineCoordinatesTogether } from "./coordinates.js";

describe("latitudeSchema and longitudeSchema", () => {
    it("accept their full ranges", () => {
        for (const value of [-90, 0, 90]) expect(latitudeSchema.parse(value)).toBe(value);
        for (const value of [-180, 0, 180]) expect(longitudeSchema.parse(value)).toBe(value);
    });

    it("reject values out of range", () => {
        expect(latitudeSchema.safeParse(90.1).success).toBe(false);
        expect(longitudeSchema.safeParse(-180.1).success).toBe(false);
    });

    it("round to 8 decimals", () => {
        expect(latitudeSchema.parse(-7.939312345)).toBe(-7.93931235);
    });
});

describe("refineCoordinatesTogether", () => {
    const location = z
        .object({ latitude: latitudeSchema.optional(), longitude: longitudeSchema.optional() })
        .superRefine(refineCoordinatesTogether);
    const issuePaths = (value: unknown) => location.safeParse(value).error?.issues.map(issue => issue.path.join("."));

    it("accepts both or neither", () => {
        expect(location.safeParse({}).success).toBe(true);
        expect(location.safeParse({ latitude: -7.9, longitude: 112.6 }).success).toBe(true);
    });

    it("points at the missing half", () => {
        expect(issuePaths({ latitude: -7.9 })).toEqual(["longitude"]);
        expect(issuePaths({ longitude: 112.6 })).toEqual(["latitude"]);
    });

    it("treats null as missing", () => {
        const nullable = z
            .object({ latitude: latitudeSchema.nullable(), longitude: longitudeSchema.nullable() })
            .superRefine(refineCoordinatesTogether);

        expect(nullable.safeParse({ latitude: null, longitude: null }).success).toBe(true);
        expect(nullable.safeParse({ latitude: -7.9, longitude: null }).success).toBe(false);
    });
});
