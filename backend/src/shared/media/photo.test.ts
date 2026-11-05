import { describe, expect, it, vi } from "vitest";
import type { ObjectStorage } from "../ports/object-storage/object-storage.js";
import { toPhotoUrl, toPhotoUrls } from "./photo.js";

function createStorage() {
    const getSignedUrl = vi.fn(async (key: string) => `https://cdn.test/${key}?sig=1`);
    return { storage: { getSignedUrl } as unknown as ObjectStorage, getSignedUrl };
}

describe("toPhotoUrl", () => {
    it("signs a key", async () => {
        const { storage } = createStorage();

        await expect(toPhotoUrl(storage, "menus/a.webp")).resolves.toBe("https://cdn.test/menus/a.webp?sig=1");
    });

    it("answers null for no key without calling the storage", async () => {
        const { storage, getSignedUrl } = createStorage();

        await expect(toPhotoUrl(storage, null)).resolves.toBeNull();
        expect(getSignedUrl).not.toHaveBeenCalled();
    });
});

describe("toPhotoUrls", () => {
    it("keeps the order and nulls, signing each distinct key once", async () => {
        const { storage, getSignedUrl } = createStorage();

        const urls = await toPhotoUrls(storage, ["a.webp", null, "b.webp", "a.webp"]);

        expect(urls).toEqual([
            "https://cdn.test/a.webp?sig=1",
            null,
            "https://cdn.test/b.webp?sig=1",
            "https://cdn.test/a.webp?sig=1",
        ]);
        expect(getSignedUrl).toHaveBeenCalledTimes(2);
    });

    it("answers an empty list for no keys", async () => {
        const { storage, getSignedUrl } = createStorage();

        await expect(toPhotoUrls(storage, [])).resolves.toEqual([]);
        expect(getSignedUrl).not.toHaveBeenCalled();
    });
});
