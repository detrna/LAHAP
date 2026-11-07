import type { SeedTx } from "./seed-context.js";

export async function resetDatabase(tx: SeedTx): Promise<void> {
    await tx.execute(
        tx.raw.sql`
            TRUNCATE TABLE
                "announcement", "delivery_method_change_slot", "delivery_method_change", "payment",
                "delivery_obstacle", "order_status_history", "order", "subscription",
                "notification", "membership", "schedule_menu", "schedule", "menu_ingredient", "menu",
                "ingredient_stock_history", "ingredient_allergy", "ingredient", "user_allergy", "allergy", "refresh_token", "user", "tier", "package",
                "promo_code", "message_template", "business"
            CASCADE
        `
            .affectedCount()
            .build(),
    );
}
