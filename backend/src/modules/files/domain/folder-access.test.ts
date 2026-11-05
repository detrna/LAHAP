import { describe, expect, it } from "vitest";
import { PHOTO_FOLDERS } from "../../../shared/media/photo.js";
import { canUploadTo } from "./folder-access.js";

describe("canUploadTo", () => {
    it.each(PHOTO_FOLDERS)("lets an admin upload to %s", folder => {
        expect(canUploadTo("ADMIN", folder)).toBe(true);
    });

    it("lets a courier upload only obstacle photos", () => {
        expect(canUploadTo("COURIER", "obstacles")).toBe(true);
        for (const folder of PHOTO_FOLDERS.filter(folder => folder !== "obstacles")) {
            expect(canUploadTo("COURIER", folder)).toBe(false);
        }
    });

    it.each(["KITCHEN", "CUSTOMER"] as const)("refuses %s for every folder", role => {
        for (const folder of PHOTO_FOLDERS) expect(canUploadTo(role, folder)).toBe(false);
    });
});
