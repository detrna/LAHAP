import "dotenv/config";
import { Buffer } from "node:buffer";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadConfig } from "../../../config/index.js";
import { ObjectNotFoundError } from "../../../shared/ports/object-storage/object-storage.js";
import { loadObjectStorage, SeaweedFsObjectStorage } from "./seaweedfs.js";

const config = loadConfig();

if (!config.OBJECT_STORAGE.ACCESS_KEY || !config.OBJECT_STORAGE.SECRET_KEY) {
    throw new Error("S3_ACCESS_KEY and S3_SECRET_KEY are required to run integration tests");
}

describe("SeaweedFsObjectStorage (integration)", () => {
    let storage: SeaweedFsObjectStorage;
    const testKey = `integration-test/${Date.now()}-receipt.txt`;
    const testPayload = Buffer.from("integration test receipt payload");

    beforeAll(async () => {
        storage = await loadObjectStorage(config.OBJECT_STORAGE, {
            autoCreateBucket: !config.APP.IS_PRODUCTION,
        });
    });

    afterAll(async () => {
        if (storage) {
            await storage.delete(testKey).catch(() => undefined);
        }
    });

    it("uploads, checks existence, downloads, and generates a signed URL for an object", async () => {
        await storage.upload({
            key: testKey,
            body: testPayload,
            contentType: "text/plain",
        });

        await expect(storage.exists(testKey)).resolves.toBe(true);

        const downloaded = await storage.download(testKey);
        expect(downloaded).toEqual(testPayload);

        const signedUrl = await storage.getSignedUrl(testKey, 300);
        // console.log("[signedUrl]", signedUrl);

        const res = await fetch(signedUrl);
        expect(res.ok).toBe(true);
        const fetchedBytes = Buffer.from(await res.arrayBuffer());
        expect(fetchedBytes).toEqual(testPayload);
    });

    it("deletes an object and throws ObjectNotFoundError on subsequent download", async () => {
        const deleteKey = `integration-test/${Date.now()}-to-delete.txt`;
        await storage.upload({
            key: deleteKey,
            body: testPayload,
            contentType: "text/plain",
        });

        await storage.delete(deleteKey);

        await expect(storage.exists(deleteKey)).resolves.toBe(false);
        await expect(storage.download(deleteKey)).rejects.toThrow(ObjectNotFoundError);
    });

    it("forwards a URL signed for the public host to the internal endpoint", async () => {
        const proxied = new SeaweedFsObjectStorage({ ...config.OBJECT_STORAGE, PUBLIC_ENDPOINT: "https://lahap.test" });
        const key = `integration-test/${Date.now()}-proxied.txt`;
        await storage.upload({ key, body: testPayload, contentType: "text/plain" });

        try {
            const signed = new URL(await proxied.getSignedUrl(key, 300));
            expect(signed.origin).toBe("https://lahap.test");

            const ok = await proxied.forwardSignedRead({
                method: "GET",
                pathWithQuery: signed.pathname + signed.search,
                headers: {},
            });
            const chunks: Buffer[] = [];
            for await (const chunk of ok.body) chunks.push(Buffer.from(chunk as Uint8Array));
            expect(ok.status).toBe(200);
            expect(ok.headers["content-type"]).toBe("text/plain");
            expect(Buffer.concat(chunks)).toEqual(testPayload);

            signed.searchParams.set("X-Amz-Signature", "0".repeat(64));
            const tampered = await proxied.forwardSignedRead({
                method: "GET",
                pathWithQuery: signed.pathname + signed.search,
                headers: {},
            });
            tampered.body.resume();
            expect(tampered.status).toBe(403);
        } finally {
            await storage.delete(key).catch(() => undefined);
        }
    });

    it("deleting a non-existent key does not throw", async () => {
        await expect(storage.delete(`integration-test/missing-${Date.now()}.txt`)).resolves.toBeUndefined();
    });
});
