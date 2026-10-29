import bcrypt from "bcrypt";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { HasherConfig } from "../../../config/hasher.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { HashingFailureError, InvalidHashInputError } from "../../../shared/ports/hasher/hasher.js";
import { BcryptHasher, MAX_BCRYPT_BYTES } from "./bcrypt.js";

const fastConfig: HasherConfig = {
    SALT_ROUNDS: 4,
};

describe("BcryptHasher (unit)", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("constructor validation", () => {
        it("throws when SALT_ROUNDS is below 4", () => {
            expect(() => new BcryptHasher({ SALT_ROUNDS: 3 })).toThrow(
                "BCRYPT_SALT_ROUNDS must be an integer between 4 and 31",
            );
        });

        it("throws when SALT_ROUNDS is above 31", () => {
            expect(() => new BcryptHasher({ SALT_ROUNDS: 32 })).toThrow(
                "BCRYPT_SALT_ROUNDS must be an integer between 4 and 31",
            );
        });

        it("throws when SALT_ROUNDS is not an integer", () => {
            expect(() => new BcryptHasher({ SALT_ROUNDS: 10.5 })).toThrow(
                "BCRYPT_SALT_ROUNDS must be an integer between 4 and 31",
            );
            expect(() => new BcryptHasher({ SALT_ROUNDS: Number.NaN })).toThrow(
                "BCRYPT_SALT_ROUNDS must be an integer between 4 and 31",
            );
        });

        it("creates instance with default config", () => {
            expect(new BcryptHasher()).toBeInstanceOf(BcryptHasher);
        });
    });

    describe("hash", () => {
        it("hashes a plain text password and produces a valid bcrypt hash", async () => {
            const hasher = new BcryptHasher(fastConfig);
            const hashed = await hasher.hash("super-secret-password");

            expect(hashed).toMatch(/^\$2[aby]\$04\$/);
            expect(hashed).not.toBe("super-secret-password");
        });

        it("produces different hashes for the same input due to random salting", async () => {
            const hasher = new BcryptHasher(fastConfig);
            const first = await hasher.hash("same-password");
            const second = await hasher.hash("same-password");

            expect(first).not.toBe(second);
        });

        it("accepts an input of exactly 72 UTF-8 bytes", async () => {
            const hasher = new BcryptHasher(fastConfig);
            const exact72 = "a".repeat(MAX_BCRYPT_BYTES);

            const hashed = await hasher.hash(exact72);
            expect(await hasher.compare(exact72, hashed)).toBe(true);
        });

        it("throws InvalidHashInputError when input is empty", async () => {
            const hasher = new BcryptHasher(fastConfig);

            await expect(hasher.hash("")).rejects.toThrow(InvalidHashInputError);
            await expect(hasher.hash("")).rejects.toMatchObject({
                code: "INVALID_HASH_INPUT",
                statusCode: 400,
            });
        });

        it("throws InvalidHashInputError when input contains a null byte", async () => {
            const hasher = new BcryptHasher(fastConfig);

            await expect(hasher.hash("pass\0word")).rejects.toThrow(InvalidHashInputError);
        });

        it("throws InvalidHashInputError when input exceeds 72 UTF-8 bytes (ASCII and multi-byte)", async () => {
            const hasher = new BcryptHasher(fastConfig);

            // 73 ASCII bytes
            await expect(hasher.hash("a".repeat(MAX_BCRYPT_BYTES + 1))).rejects.toThrow(InvalidHashInputError);

            // 19 4-byte emojis = 76 UTF-8 bytes (even though string.length is 38)
            const multiByte = "🔐".repeat(19);
            expect(multiByte.length).toBeLessThan(MAX_BCRYPT_BYTES);
            await expect(hasher.hash(multiByte)).rejects.toThrow(InvalidHashInputError);
        });

        it("wraps underlying bcrypt errors in HashingFailureError", async () => {
            const rootCause = new Error("native bcrypt failure");
            vi.spyOn(bcrypt, "hash").mockRejectedValueOnce(rootCause);
            const hasher = new BcryptHasher(fastConfig);

            let caught: unknown;
            try {
                await hasher.hash("valid-password");
            } catch (err) {
                caught = err;
            }

            expect(caught).toBeInstanceOf(HashingFailureError);
            expect(caught).toBeInstanceOf(AppError);
            const err = caught as HashingFailureError;
            expect(err.code).toBe("HASHING_FAILURE");
            expect(err.statusCode).toBe(500);
            expect(err.operation).toBe("hash");
            expect(err.cause).toBe(rootCause);
        });
    });

    describe("compare", () => {
        it("returns true when plain text matches the hash", async () => {
            const hasher = new BcryptHasher(fastConfig);
            const hashed = await hasher.hash("correct-horse-battery-staple");

            await expect(hasher.compare("correct-horse-battery-staple", hashed)).resolves.toBe(true);
        });

        it("returns false when plain text does not match the hash", async () => {
            const hasher = new BcryptHasher(fastConfig);
            const hashed = await hasher.hash("correct-horse-battery-staple");

            await expect(hasher.compare("wrong-password", hashed)).resolves.toBe(false);
        });

        it("returns false instead of truncating when plain text exceeds 72 bytes with matching prefix", async () => {
            const hasher = new BcryptHasher(fastConfig);
            const exact72 = "a".repeat(MAX_BCRYPT_BYTES);
            const hashed = await hasher.hash(exact72);

            await expect(hasher.compare(`${exact72}extra`, hashed)).resolves.toBe(false);
        });

        it("returns false when plain text contains a null byte", async () => {
            const hasher = new BcryptHasher(fastConfig);
            const hashed = await hasher.hash("pass");

            await expect(hasher.compare("pass\0ignored", hashed)).resolves.toBe(false);
        });

        it("throws InvalidHashInputError when plain text or hashed string is empty", async () => {
            const hasher = new BcryptHasher(fastConfig);
            const hashed = await hasher.hash("secret");

            await expect(hasher.compare("", hashed)).rejects.toThrow(InvalidHashInputError);
            await expect(hasher.compare("secret", "")).rejects.toThrow(InvalidHashInputError);
            await expect(hasher.compare("secret", "   ")).rejects.toThrow(InvalidHashInputError);
        });

        it("wraps underlying bcrypt compare errors in HashingFailureError", async () => {
            const rootCause = new Error("corrupt hash format");
            vi.spyOn(bcrypt, "compare").mockRejectedValueOnce(rootCause);
            const hasher = new BcryptHasher(fastConfig);

            let caught: unknown;
            try {
                await hasher.compare("valid-password", "$2b$04$somehash");
            } catch (err) {
                caught = err;
            }

            expect(caught).toBeInstanceOf(HashingFailureError);
            const err = caught as HashingFailureError;
            expect(err.code).toBe("HASHING_FAILURE");
            expect(err.statusCode).toBe(500);
            expect(err.operation).toBe("compare");
            expect(err.cause).toBe(rootCause);
        });
    });
});
