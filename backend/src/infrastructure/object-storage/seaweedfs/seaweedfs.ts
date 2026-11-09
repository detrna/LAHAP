import { Buffer } from "node:buffer";
import http, { type IncomingHttpHeaders } from "node:http";
import https from "node:https";
import {
    CreateBucketCommand,
    DeleteObjectCommand,
    GetObjectCommand,
    HeadBucketCommand,
    HeadObjectCommand,
    PutObjectCommand,
    S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl as createPresignedUrl } from "@aws-sdk/s3-request-presigner";
import type { ObjectStorageConfig } from "../../../config/object-storage.js";
import {
    InvalidObjectKeyError,
    ObjectNotFoundError,
    StorageFailureError,
} from "../../../shared/ports/object-storage/errors.js";
import type {
    ObjectStorage,
    SignedReadRequest,
    SignedReadResponse,
    UploadObjectInput,
} from "../../../shared/ports/object-storage/object-storage.js";

function isNotFoundError(err: unknown): boolean {
    if (typeof err !== "object" || err === null) return false;
    const candidate = err as {
        name?: string;
        Code?: string;
        $metadata?: { httpStatusCode?: number };
    };
    return (
        candidate.name === "NoSuchKey" ||
        candidate.name === "NoSuchBucket" ||
        candidate.name === "NotFound" ||
        candidate.Code === "NoSuchKey" ||
        candidate.Code === "NoSuchBucket" ||
        candidate.$metadata?.httpStatusCode === 404
    );
}

export function normalizeKey(rawKey: string): string {
    const trimmed = rawKey.trim().replace(/^\/+/, "");
    if (!trimmed) {
        throw new InvalidObjectKeyError(rawKey, "object key must not be empty");
    }
    if (trimmed.includes("\0")) {
        throw new InvalidObjectKeyError(rawKey, "object key must not contain null bytes");
    }
    const segments = trimmed.split("/");
    if (segments.some(segment => segment === "." || segment === ".." || segment === "")) {
        throw new InvalidObjectKeyError(rawKey, "object key contains invalid path segments");
    }
    return trimmed;
}

function parseOrigin(value: string, envVar: string): URL {
    let url: URL;
    try {
        url = new URL(value);
    } catch {
        throw new Error(`${envVar} must be a URL`);
    }
    if (url.pathname !== "/" || url.search !== "" || url.hash !== "") {
        throw new Error(`${envVar} must be a URL without a path`);
    }
    return url;
}

function createClient(config: ObjectStorageConfig, endpoint: string): S3Client {
    return new S3Client({
        endpoint,
        region: config.REGION,
        forcePathStyle: true,
        maxAttempts: config.MAX_RETRIES + 1,
        requestChecksumCalculation: "WHEN_REQUIRED",
        responseChecksumValidation: "WHEN_REQUIRED",
        credentials: {
            accessKeyId: config.ACCESS_KEY,
            secretAccessKey: config.SECRET_KEY,
        },
    });
}

function flattenHeaders(headers: IncomingHttpHeaders): Record<string, string> {
    const flat: Record<string, string> = {};
    for (const [name, value] of Object.entries(headers)) {
        if (value === undefined) continue;
        flat[name] = Array.isArray(value) ? value.join(", ") : value;
    }
    return flat;
}

export interface SeaweedFsObjectStorageOptions {
    client?: S3Client | undefined;
    signingClient?: S3Client | undefined;
    autoCreateBucket?: boolean | undefined;
}

export class SeaweedFsObjectStorage implements ObjectStorage {
    readonly signedUrlPathPrefix: string;
    private readonly client: S3Client;
    private readonly signingClient: S3Client;
    private readonly endpoint: URL;
    private readonly publicHost: string;
    private readonly bucket: string;
    private readonly defaultExpiresIn: number;
    private readonly timeoutMs: number;

    constructor(config: ObjectStorageConfig, options: SeaweedFsObjectStorageOptions = {}) {
        if (!config.ACCESS_KEY) {
            throw new Error("S3_ACCESS_KEY is not set");
        }
        if (!config.SECRET_KEY) {
            throw new Error("S3_SECRET_KEY is not set");
        }
        if (!config.BUCKET) {
            throw new Error("S3_BUCKET is not set");
        }
        if (!config.ENDPOINT) {
            throw new Error("S3_ENDPOINT is not set");
        }

        this.endpoint = parseOrigin(config.ENDPOINT, "S3_ENDPOINT");
        this.publicHost = parseOrigin(config.PUBLIC_ENDPOINT, "S3_PUBLIC_ENDPOINT").host;
        this.bucket = config.BUCKET;
        this.signedUrlPathPrefix = `/${config.BUCKET}`;
        this.defaultExpiresIn = config.SIGNED_URL_EXPIRES_IN;
        this.timeoutMs = config.TIMEOUT_MS;
        this.client = options.client ?? createClient(config, config.ENDPOINT);
        this.signingClient =
            options.signingClient ??
            (config.PUBLIC_ENDPOINT === config.ENDPOINT ? this.client : createClient(config, config.PUBLIC_ENDPOINT));
    }

    private requestOptions() {
        return { abortSignal: AbortSignal.timeout(this.timeoutMs) };
    }

    async verifyBucket(options: { autoCreate?: boolean | undefined } = {}): Promise<void> {
        try {
            await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }), this.requestOptions());
        } catch (cause) {
            if (options.autoCreate && isNotFoundError(cause)) {
                try {
                    await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }), this.requestOptions());
                    return;
                } catch (createCause) {
                    throw new StorageFailureError("createBucket", createCause);
                }
            }
            throw new StorageFailureError("verifyBucket", cause);
        }
    }

    async upload(input: UploadObjectInput): Promise<void> {
        const key = normalizeKey(input.key);
        const body = Buffer.isBuffer(input.body) ? input.body : Buffer.from(input.body);
        try {
            await this.client.send(
                new PutObjectCommand({
                    Bucket: this.bucket,
                    Key: key,
                    Body: body,
                    ContentLength: body.byteLength,
                    ContentType: input.contentType,
                }),
                this.requestOptions(),
            );
        } catch (cause) {
            throw new StorageFailureError("upload", cause);
        }
    }

    async download(key: string): Promise<Buffer> {
        const normalizedKey = normalizeKey(key);
        try {
            const response = await this.client.send(
                new GetObjectCommand({
                    Bucket: this.bucket,
                    Key: normalizedKey,
                }),
                this.requestOptions(),
            );

            if (!response.Body) {
                throw new Error("Empty response body");
            }

            const bytes = await response.Body.transformToByteArray();
            return Buffer.from(bytes);
        } catch (cause) {
            if (isNotFoundError(cause)) {
                throw new ObjectNotFoundError(normalizedKey, { cause });
            }
            throw new StorageFailureError("download", cause);
        }
    }

    async exists(key: string): Promise<boolean> {
        const normalizedKey = normalizeKey(key);
        try {
            await this.client.send(
                new HeadObjectCommand({
                    Bucket: this.bucket,
                    Key: normalizedKey,
                }),
                this.requestOptions(),
            );
            return true;
        } catch (cause) {
            if (isNotFoundError(cause)) {
                return false;
            }
            throw new StorageFailureError("exists", cause);
        }
    }

    async getSignedUrl(key: string, expiresInSeconds?: number): Promise<string> {
        const normalizedKey = normalizeKey(key);
        try {
            const command = new GetObjectCommand({
                Bucket: this.bucket,
                Key: normalizedKey,
            });
            return await createPresignedUrl(this.signingClient, command, {
                expiresIn: expiresInSeconds ?? this.defaultExpiresIn,
            });
        } catch (cause) {
            throw new StorageFailureError("getSignedUrl", cause);
        }
    }

    async forwardSignedRead(request: SignedReadRequest): Promise<SignedReadResponse> {
        if (!request.pathWithQuery.startsWith(`${this.signedUrlPathPrefix}/`)) {
            throw new InvalidObjectKeyError(request.pathWithQuery, "path is outside the bucket");
        }
        const transport = this.endpoint.protocol === "https:" ? https : http;
        return new Promise((resolve, reject) => {
            const upstream = transport.request(
                {
                    protocol: this.endpoint.protocol,
                    hostname: this.endpoint.hostname,
                    port: this.endpoint.port,
                    method: request.method,
                    path: request.pathWithQuery,
                    headers: { ...request.headers, host: this.publicHost },
                    timeout: this.timeoutMs,
                },
                response =>
                    resolve({
                        status: response.statusCode ?? 502,
                        headers: flattenHeaders(response.headers),
                        body: response,
                    }),
            );
            upstream.on("timeout", () => upstream.destroy(new Error("storage did not respond in time")));
            upstream.on("error", cause => reject(new StorageFailureError("forwardSignedRead", cause)));
            upstream.end();
        });
    }

    async delete(key: string): Promise<void> {
        const normalizedKey = normalizeKey(key);
        try {
            await this.client.send(
                new DeleteObjectCommand({
                    Bucket: this.bucket,
                    Key: normalizedKey,
                }),
                this.requestOptions(),
            );
        } catch (cause) {
            if (isNotFoundError(cause)) {
                return;
            }
            throw new StorageFailureError("delete", cause);
        }
    }
}

export const loadObjectStorage = async (
    config: ObjectStorageConfig,
    options?: SeaweedFsObjectStorageOptions,
): Promise<SeaweedFsObjectStorage> => {
    const storage = new SeaweedFsObjectStorage(config, options);
    await storage.verifyBucket({ autoCreate: options?.autoCreateBucket });
    return storage;
};
