import { UnknownAllergyError } from "../../../shared/errors/unknown-allergy-error.js";
import type { AllergyLookup } from "./interfaces/allergy-lookup.js";

export async function ensureKnownAllergies(allergies: AllergyLookup, allergyIds: readonly string[]): Promise<void> {
    if (allergyIds.length === 0) return;
    const missing = await allergies.findMissingAllergyIds([...new Set(allergyIds)]);
    if (missing.length > 0) throw new UnknownAllergyError(missing);
}
