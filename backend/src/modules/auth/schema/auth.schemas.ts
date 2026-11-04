import { z } from "zod";
import { phoneSchema } from "../../../shared/utils/phone/phone.js";

const BCRYPT_MAX_BYTES = 72;

const passwordSchema = z
    .string()
    .min(8)
    .max(72)
    .refine(value => Buffer.byteLength(value, "utf8") <= BCRYPT_MAX_BYTES, `must be at most ${BCRYPT_MAX_BYTES} bytes`);

export const registerSchema = z
    .object({
        phone: phoneSchema,
        password: passwordSchema,
        confirmPassword: z.string(),
        name: z.string().trim().max(100).optional(),
        email: z.string().trim().pipe(z.email().max(100)).optional(),
        address: z.string().trim().optional(),
        latitude: z.number().min(-90).max(90).optional(),
        longitude: z.number().min(-180).max(180).optional(),
        allergyIds: z
            .array(z.uuid())
            .refine(ids => new Set(ids).size === ids.length, "must not contain duplicates")
            .optional(),
        allergyNote: z.string().trim().optional(),
    })
    .superRefine((value, ctx) => {
        if (value.confirmPassword !== value.password) {
            ctx.addIssue({ code: "custom", path: ["confirmPassword"], message: "must match password" });
        }
        if ((value.latitude === undefined) !== (value.longitude === undefined)) {
            const missing = value.latitude === undefined ? "latitude" : "longitude";
            ctx.addIssue({ code: "custom", path: [missing], message: "latitude and longitude must be sent together" });
        }
    })
    .transform(({ confirmPassword: _confirmPassword, ...customer }) => customer);

export const loginSchema = z.object({
    identifier: z.string().trim().min(1).max(254),
    password: z.string().min(1).max(1024),
});

export const refreshSchema = z
    .object({
        refreshToken: z.string().trim().min(1).optional(),
    })
    .default({});

export type RegisterBody = z.output<typeof registerSchema>;
export type LoginBody = z.output<typeof loginSchema>;
export type RefreshBody = z.output<typeof refreshSchema>;
