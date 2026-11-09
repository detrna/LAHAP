import type { IngredientUnit } from "./ingredient.domain.js";

const UNIT_ALIASES = new Map<string, IngredientUnit>([
    ["kg", "kg"],
    ["kgs", "kg"],
    ["kilo", "kg"],
    ["kilogram", "kg"],
    ["g", "gram"],
    ["gr", "gram"],
    ["grm", "gram"],
    ["gram", "gram"],
    ["l", "liter"],
    ["lt", "liter"],
    ["ltr", "liter"],
    ["liter", "liter"],
    ["litre", "liter"],
    ["ml", "ml"],
    ["cc", "ml"],
    ["mililiter", "ml"],
    ["milliliter", "ml"],
    ["butir", "butir"],
    ["btr", "butir"],
    ["ikat", "ikat"],
    ["ikt", "ikat"],
]);

interface Measure {
    readonly dimension: "mass" | "volume";
    readonly factor: number;
}

const MEASURES = new Map<IngredientUnit, Measure>([
    ["kg", { dimension: "mass", factor: 1000 }],
    ["gram", { dimension: "mass", factor: 1 }],
    ["liter", { dimension: "volume", factor: 1000 }],
    ["ml", { dimension: "volume", factor: 1 }],
]);

export function toIngredientQuantity(
    quantity: number,
    printedUnit: string,
    ingredientUnit: IngredientUnit,
): number | null {
    const key = printedUnit.toLowerCase().replace(/[.\s]/g, "");
    if (key === "") return quantity;

    const unit = UNIT_ALIASES.get(key);
    if (unit === undefined) return null;
    if (unit === ingredientUnit) return quantity;

    const from = MEASURES.get(unit);
    const to = MEASURES.get(ingredientUnit);
    if (from === undefined || to === undefined || from.dimension !== to.dimension) return null;

    return (quantity * from.factor) / to.factor;
}
