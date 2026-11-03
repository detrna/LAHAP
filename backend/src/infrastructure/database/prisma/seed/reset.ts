import type { SeedTx } from "./seed-context.js";

export async function resetDatabase(tx: SeedTx): Promise<void> {
    await tx.execute(
        tx.raw.sql`
            TRUNCATE TABLE
                "announcement", "payment", "delivery_obstacle", "order_status_history", "order", "subscription",
                "notification", "membership", "schedule_menu", "schedule", "menu_ingredient", "menu",
                "ingredient_allergy", "ingredient", "user_allergy", "allergy", "user", "tier", "package",
                "promo_code", "message_template", "business"
            CASCADE
        `
            .affectedCount()
            .build(),
    );
}
