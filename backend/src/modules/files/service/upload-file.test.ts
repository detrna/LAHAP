import { Buffer } from "node:buffer";
import { describe, expect, it } from "vitest";
import { StorageFailureError } from "../../../shared/ports/object-storage/object-storage.js";
import { FolderNotAllowedError } from "../domain/errors.js";
import { setupFilesService } from "../test-utils/setup/files.setup.js";

const body = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
const KEY_PATTERN = /^menus\/2026\/11\/[0-9a-f-]{36}\.png$/;

describe("FilesService.uploadFile (unit)", () => {
    it("stores the image under a new key and returns it with a signed url", async () => {
        const { service, objectStorage } = setupFilesService();

        const uploaded = await service.uploadFile({ folder: "menus", body, contentType: "image/png", role: "ADMIN" });

        expect(uploaded.key).toMatch(KEY_PATTERN);
        expect(objectStorage.upload).toHaveBeenCalledWith({ key: uploaded.key, body, contentType: "image/png" });
        expect(uploaded.url).toBe(`https://storage.test/${uploaded.key}?signed`);
    });

    it("gives every upload its own key", async () => {
        const { service } = setupFilesService();
        const input = { folder: "menus", body, contentType: "image/png", role: "ADMIN" } as const;

        const [first, second] = await Promise.all([service.uploadFile(input), service.uploadFile(input)]);

        expect(first.key).not.toBe(second.key);
    });

    it("files the upload under the Jakarta month, not the UTC one", async () => {
        const { service, clock } = setupFilesService();
        clock.set("2026-12-01T00:30:00+07:00[Asia/Jakarta]");

        const uploaded = await service.uploadFile({ folder: "menus", body, contentType: "image/webp", role: "ADMIN" });

        expect(uploaded.key).toMatch(/^menus\/2026\/12\//);
    });

    it("lets a courier upload an obstacle photo", async () => {
        const { service } = setupFilesService();

        const uploaded = await service.uploadFile({
            folder: "obstacles",
            body,
            contentType: "image/jpeg",
            role: "COURIER",
        });

        expect(uploaded.key).toMatch(/^obstacles\/2026\/11\/[0-9a-f-]{36}\.jpg$/);
    });

    it("refuses a courier uploading to another folder without storing anything", async () => {
        const { service, objectStorage } = setupFilesService();

        await expect(
            service.uploadFile({ folder: "menus", body, contentType: "image/png", role: "COURIER" }),
        ).rejects.toBeInstanceOf(FolderNotAllowedError);
        expect(objectStorage.upload).not.toHaveBeenCalled();
    });

    it("lets a storage failure through unchanged", async () => {
        const { service, objectStorage } = setupFilesService();
        const failure = new StorageFailureError("upload");
        objectStorage.upload.mockRejectedValue(failure);

        await expect(
            service.uploadFile({ folder: "menus", body, contentType: "image/png", role: "ADMIN" }),
        ).rejects.toBe(failure);
        expect(objectStorage.getSignedUrl).not.toHaveBeenCalled();
    });
});
