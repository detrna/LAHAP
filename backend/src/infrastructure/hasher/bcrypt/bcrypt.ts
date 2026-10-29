import bcrypt from "bcrypt";
import type { HasherConfig } from "../../../config/hasher.js";
import { HashingFailureError, InvalidHashInputError } from "../../../shared/ports/hasher/errors.js";
import type { Hasher } from "../../../shared/ports/hasher/hasher.js";

/** Bcrypt only processes the first 72 UTF-8 bytes of a secret and truncates at null bytes. */
export const MAX_BCRYPT_BYTES = 72;
export const MIN_SALT_ROUNDS = 4;
export const MAX_SALT_ROUNDS = 31;

export class BcryptHasher implements Hasher {
    private readonly saltRounds: number;

    constructor(config: HasherConfig = { SALT_ROUNDS: 10 }) {
        if (
            !Number.isInteger(config.SALT_ROUNDS) ||
            config.SALT_ROUNDS < MIN_SALT_ROUNDS ||
            config.SALT_ROUNDS > MAX_SALT_ROUNDS
        ) {
            throw new Error(`BCRYPT_SALT_ROUNDS must be an integer between ${MIN_SALT_ROUNDS} and ${MAX_SALT_ROUNDS}`);
        }

        this.saltRounds = config.SALT_ROUNDS;
    }

    async hash(plain: string): Promise<string> {
        if (plain.length === 0) {
            throw new InvalidHashInputError("hash input must not be empty");
        }
        if (plain.includes("\0")) {
            throw new InvalidHashInputError("hash input must not contain null bytes");
        }
        if (Buffer.byteLength(plain, "utf8") > MAX_BCRYPT_BYTES) {
            throw new InvalidHashInputError(`hash input exceeds maximum length of ${MAX_BCRYPT_BYTES} bytes`);
        }

        try {
            return await bcrypt.hash(plain, this.saltRounds);
        } catch (cause) {
            throw new HashingFailureError("hash", cause);
        }
    }

    async compare(plain: string, hashed: string): Promise<boolean> {
        if (plain.length === 0) {
            throw new InvalidHashInputError("hash input must not be empty");
        }
        if (hashed.trim().length === 0) {
            throw new InvalidHashInputError("hashed value must not be empty");
        }

        // Guard against bcrypt silently truncating at 72 bytes or null bytes and falsely matching a prefix
        if (plain.includes("\0") || Buffer.byteLength(plain, "utf8") > MAX_BCRYPT_BYTES) {
            return false;
        }

        try {
            return await bcrypt.compare(plain, hashed);
        } catch (cause) {
            throw new HashingFailureError("compare", cause);
        }
    }
}
