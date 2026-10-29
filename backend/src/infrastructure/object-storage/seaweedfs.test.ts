import {
    CreateBucketCommand,
    DeleteObjectCommand,
    GetObjectCommand,
    HeadBucketCommand,
    HeadObjectCommand,
    PutObjectCommand,
    type S3Client,
} from "@aws-sdk/client-s3";
import { Buffer } from "node:buffer";
import { describe, expect, it, vi } from "vitest";
import type { ObjectStorageConfig } from "../../config/object-storage.js";
import { AppError } from "../../shared/errors/app-error.js";
import {
    InvalidObjectKeyError,
    ObjectNotFoundError,
    StorageFailureError,
} from "../../shared/ports/object-storage/object-storage.js";
import { loadObjectStorage, SeaweedFsObjectStorage } from "./seaweedfs.js";

const dummyConfig: ObjectStorageConfig = {
    ENDPOINT: "http://localhost:8333",
    REGION: "us-east-1",
    ACCESS_KEY: "dummy-access-key",
    SECRET_KEY: "dummy-secret-key",
    BUCKET: "receipts",
    SIGNED_URL_EXPIRES_IN: 3600,
    TIMEOUT_MS: 15_000,
    MAX_RETRIES: 2,
};

function createMockClient(sendImpl?: (command: unknown, options?: unknown) => Promise<unknown>) {
    const send = vi.fn(sendImpl ?? (async () => ({})));
    return {
        client: { send } as unknown as S3Client,
        send,
    };
}

describe("SeaweedFsObjectStorage (unit)", () => {
    describe("constructor validation", () => {
        it("throws when S3_ACCESS_KEY is missing", () => {
            expect(() => new SeaweedFsObjectStorage({ ...dummyConfig, ACCESS_KEY: "" })).toThrow(
                "S3_ACCESS_KEY is not set",
            );
        });

        it("throws when S3_SECRET_KEY is missing", () => {
            expect(() => new SeaweedFsObjectStorage({ ...dummyConfig, SECRET_KEY: "" })).toThrow(
                "S3_SECRET_KEY is not set",
            );
        });

        it("throws when S3_BUCKET is missing", () => {
            expect(() => new SeaweedFsObjectStorage({ ...dummyConfig, BUCKET: "" })).toThrow(
                "S3_BUCKET is not set",
            );
        });

        it("throws when S3_ENDPOINT is missing", () => {
            expect(() => new SeaweedFsObjectStorage({ ...dummyConfig, ENDPOINT: "" })).toThrow(
                "S3_ENDPOINT is not set",
            );
        });
    });

    describe("key validation & normalization", () => {
        it.each(["", "   ", "/", "../secret.txt", "receipts/../secret.txt", "receipts//double.jpg", "bad\0key.jpg"])(
            "rejects invalid key %j with InvalidObjectKeyError (400)",
            async badKey => {
                const { client } = createMockClient();
                const storage = new SeaweedFsObjectStorage(dummyConfig, { client });

                const promise = storage.download(badKey);

                await expect(promise).rejects.toThrow(InvalidObjectKeyError);
                await promise.catch((err: unknown) => {
                    expect(err).toBeInstanceOf(AppError);
                    if (err instanceof AppError) {
                        expect(err.statusCode).toBe(400);
                        expect(err.code).toBe("INVALID_OBJECT_KEY");
                    }
                });
            },
        );

        it("strips leading slashes from valid keys", async () => {
            const { client, send } = createMockClient(async () => ({}));
            const storage = new SeaweedFsObjectStorage(dummyConfig, { client });

            await storage.delete("/receipts/2026/item.jpg");

            const cmd = send.mock.calls[0]?.[0] as DeleteObjectCommand;
            expect(cmd.input.Key).toBe("receipts/2026/item.jpg");
        });
    });

    describe("verifyBucket & loadObjectStorage", () => {
        it("succeeds when HeadBucketCommand resolves", async () => {
            const { client, send } = createMockClient(async () => ({}));

            const storage = await loadObjectStorage(dummyConfig, { client });

            expect(storage).toBeInstanceOf(SeaweedFsObjectStorage);
            expect(send).toHaveBeenCalledTimes(1);
            expect(send.mock.calls[0]?.[0]).toBeInstanceOf(HeadBucketCommand);
        });

        it("throws StorageFailureError when bucket is missing and autoCreateBucket is false", async () => {
            const notFoundErr = Object.assign(new Error("NotFound"), {
                name: "NotFound",
                $metadata: { httpStatusCode: 404 },
            });
            const { client, send } = createMockClient(async () => {
                throw notFoundErr;
            });

            const promise = loadObjectStorage(dummyConfig, { client, autoCreateBucket: false });

            await expect(promise).rejects.toThrow(StorageFailureError);
            await expect(promise).rejects.toThrow(AppError);
            expect(send).toHaveBeenCalledTimes(1);
        });

        it("auto-creates the bucket when missing and autoCreateBucket is true", async () => {
            const notFoundErr = Object.assign(new Error("NotFound"), {
                name: "NotFound",
                $metadata: { httpStatusCode: 404 },
            });
            const { client, send } = createMockClient(async command => {
                if (command instanceof HeadBucketCommand) {
                    throw notFoundErr;
                }
                return {};
            });

            const storage = await loadObjectStorage(dummyConfig, { client, autoCreateBucket: true });

            expect(storage).toBeInstanceOf(SeaweedFsObjectStorage);
            expect(send).toHaveBeenCalledTimes(2);
            expect(send.mock.calls[0]?.[0]).toBeInstanceOf(HeadBucketCommand);
            expect(send.mock.calls[1]?.[0]).toBeInstanceOf(CreateBucketCommand);
        });

        it("does not attempt CreateBucketCommand on non-404 errors even if autoCreateBucket is true", async () => {
            const { client, send } = createMockClient(async () => {
                throw new Error("AccessDenied");
            });

            const promise = loadObjectStorage(dummyConfig, { client, autoCreateBucket: true });

            await expect(promise).rejects.toThrow(StorageFailureError);
            expect(send).toHaveBeenCalledTimes(1);
        });
    });

    describe("upload", () => {
        it("sends PutObjectCommand with bucket, key, body, contentLength, contentType, and abortSignal", async () => {
            const { client, send } = createMockClient(async () => ({}));
            const storage = new SeaweedFsObjectStorage(dummyConfig, { client });
            const body = Buffer.from("receipt-image-bytes");

            await storage.upload({
                key: "receipts/2026/test.jpg",
                body,
                contentType: "image/jpeg",
            });

            expect(send).toHaveBeenCalledTimes(1);
            const cmd = send.mock.calls[0]?.[0] as PutObjectCommand;
            const opts = send.mock.calls[0]?.[1] as { abortSignal?: AbortSignal };
            expect(cmd).toBeInstanceOf(PutObjectCommand);
            expect(cmd.input).toEqual({
                Bucket: "receipts",
                Key: "receipts/2026/test.jpg",
                Body: body,
                ContentLength: body.byteLength,
                ContentType: "image/jpeg",
            });
            expect(opts?.abortSignal).toBeInstanceOf(AbortSignal);
        });

        it("wraps S3 failure in StorageFailureError", async () => {
            const { client } = createMockClient(async () => {
                throw new Error("network error");
            });
            const storage = new SeaweedFsObjectStorage(dummyConfig, { client });

            const promise = storage.upload({
                key: "receipts/test.jpg",
                body: Buffer.from("data"),
            });

            await expect(promise).rejects.toThrow(StorageFailureError);
            await promise.catch((err: unknown) => {
                expect(err).toBeInstanceOf(AppError);
                if (err instanceof AppError) {
                    expect(err.statusCode).toBe(500);
                    expect(err.code).toBe("STORAGE_FAILURE");
                }
            });
        });
    });

    describe("download", () => {
        it("returns object bytes as a Buffer", async () => {
            const expected = Buffer.from("hello-seaweedfs");
            const { client, send } = createMockClient(async () => ({
                Body: {
                    transformToByteArray: async () => new Uint8Array(expected),
                },
            }));
            const storage = new SeaweedFsObjectStorage(dummyConfig, { client });

            const result = await storage.download("receipts/hello.txt");

            expect(result).toEqual(expected);
            expect(send).toHaveBeenCalledTimes(1);
            const cmd = send.mock.calls[0]?.[0] as GetObjectCommand;
            expect(cmd).toBeInstanceOf(GetObjectCommand);
            expect(cmd.input).toEqual({
                Bucket: "receipts",
                Key: "receipts/hello.txt",
            });
        });

        it("throws ObjectNotFoundError when S3 returns NoSuchKey or 404", async () => {
            const notFoundErr = Object.assign(new Error("The specified key does not exist."), {
                name: "NoSuchKey",
                $metadata: { httpStatusCode: 404 },
            });
            const { client } = createMockClient(async () => {
                throw notFoundErr;
            });
            const storage = new SeaweedFsObjectStorage(dummyConfig, { client });

            const promise = storage.download("missing-key.jpg");

            await expect(promise).rejects.toThrow(ObjectNotFoundError);
            await promise.catch((err: unknown) => {
                expect(err).toBeInstanceOf(AppError);
                if (err instanceof ObjectNotFoundError) {
                    expect(err.key).toBe("missing-key.jpg");
                    expect(err.statusCode).toBe(404);
                    expect(err.code).toBe("OBJECT_NOT_FOUND");
                }
            });
        });

        it("throws StorageFailureError on unexpected S3 errors", async () => {
            const { client } = createMockClient(async () => {
                throw new Error("socket hang up");
            });
            const storage = new SeaweedFsObjectStorage(dummyConfig, { client });

            await expect(storage.download("some-key.jpg")).rejects.toThrow(StorageFailureError);
        });
    });

    describe("exists", () => {
        it("returns true when HeadObjectCommand succeeds", async () => {
            const { client, send } = createMockClient(async () => ({}));
            const storage = new SeaweedFsObjectStorage(dummyConfig, { client });

            const result = await storage.exists("receipts/existing.jpg");

            expect(result).toBe(true);
            expect(send).toHaveBeenCalledTimes(1);
            const cmd = send.mock.calls[0]?.[0] as HeadObjectCommand;
            expect(cmd).toBeInstanceOf(HeadObjectCommand);
            expect(cmd.input).toEqual({
                Bucket: "receipts",
                Key: "receipts/existing.jpg",
            });
        });

        it("returns false when S3 returns 404/NotFound", async () => {
            const notFoundErr = Object.assign(new Error("NotFound"), {
                name: "NotFound",
                $metadata: { httpStatusCode: 404 },
            });
            const { client } = createMockClient(async () => {
                throw notFoundErr;
            });
            const storage = new SeaweedFsObjectStorage(dummyConfig, { client });

            await expect(storage.exists("receipts/missing.jpg")).resolves.toBe(false);
        });

        it("throws StorageFailureError on unexpected S3 errors", async () => {
            const { client } = createMockClient(async () => {
                throw new Error("timeout");
            });
            const storage = new SeaweedFsObjectStorage(dummyConfig, { client });

            await expect(storage.exists("receipts/existing.jpg")).rejects.toThrow(StorageFailureError);
        });
    });

    describe("getSignedUrl", () => {
        it("returns a presigned URL pointing to the configured endpoint and bucket", async () => {
            const storage = new SeaweedFsObjectStorage(dummyConfig);

            const url = await storage.getSignedUrl("folder/receipt.jpg", 600);

            const parsed = new URL(url);
            expect(parsed.origin).toBe("http://localhost:8333");
            expect(parsed.pathname).toBe("/receipts/folder/receipt.jpg");
            expect(parsed.searchParams.get("X-Amz-Expires")).toBe("600");
        });
    });

    describe("delete", () => {
        it("sends DeleteObjectCommand", async () => {
            const { client, send } = createMockClient(async () => ({}));
            const storage = new SeaweedFsObjectStorage(dummyConfig, { client });

            await storage.delete("receipts/old.jpg");

            expect(send).toHaveBeenCalledTimes(1);
            const cmd = send.mock.calls[0]?.[0] as DeleteObjectCommand;
            expect(cmd).toBeInstanceOf(DeleteObjectCommand);
            expect(cmd.input).toEqual({
                Bucket: "receipts",
                Key: "receipts/old.jpg",
            });
        });

        it("does not throw if S3 returns 404/NoSuchKey on delete", async () => {
            const notFoundErr = Object.assign(new Error("Not found"), {
                name: "NoSuchKey",
                $metadata: { httpStatusCode: 404 },
            });
            const { client } = createMockClient(async () => {
                throw notFoundErr;
            });
            const storage = new SeaweedFsObjectStorage(dummyConfig, { client });

            await expect(storage.delete("non-existent.jpg")).resolves.toBeUndefined();
        });

        it("throws StorageFailureError on non-404 S3 errors", async () => {
            const { client } = createMockClient(async () => {
                throw new Error("connection refused");
            });
            const storage = new SeaweedFsObjectStorage(dummyConfig, { client });

            await expect(storage.delete("receipts/old.jpg")).rejects.toThrow(StorageFailureError);
        });
    });
});
