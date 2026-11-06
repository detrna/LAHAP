import { toIsoTimestamp } from "../../../../shared/time/timestamp.js";
import type { Allergy } from "../../domain/allergy.domain.js";
import type { AllergyRecord } from "../interfaces/catalog.repository.js";

export function toAllergy(record: AllergyRecord): Allergy {
    return {
        id: record.id,
        name: record.name,
        createdAt: toIsoTimestamp(record.createdAt),
        updatedAt: toIsoTimestamp(record.updatedAt),
    };
}
