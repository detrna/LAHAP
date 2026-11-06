import type { BatchDeleteResult } from "../../../shared/response/batch-result.js";
import { IngredientInUseError } from "../domain/errors.js";
import type { IngredientsService } from "./ingredients.service.js";

export async function deleteIngredients(this: IngredientsService, ids: readonly string[]): Promise<BatchDeleteResult> {
    const usages = await this.menus.findMenusUsingIngredients(ids);
    if (usages.length > 0) {
        throw new IngredientInUseError({ menuNames: [...new Set(usages.map(usage => usage.menuName))] });
    }
    return { deletedCount: await this.ingredientsRepository.deleteMany(ids) };
}
