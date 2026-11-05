import { z } from "zod";

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;
export const BCRYPT_MAX_BYTES = 72;

export const passwordSchema = z
    .string()
    .min(PASSWORD_MIN_LENGTH)
    .max(PASSWORD_MAX_LENGTH)
    .refine(value => Buffer.byteLength(value, "utf8") <= BCRYPT_MAX_BYTES, `must be at most ${BCRYPT_MAX_BYTES} bytes`);
