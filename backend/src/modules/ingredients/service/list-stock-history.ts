import { toIsoTimestamp } from "../../../shared/time/timestamp.js";
import { roundHalfUp } from "../../../shared/utils/decimal/decimal.js";
import type { IngredientStockChange } from "../domain/ingredient.domain.js";
import type { IngredientsService } from "./ingredients.service.js";
import { IngredientNotFoundError } from "./interfaces/ingredients.repository.js";

export interface ListStockHistoryInput {
    readonly skip: number;
    readonly take: number;
}

export interface IngredientStockHistoryPage {
    readonly items: readonly IngredientStockChange[];
    readonly total: number;
}

export async function listStockHistory(
    this: IngredientsService,
    ingredientId: string,
    input: ListStockHistoryInput,
): Promise<IngredientStockHistoryPage> {
    const ingredient = await this.ingredientsRepository.findById(ingredientId);
    if (ingredient === null) throw new IngredientNotFoundError(ingredientId);

    const { items, total } = await this.ingredientsRepository.listStockHistory({
        ingredientId,
        skip: input.skip,
        take: input.take,
    });
    if (items.length === 0) return { items: [], total };

    const actorIds = [...new Set(items.map(item => item.changedById))];
    const actors = await this.users.getSummaries(actorIds);
    const actorById = new Map(actors.map(actor => [actor.id, actor]));

    return {
        items: items.map(item => ({
            id: item.id,
            ingredientId: item.ingredientId,
            previousStock: item.previousStock,
            newStock: item.newStock,
            delta: roundHalfUp(item.newStock - item.previousStock, 2),
            changedById: item.changedById,
            changedBy: actorById.get(item.changedById) ?? null,
            changedAt: toIsoTimestamp(item.changedAt),
        })),
        total,
    };
}
