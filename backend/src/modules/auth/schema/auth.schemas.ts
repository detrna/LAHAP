import { z } from "zod";
import { latitudeSchema, longitudeSchema, refineCoordinatesTogether } from "../../../shared/schema/coordinates.js";
import { passwordSchema } from "../../../shared/schema/password.js";
import { uniqueArray } from "../../../shared/schema/unique-array.js";
import { phoneSchema } from "../../../shared/utils/phone/phone.js";

export const registerSchema = z
    .object({
        phone: phoneSchema,
        password: passwordSchema,
        confirmPassword: z.string(),
        name: z.string().trim().max(100).optional(),
        email: z.string().trim().pipe(z.email().max(100)).optional(),
        address: z.string().trim().optional(),
        latitude: latitudeSchema.optional(),
        longitude: longitudeSchema.optional(),
        allergyIds: uniqueArray(z.uuid()).optional(),
        allergyNote: z.string().trim().optional(),
    })
    .superRefine((value, ctx) => {
        if (value.confirmPassword !== value.password) {
            ctx.addIssue({ code: "custom", path: ["confirmPassword"], message: "must match password" });
        }
        refineCoordinatesTogether(value, ctx);
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
