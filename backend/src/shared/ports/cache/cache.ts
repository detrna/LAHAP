export * from "./errors.js";

export interface SetCacheOptions {
    /** Optional time-to-live in seconds (must be a positive integer when provided). */
    readonly ttlSeconds?: number | undefined;
}

export interface Cache {
    /** Stores a string value under the given key, optionally expiring after ttlSeconds. */
    set(key: string, value: string, options?: SetCacheOptions): Promise<void>;

    /** Retrieves the string value stored at key, or null if not found / expired. */
    get(key: string): Promise<string | null>;

    /** Returns true if the key exists, false otherwise. */
    exists(key: string): Promise<boolean>;

    /** Deletes a key. Deleting a non-existent key is not an error. */
    delete(key: string): Promise<void>;

    /** Closes the underlying cache connection. */
    close(): Promise<void>;
}

