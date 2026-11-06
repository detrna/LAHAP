import type { BatchDeleteResult } from "../../../shared/response/batch-result.js";
import type { IngredientsService } from "./ingredients.service.js";

export async function deleteIngredients(this: IngredientsService, ids: readonly string[]): Promise<BatchDeleteResult> {
    return { deletedCount: await this.ingredientsRepository.deleteMany(ids) };
}
