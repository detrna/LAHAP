import type { ShoppingListItem } from "../../../ingredients/domain/ingredient.domain.js";

export interface ShoppingList {
    getShoppingList(range: {
        readonly from: Temporal.PlainDate;
        readonly to: Temporal.PlainDate;
    }): Promise<readonly ShoppingListItem[]>;
}
