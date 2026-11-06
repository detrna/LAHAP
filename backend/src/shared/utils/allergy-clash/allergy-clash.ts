export function findClashingAllergies<T extends { readonly id: string }>(
    userAllergyIds: readonly string[],
    menuAllergies: readonly T[],
): readonly T[] {
    if (userAllergyIds.length === 0) return [];
    const own = new Set(userAllergyIds);
    return menuAllergies.filter(allergy => own.has(allergy.id));
}
