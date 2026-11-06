import type { AllergyLookup } from "./interfaces/allergy-lookup.js";
import { UnknownAllergyError } from "./interfaces/users.repository.js";

export async function ensureKnownAllergies(allergies: AllergyLookup, allergyIds: readonly string[]): Promise<void> {
    if (allergyIds.length === 0) return;
    const missing = await allergies.findMissingAllergyIds(allergyIds);
    if (missing.length > 0) throw new UnknownAllergyError(missing);
}
