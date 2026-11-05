import { Buffer } from "node:buffer";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadConfig } from "../../../../src/config/index.js";
import { loadDatabase, type Db } from "../../../../src/infrastructure/database/prisma/db.js";
import { loadObjectStorage } from "../../../../src/infrastructure/object-storage/seaweedfs/seaweedfs.js";
import { FilesContainer } from "../../../../src/modules/files/container/files.container.js";
import type { Role } from "../../../../src/shared/auth/roles.js";
import type { ObjectStorage } from "../../../../src/shared/ports/object-storage/object-storage.js";
import { createTestApp, type TestApp } from "../../../utils/app/create-test-app.js";
import { createAccessToken } from "../../../utils/factory/jwt/jwt.js";

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
const MAX_BYTES = 1024;

const bearer = (role: Role) => ({ Authorization: `Bearer ${createAccessToken({ role })}` });

describe("files routes (e2e)", () => {
    const config = loadConfig();
    const uploadedKeys: string[] = [];
    let db: Db;
    let objectStorage: ObjectStorage;
    let testApp: TestApp;

    const upload = (role: Role | null, folder: string | null = "menus", file: Buffer | null = PNG) => {
        let call = request(testApp.app).post("/api/files");
        if (role !== null) call = call.set(bearer(role));
        if (folder !== null) call = call.field("folder", folder);
        if (file !== null) call = call.attach("file", file, "photo.png");
        return call;
    };

    beforeAll(async () => {
        db = await loadDatabase(config.DATABASE);
        objectStorage = await loadObjectStorage(config.OBJECT_STORAGE, {
            autoCreateBucket: !config.APP.IS_PRODUCTION,
        });
        testApp = await createTestApp({
            db,
            http: { UPLOAD_MAX_BYTES: MAX_BYTES },
            adapters: { objectStorage },
            mount: deps => [new FilesContainer(deps).router],
        });
    });

    afterAll(async () => {
        await Promise.all(uploadedKeys.map(key => objectStorage?.delete(key)));
        await testApp?.close();
        await db?.close();
    });

    it("stores an admin's photo and answers 201 with its key and a signed url", async () => {
        const response = await upload("ADMIN");

        expect(response.status).toBe(201);
        const { key, url } = response.body.data;
        uploadedKeys.push(key);
        expect(key).toMatch(/^menus\/\d{4}\/\d{2}\/[0-9a-f-]{36}\.png$/);
        expect(url).toEqual(expect.any(String));
        await expect(objectStorage.exists(key)).resolves.toBe(true);
    });

    it("lets a courier upload an obstacle photo", async () => {
        const response = await upload("COURIER", "obstacles");

        expect(response.status).toBe(201);
        uploadedKeys.push(response.body.data.key);
        expect(response.body.data.key).toMatch(/^obstacles\//);
    });

    it("answers 401 without a token", async () => {
        const response = await upload(null);

        expect(response.status).toBe(401);
    });

    it.each(["CUSTOMER", "KITCHEN"] as const)("answers 403 for %s", async role => {
        const response = await upload(role);

        expect(response.status).toBe(403);
        expect(response.body.error.code).toBe("FORBIDDEN");
    });

    it("answers 403 when a courier uploads outside the obstacles folder", async () => {
        const response = await upload("COURIER", "menus");

        expect(response.status).toBe(403);
        expect(response.body.error.code).toBe("FORBIDDEN");
    });

    it.each([null, "secrets"])("answers 400 for folder %j", async folder => {
        const response = await upload("ADMIN", folder);

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe("VALIDATION_ERROR");
        expect(response.body.error.issues).toEqual([expect.objectContaining({ path: "folder" })]);
    });

    it("answers 400 without a file", async () => {
        const response = await upload("ADMIN", "menus", null);

        expect(response.status).toBe(400);
        expect(response.body.error.issues).toEqual([expect.objectContaining({ path: "file" })]);
    });

    it("answers 415 for a text file named .png", async () => {
        const response = await upload("ADMIN", "menus", Buffer.from("not an image"));

        expect(response.status).toBe(415);
        expect(response.body.error.code).toBe("UNSUPPORTED_MEDIA_TYPE");
    });

    it("answers 413 above the upload limit", async () => {
        const response = await upload("ADMIN", "menus", Buffer.concat([PNG, Buffer.alloc(MAX_BYTES)]));

        expect(response.status).toBe(413);
        expect(response.body.error.code).toBe("PAYLOAD_TOO_LARGE");
    });
});
