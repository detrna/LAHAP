export * from "./errors.js";

export interface Hasher {
    /** Hashes a plain-text value and returns the encoded hash string. */
    hash(plain: string): Promise<string>;

    /** Returns true if the plain-text value matches the encoded hash, false otherwise. */
    compare(plain: string, hashed: string): Promise<boolean>;
}

