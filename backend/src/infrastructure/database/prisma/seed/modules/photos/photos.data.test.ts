import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { INGREDIENTS, ingredientPhotoKey } from "../ingredients/ingredients.data.js";
import { MENUS, menuPhotoKey } from "../menus/menus.data.js";
import { PACKAGES, packagePhotoKey } from "../packages/packages.data.js";
import { SEED_ASSETS_DIR, SEED_PHOTOS } from "./photos.data.js";

const expectedKeys = [
    ...Object.values(PACKAGES).map(p => packagePhotoKey(p.id)),
    ...Object.values(MENUS).map(m => menuPhotoKey(m.id)),
    ...Object.values(INGREDIENTS).map(i => ingredientPhotoKey(i.id)),
];

const isWebp = (bytes: Buffer): boolean =>
    bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP";

describe("seed photos (unit)", () => {
    it("has one photo for every seeded package, menu and ingredient key", () => {
        expect(SEED_PHOTOS.map(photo => photo.key).sort()).toEqual([...expectedKeys].sort());
    });

    it("finds every photo in the assets folder as a WebP file", async () => {
        for (const photo of SEED_PHOTOS) {
            const bytes = await readFile(path.join(SEED_ASSETS_DIR, photo.file));
            expect(isWebp(bytes), photo.file).toBe(true);
        }
    });

    it("keeps no asset file that no fixture uses", async () => {
        const entries = await readdir(SEED_ASSETS_DIR, { recursive: true, withFileTypes: true });
        const files = entries
            .filter(entry => entry.isFile() && entry.name.endsWith(".webp"))
            .map(entry => path.relative(SEED_ASSETS_DIR, path.join(entry.parentPath, entry.name)));
        expect(files.sort()).toEqual(SEED_PHOTOS.map(photo => photo.file).sort());
    });
});
