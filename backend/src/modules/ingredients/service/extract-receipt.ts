import { NoReceiptItemsFoundError } from "../../../shared/ports/receipt-extractor/receipt-extractor.js";
import { roundHalfUp } from "../../../shared/utils/decimal/decimal.js";
import type { ExtractedIngredientUpdateItem, ReceiptExtractResult } from "../domain/ingredient.domain.js";
import type { StockPhoto } from "./estimate-stock.js";
import type { IngredientsService } from "./ingredients.service.js";

export async function extractReceipt(this: IngredientsService, photo: StockPhoto): Promise<ReceiptExtractResult> {
    const records = await this.ingredientsRepository.findAll();
    const recordById = new Map(records.map(record => [record.id, record]));

    const extracted = await this.receiptExtractor.extract({
        image: photo.image,
        mimeType: photo.mimeType,
        ingredients: records.map(({ id, name, unit }) => ({ id, name, unit })),
    });

    const addedById = new Map<string, number>();
    for (const item of extracted.items) {
        if (!recordById.has(item.id)) continue;
        addedById.set(item.id, roundHalfUp((addedById.get(item.id) ?? 0) + item.quantity, 2));
    }

    const items: ExtractedIngredientUpdateItem[] = [];
    for (const [id, added] of addedById) {
        const record = recordById.get(id);
        if (record === undefined) continue;
        items.push({
            id: record.id,
            name: record.name,
            unit: record.unit,
            stock: roundHalfUp(record.stock + added, 2),
        });
    }

    if (items.length === 0) {
        throw new NoReceiptItemsFoundError("no matching receipt items found");
    }

    return { items };
}
