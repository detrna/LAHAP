/** Stored `user.role` values, also carried in tokens and checked by `authorize()`. Case-sensitive. */
export const ROLES = ["CUSTOMER", "ADMIN", "KITCHEN", "COURIER"] as const;

export type Role = (typeof ROLES)[number];

export function isRole(value: unknown): value is Role {
    return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}
