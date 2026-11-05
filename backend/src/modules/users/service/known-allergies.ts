import type { UsersRepository } from "./interfaces/users.repository.js";
import { UnknownAllergyError } from "./interfaces/users.repository.js";

export async function ensureKnownAllergies(repository: UsersRepository, allergyIds: readonly string[]): Promise<void> {
    if (allergyIds.length === 0) return;
    const missing = await repository.findMissingAllergyIds(allergyIds);
    if (missing.length > 0) throw new UnknownAllergyError(missing);
}
