import type {
    IngredientStockHistoryListRecord,
    IngredientStockHistoryQuery,
} from "../../service/interfaces/ingredients.repository.js";
import { IngredientsRepositoryFailureError } from "../../service/interfaces/ingredients.repository.js";
import type { PrismaIngredientsRepository } from "./ingredients-repository.js";
import { toIngredientStockChangeRecord } from "./to-ingredient-record.js";

export async function listStockHistory(
    this: PrismaIngredientsRepository,
    query: IngredientStockHistoryQuery,
): Promise<IngredientStockHistoryListRecord> {
    try {
        const matching = () => this.db.orm.public.IngredientStockHistory.where({ ingredientId: query.ingredientId });
        const [rows, totals] = await Promise.all([
            matching()
                .orderBy([item => item.changedAt.desc(), item => item.id.desc()])
                .offset(query.skip)
                .limit(query.take)
                .all(),
            matching().aggregate(aggregate => ({ total: aggregate.count() })),
        ]);
        return { items: rows.map(toIngredientStockChangeRecord), total: totals.total };
    } catch (cause) {
        throw new IngredientsRepositoryFailureError("listStockHistory", cause);
    }
}
