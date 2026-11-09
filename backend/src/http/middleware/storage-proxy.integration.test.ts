import { Readable } from "node:stream";
import express from "express";
import helmet from "helmet";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { StorageFailureError } from "../../shared/ports/object-storage/object-storage.js";
import { errorHandler } from "./error-handler.js";
import { storageProxy, type StorageProxyOptions } from "./storage-proxy.js";

const SIGNED_PATH = "/lahap/menus/2026/11/a.webp?X-Amz-Date=20261109T000000Z&X-Amz-Signature=abc123";

function createStorage(overrides: Partial<StorageProxyOptions["storage"]> = {}) {
    return {
        signedUrlPathPrefix: "/lahap",
        forwardSignedRead: vi.fn(async () => ({
            status: 200,
            headers: {
                "content-type": "image/webp",
                "content-length": "5",
                etag: '"e1"',
                "x-amz-request-id": "internal",
                server: "SeaweedFS",
            },
            body: Readable.from([Buffer.from("image")]),
        })),
        ...overrides,
    };
}

function createApp(storage: StorageProxyOptions["storage"]) {
    const app = express();
    app.use(helmet());
    app.use(storageProxy({ storage }));
    app.get("/lahap/unsigned.webp", (_req, res) => res.status(418).end());
    app.use(errorHandler());
    return app;
}

describe("storageProxy middleware (integration)", () => {
    it("forwards a signed read with the original path and query and streams the body back", async () => {
        const storage = createStorage();

        const response = await request(createApp(storage))
            .get(SIGNED_PATH)
            .set("Range", "bytes=0-4")
            .set("Cookie", "lahap_refresh=secret")
            .set("Authorization", "Bearer token");

        expect(response.status).toBe(200);
        expect(Buffer.from(response.body as Buffer).toString()).toBe("image");
        expect(storage.forwardSignedRead).toHaveBeenCalledWith({
            method: "GET",
            pathWithQuery: SIGNED_PATH,
            headers: { range: "bytes=0-4" },
        });
    });

    it("returns only content headers and allows other origins to embed the image", async () => {
        const response = await request(createApp(createStorage())).get(SIGNED_PATH);

        expect(response.headers["content-type"]).toBe("image/webp");
        expect(response.headers.etag).toBe('"e1"');
        expect(response.headers["cross-origin-resource-policy"]).toBe("cross-origin");
        expect(response.headers["x-amz-request-id"]).toBeUndefined();
        expect(response.headers.server).toBeUndefined();
    });

    it("passes the storage status through", async () => {
        const storage = createStorage({
            forwardSignedRead: vi.fn(async () => ({
                status: 403,
                headers: { "content-type": "application/xml" },
                body: Readable.from([Buffer.from("<Error><Code>SignatureDoesNotMatch</Code></Error>")]),
            })),
        });

        const response = await request(createApp(storage)).get(SIGNED_PATH);

        expect(response.status).toBe(403);
    });

    it("answers HEAD without a body", async () => {
        const storage = createStorage();

        const response = await request(createApp(storage)).head(SIGNED_PATH);

        expect(response.status).toBe(200);
        expect(response.headers["content-length"]).toBe("5");
        expect(storage.forwardSignedRead).toHaveBeenCalledWith(expect.objectContaining({ method: "HEAD" }));
    });

    it.each([
        ["an unsigned request", "get", "/lahap/unsigned.webp"],
        ["the bucket root", "get", "/lahap/?X-Amz-Signature=abc"],
        ["another path", "get", "/api/packages?X-Amz-Signature=abc"],
        ["a write", "put", SIGNED_PATH],
    ] as const)("leaves %s to the next handler", async (_label, method, path) => {
        const storage = createStorage();

        await request(createApp(storage))[method](path);

        expect(storage.forwardSignedRead).not.toHaveBeenCalled();
    });

    it("hands a storage failure to the error handler", async () => {
        const storage = createStorage({
            forwardSignedRead: vi.fn(async () => {
                throw new StorageFailureError("forwardSignedRead");
            }),
        });

        const response = await request(createApp(storage)).get(SIGNED_PATH);

        expect(response.status).toBe(500);
        expect(response.body).toEqual({ error: expect.objectContaining({ code: "STORAGE_FAILURE" }) });
    });
});
