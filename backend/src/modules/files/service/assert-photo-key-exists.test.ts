import { describe, expect, it } from "vitest";
import { ValidationError } from "../../../shared/errors/validation-error.js";
import { StorageFailureError } from "../../../shared/ports/object-storage/object-storage.js";
import { setupFilesService } from "../test-utils/setup/files.setup.js";

const key = "menus/2026/11/3f2b6c1e-8a4d-4e5f-9b7c-2d1e0f3a4b5c.webp";

describe("FilesService.assertPhotoKeyExists (unit)", () => {
    it("passes when the object exists", async () => {
        const { service, objectStorage } = setupFilesService();

        await expect(service.assertPhotoKeyExists(key)).resolves.toBeUndefined();
        expect(objectStorage.exists).toHaveBeenCalledWith(key);
    });

    it("reports a missing object as a validation issue on photoKey", async () => {
        const { service, objectStorage } = setupFilesService();
        objectStorage.exists.mockResolvedValue(false);

        const error = await service.assertPhotoKeyExists(key).catch((caught: unknown) => caught);

        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).issues).toEqual([
            { target: "body", path: "photoKey", message: "photo does not exist", code: "photo_not_found" },
        ]);
    });

    it("puts the issue on the given path", async () => {
        const { service, objectStorage } = setupFilesService();
        objectStorage.exists.mockResolvedValue(false);

        const error = await service.assertPhotoKeyExists(key, "items.3.photoKey").catch((caught: unknown) => caught);

        expect((error as ValidationError).issues[0]?.path).toBe("items.3.photoKey");
    });

    it("lets a storage failure through unchanged", async () => {
        const { service, objectStorage } = setupFilesService();
        const failure = new StorageFailureError("exists");
        objectStorage.exists.mockRejectedValue(failure);

        await expect(service.assertPhotoKeyExists(key)).rejects.toBe(failure);
    });
});
