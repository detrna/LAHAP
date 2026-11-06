import { describe, expect, it } from "vitest";
import { findAnnouncementTargetIssues } from "./announcement-target.js";

describe("findAnnouncementTargetIssues", () => {
    it("accepts a target whose ids match the scope", () => {
        expect(findAnnouncementTargetIssues({ scope: "GLOBAL", packageId: null, menuScheduleId: null })).toEqual([]);
        expect(findAnnouncementTargetIssues({ scope: "PACKAGE", packageId: "p", menuScheduleId: null })).toEqual([]);
        expect(findAnnouncementTargetIssues({ scope: "SCHEDULE", packageId: null, menuScheduleId: "s" })).toEqual([]);
    });

    it("requires the id of the scope", () => {
        expect(findAnnouncementTargetIssues({ scope: "PACKAGE", packageId: null, menuScheduleId: null })).toEqual([
            {
                target: "body",
                path: "packageId",
                message: "is required when scope is PACKAGE",
                code: "invalid_target",
            },
        ]);
        expect(
            findAnnouncementTargetIssues({ scope: "SCHEDULE", packageId: null, menuScheduleId: null }),
        ).toMatchObject([{ path: "menuScheduleId" }]);
    });

    it("refuses the id of another scope", () => {
        expect(findAnnouncementTargetIssues({ scope: "GLOBAL", packageId: "p", menuScheduleId: "s" })).toMatchObject([
            { path: "packageId", message: "must be null when scope is GLOBAL" },
            { path: "menuScheduleId", message: "must be null when scope is GLOBAL" },
        ]);
        expect(findAnnouncementTargetIssues({ scope: "PACKAGE", packageId: "p", menuScheduleId: "s" })).toMatchObject([
            { path: "menuScheduleId", message: "must be null when scope is PACKAGE" },
        ]);
    });
});
