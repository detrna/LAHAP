const ENTITY_PREFIX = {
    business: 1,
    allergy: 2,
    user: 3,
    tier: 4,
    ingredient: 5,
    menu: 6,
    package: 7,
    promoCode: 8,
    messageTemplate: 9,
} as const;

export type SeedEntity = keyof typeof ENTITY_PREFIX;

export function seedId(entity: SeedEntity, n: number): string {
    const prefix = String(ENTITY_PREFIX[entity]).padStart(8, "0");
    return `${prefix}-0000-4000-8000-${String(n).padStart(12, "0")}`;
}
