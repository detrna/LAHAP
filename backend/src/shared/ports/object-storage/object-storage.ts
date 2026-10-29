import type { Buffer } from "node:buffer";

export * from "./errors.js";

export interface UploadObjectInput {
    key: string;
    body: Buffer | Uint8Array | string;
    contentType?: string | undefined;
}

export interface ObjectStorage {
    /** Stores an object, overwriting any existing object with the same key. */
    upload(input: UploadObjectInput): Promise<void>;

    /** Returns the object's bytes. Throws ObjectNotFoundError if the key does not exist. */
    download(key: string): Promise<Buffer>;

    /** Returns true if the object exists, false if it does not. */
    exists(key: string): Promise<boolean>;

    /** Returns a temporary URL the client can use to read the object directly. */
    getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>;

    /** Deletes an object. Deleting a key that does not exist is not an error. */
    delete(key: string): Promise<void>;
}
