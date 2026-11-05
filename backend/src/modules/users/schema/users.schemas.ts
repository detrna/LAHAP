import { z } from "zod";
import { ROLES } from "../../../shared/auth/roles.js";
import { paginationQuerySchema } from "../../../shared/pagination/index.js";
import {
    latitudeSchema,
    longitudeSchema,
    refineCoordinatesPatch,
    refineCoordinatesTogether,
} from "../../../shared/schema/coordinates.js";
import { passwordSchema } from "../../../shared/schema/password.js";
import { queryBooleanSchema } from "../../../shared/schema/query-boolean.js";
import { searchQuerySchema } from "../../../shared/schema/search.js";
import { uniqueArray } from "../../../shared/schema/unique-array.js";
import { phoneSchema } from "../../../shared/utils/phone/phone.js";

const roleSchema = z.enum(ROLES);
const emailSchema = z.string().trim().pipe(z.email().max(100));
const updatedNameSchema = z.string().trim().min(1).max(100);
const textSchema = z.string().trim();

export const userIdParamsSchema = z.object({
    id: z.uuid(),
});

const profileChangesShape = {
    name: updatedNameSchema.optional(),
    email: emailSchema.nullable().optional(),
    phone: phoneSchema.optional(),
    address: textSchema.nullable().optional(),
    latitude: latitudeSchema.nullable().optional(),
    longitude: longitudeSchema.nullable().optional(),
    allergyIds: uniqueArray(z.uuid()).optional(),
    allergyNote: textSchema.nullable().optional(),
};

function refineChanges(value: Record<string, unknown>, ctx: z.RefinementCtx): void {
    if (Object.values(value).every(field => field === undefined)) {
        ctx.addIssue({ code: "custom", path: [], message: "must change at least one field" });
    }
    refineCoordinatesPatch(value, ctx);
}

export const profileUpdateSchema = z.object(profileChangesShape).superRefine(refineChanges);

export const userUpdateSchema = z
    .object({
        ...profileChangesShape,
        password: passwordSchema.optional(),
        role: roleSchema.optional(),
        isActive: z.boolean().optional(),
    })
    .superRefine(refineChanges);

export const userCreateSchema = z
    .object({
        phone: phoneSchema,
        password: passwordSchema,
        role: roleSchema,
        name: z.string().trim().max(100).optional(),
        email: emailSchema.optional(),
        address: textSchema.optional(),
        latitude: latitudeSchema.optional(),
        longitude: longitudeSchema.optional(),
        allergyIds: uniqueArray(z.uuid()).optional(),
        allergyNote: textSchema.optional(),
        isActive: z.boolean().optional(),
    })
    .superRefine(refineCoordinatesTogether);

export const passwordChangeSchema = z.object({
    currentPassword: z.string().min(1).max(1024),
    newPassword: passwordSchema,
});

export const userListQuerySchema = paginationQuerySchema.extend({
    search: searchQuerySchema,
    role: z.preprocess(value => (typeof value === "string" ? [value] : value), uniqueArray(roleSchema)).optional(),
    isActive: queryBooleanSchema.optional(),
    isChurned: queryBooleanSchema.optional(),
});

export type UserIdParams = z.output<typeof userIdParamsSchema>;
export type ProfileUpdateBody = z.output<typeof profileUpdateSchema>;
export type UserUpdateBody = z.output<typeof userUpdateSchema>;
export type UserCreateBody = z.output<typeof userCreateSchema>;
export type PasswordChangeBody = z.output<typeof passwordChangeSchema>;
export type UserListQuery = z.output<typeof userListQuerySchema>;
