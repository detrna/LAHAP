import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { errorHandler } from "./error-handler.js";
import { uploadImage } from "./upload-image.js";
import { validateBody } from "./validate-request.js";

const MAX_BYTES = 1024;
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);

function createTestApp() {
    const app = express();
    app.post(
        "/files",
        uploadImage({ field: "file", maxBytes: MAX_BYTES }),
        validateBody(z.object({ folder: z.enum(["menus", "packages"]) })),
        (req, res) => {
            res.status(201).json({
                data: { folder: req.body.folder, mimetype: req.file?.mimetype, size: req.file?.size },
            });
        },
    );
    app.use(errorHandler());
    return app;
}

describe("uploadImage middleware (integration)", () => {
    it("accepts an image, uses the detected type, and leaves text fields for validateBody", async () => {
        const response = await request(createTestApp())
            .post("/files")
            .field("folder", "menus")
            .attach("file", PNG, { filename: "photo.jpg", contentType: "image/jpeg" });

        expect(response.status).toBe(201);
        expect(response.body).toEqual({ data: { folder: "menus", mimetype: "image/png", size: PNG.length } });
    });

    it("rejects a file over the size limit with 413 PAYLOAD_TOO_LARGE", async () => {
        const tooBig = Buffer.concat([PNG, Buffer.alloc(MAX_BYTES)]);
        const response = await request(createTestApp())
            .post("/files")
            .field("folder", "menus")
            .attach("file", tooBig, "big.png");

        expect(response.status).toBe(413);
        expect(response.body.error.code).toBe("PAYLOAD_TOO_LARGE");
    });

    it("rejects a non-image disguised as a PNG with 415 UNSUPPORTED_MEDIA_TYPE", async () => {
        const response = await request(createTestApp())
            .post("/files")
            .field("folder", "menus")
            .attach("file", Buffer.from("<?php echo 'hi'; ?>"), { filename: "photo.png", contentType: "image/png" });

        expect(response.status).toBe(415);
        expect(response.body.error.code).toBe("UNSUPPORTED_MEDIA_TYPE");
    });

    it("rejects a request without the file with 400 VALIDATION_ERROR", async () => {
        const response = await request(createTestApp()).post("/files").field("folder", "menus");

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe("VALIDATION_ERROR");
        expect(response.body.error.issues).toEqual([
            { target: "body", path: "file", message: "file is required", code: "required" },
        ]);
    });

    it("rejects a file sent under the wrong field name", async () => {
        const response = await request(createTestApp()).post("/files").attach("image", PNG, "photo.png");

        expect(response.status).toBe(400);
        expect(response.body.error.issues[0]).toMatchObject({ path: "image", code: "unexpected_file" });
    });

    it("rejects a second file", async () => {
        const response = await request(createTestApp())
            .post("/files")
            .attach("file", PNG, "one.png")
            .attach("file", PNG, "two.png");

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("still validates the text fields after a valid upload", async () => {
        const response = await request(createTestApp())
            .post("/files")
            .field("folder", "secrets")
            .attach("file", PNG, "photo.png");

        expect(response.status).toBe(400);
        expect(response.body.error.issues[0]).toMatchObject({ target: "body", path: "folder" });
    });
});
