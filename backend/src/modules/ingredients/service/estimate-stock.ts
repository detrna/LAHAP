import type { Buffer } from "node:buffer";
import type { PhotoEstimate } from "../domain/ingredient.domain.js";
import type { IngredientsService } from "./ingredients.service.js";
import { IngredientNotFoundError } from "./interfaces/ingredients.repository.js";

export interface StockPhoto {
    readonly image: Buffer;
    readonly mimeType: string;
}

export async function estimateStock(this: IngredientsService, id: string, photo: StockPhoto): Promise<PhotoEstimate> {
    const ingredient = await this.ingredientsRepository.findById(id);
    if (ingredient === null) throw new IngredientNotFoundError(id);
    const { item } = await this.stockLevelEstimator.estimate({
        image: photo.image,
        mimeType: photo.mimeType,
        ingredient: { name: ingredient.name, unit: ingredient.unit },
    });
    return { ingredientId: id, estimatedQuantity: item.quantity, unit: ingredient.unit };
}
