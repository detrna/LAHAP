import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { SEED_PHOTO_CONTENT_TYPE, SEED_PHOTOS } from "./photos.data.js";
import { deleteSeedPhotos, seedPhotos } from "./photos.seed.js";

describe("seedPhotos (unit)", () => {
    it("uploads every photo under its seed key as WebP", async () => {
        const upload = vi.fn().mockResolvedValue(undefined);

        const count = await seedPhotos({ objectStorage: { upload } });

        expect(count).toBe(SEED_PHOTOS.length);
        expect(upload).toHaveBeenCalledTimes(SEED_PHOTOS.length);
        for (const photo of SEED_PHOTOS) {
            expect(upload).toHaveBeenCalledWith({
                key: photo.key,
                body: expect.any(Buffer),
                contentType: SEED_PHOTO_CONTENT_TYPE,
            });
        }
    });

    it("uploads nothing and names the file when a photo is missing", async () => {
        const assetsDir = await mkdtemp(path.join(tmpdir(), "seed-photos-"));
        const upload = vi.fn();
        try {
            await expect(seedPhotos({ objectStorage: { upload }, assetsDir })).rejects.toThrow(
                /seed photo .+\.webp cannot be read/,
            );
            expect(upload).not.toHaveBeenCalled();
        } finally {
            await rm(assetsDir, { recursive: true, force: true });
        }
    });
});

describe("deleteSeedPhotos (unit)", () => {
    it("deletes every seed photo key", async () => {
        const remove = vi.fn().mockResolvedValue(undefined);

        const count = await deleteSeedPhotos({ delete: remove });

        expect(count).toBe(SEED_PHOTOS.length);
        expect(remove.mock.calls.map(([key]) => key as string).sort()).toEqual(
            SEED_PHOTOS.map(photo => photo.key).sort(),
        );
    });
});
