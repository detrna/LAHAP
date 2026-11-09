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

export async function truncateAllTables(tx: SeedTx): Promise<readonly string[]> {
    const rows = await tx.query(
        tx.raw.sql`SELECT tablename::text AS name FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`
            .returnsRow({ name: "pg/text@1" })
            .build(),
    );
    if (rows.length === 0) return [];
    await tx.execute(
        tx.raw.sql`
            DO $$
            BEGIN
                EXECUTE (
                    SELECT 'TRUNCATE TABLE ' || string_agg(format('%I.%I', schemaname, tablename), ', ')
                        || ' RESTART IDENTITY CASCADE'
                    FROM pg_tables
                    WHERE schemaname = 'public'
                );
            END
            $$
        `
            .affectedCount()
            .build(),
    );
    return rows.map(row => row.name);
}
