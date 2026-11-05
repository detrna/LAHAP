import { Buffer } from "node:buffer";
import { describe, expect, it } from "vitest";
import { createMockRequest, createMockResponse } from "../../../../tests/utils/mocks/express.js";
import { buildUploadedFile } from "../test-utils/factory/files.factory.js";
import { setupFilesController } from "../test-utils/setup/files.setup.js";

describe("FilesController.uploadFile (unit)", () => {
    it("passes the file, folder and role to the service and answers 201", async () => {
        const { filesService, controller } = setupFilesController();
        const uploaded = buildUploadedFile();
        filesService.uploadFile.mockResolvedValue(uploaded);
        const buffer = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
        const req = createMockRequest({
            body: { folder: "menus" },
            user: { userId: "admin-1", name: "Admin", role: "ADMIN" },
        });
        req.file = { buffer, mimetype: "image/png" } as Express.Multer.File;
        const res = createMockResponse();

        await controller.uploadFile(req, res);

        expect(filesService.uploadFile).toHaveBeenCalledWith({
            folder: "menus",
            body: buffer,
            contentType: "image/png",
            role: "ADMIN",
        });
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({ data: uploaded });
    });
});
