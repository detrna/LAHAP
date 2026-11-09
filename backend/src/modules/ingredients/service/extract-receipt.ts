import { NoReceiptItemsFoundError } from "../../../shared/ports/receipt-extractor/receipt-extractor.js";
import { roundHalfUp } from "../../../shared/utils/decimal/decimal.js";
import type { ExtractedIngredientUpdateItem, ReceiptExtractResult } from "../domain/ingredient.domain.js";
import { toIngredientQuantity } from "../domain/receipt-quantity.js";
import type { StockPhoto } from "./estimate-stock.js";
import type { IngredientsService } from "./ingredients.service.js";
import type { IngredientRecord } from "./interfaces/ingredients.repository.js";

interface ReceiptTotal {
    readonly record: IngredientRecord;
    readonly added: number;
}

export async function extractReceipt(this: IngredientsService, photo: StockPhoto): Promise<ReceiptExtractResult> {
    const records = await this.ingredientsRepository.findAll();
    const recordById = new Map(records.map(record => [record.id, record]));

    const extracted = await this.receiptExtractor.extract({
        image: photo.image,
        mimeType: photo.mimeType,
        ingredients: records.map(({ id, name, unit }) => ({ id, name, unit })),
    });

    const totals = new Map<string, ReceiptTotal>();
    for (const item of extracted.items) {
        const record = recordById.get(item.id);
        if (record === undefined) continue;
        const quantity = toIngredientQuantity(item.quantity, item.printedUnit, record.unit);
        if (quantity === null) continue;
        totals.set(record.id, { record, added: (totals.get(record.id)?.added ?? 0) + quantity });
    }

    const items: ExtractedIngredientUpdateItem[] = [...totals.values()].map(({ record, added }) => ({
        id: record.id,
        name: record.name,
        unit: record.unit,
        stock: roundHalfUp(record.stock + added, 2),
    }));

    if (items.length === 0) {
        throw new NoReceiptItemsFoundError("no matching receipt items found");
    }

    return { items };
}
