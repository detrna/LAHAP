import { toIsoTimestamp } from "../../../../shared/time/timestamp.js";
import type { Allergy } from "../../domain/allergy.domain.js";
import type { Menu, MenuIngredient } from "../../domain/menu.domain.js";
import type { MenuRecord } from "../interfaces/catalog.repository.js";

export interface MenuContext {
    readonly photoUrl: string;
    readonly allergies: readonly Allergy[];
    readonly ingredients?: readonly MenuIngredient[] | undefined;
}

export function toMenu(record: MenuRecord, context: MenuContext): Menu {
    return {
        id: record.id,
        name: record.name,
        description: record.description,
        isAlternative: record.isAlternative,
        tags: record.tags,
        photoKey: record.photoKey,
        photoUrl: context.photoUrl,
        createdAt: toIsoTimestamp(record.createdAt),
        updatedAt: toIsoTimestamp(record.updatedAt),
        ...(context.ingredients !== undefined ? { ingredients: context.ingredients } : {}),
        allergies: context.allergies,
    };
}
