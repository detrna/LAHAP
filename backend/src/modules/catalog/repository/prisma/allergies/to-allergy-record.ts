import type { AllergyRecord } from "../../../service/interfaces/catalog.repository.js";

export function toAllergyRecord(row: {
    readonly id: string;
    readonly name: string;
    readonly createdAt: Temporal.PlainDateTime;
    readonly updatedAt: Temporal.PlainDateTime;
}): AllergyRecord {
    return { id: row.id, name: row.name, createdAt: row.createdAt, updatedAt: row.updatedAt };
}
