import type { Varchar } from "@prisma/orm-postgres/contract-builder";
import type { Logger } from "../../../../shared/ports/logger/logger.js";
import { ALLERGIES } from "./modules/allergies/allergies.data.js";
import { BUSINESS } from "./modules/business/business.data.js";
import { INGREDIENTS } from "./modules/ingredients/ingredients.data.js";
import { MENUS } from "./modules/menus/menus.data.js";
import { MESSAGE_TEMPLATES } from "./modules/message-templates/message-templates.data.js";
import { PACKAGES } from "./modules/packages/packages.data.js";
import { PROMO_CODES } from "./modules/promo-codes/promo-codes.data.js";
import { TIERS } from "./modules/tiers/tiers.data.js";
import { USERS } from "./modules/users/users.data.js";
import type { SeedTx } from "./seed-context.js";

export const SEED_IDS = {
    business: [BUSINESS.id],
    allergies: Object.values(ALLERGIES).map(a => a.id),
    users: USERS.map(u => u.id),
    tiers: TIERS.map(t => t.id),
    ingredients: Object.values(INGREDIENTS).map(i => i.id),
    menus: Object.values(MENUS).map(m => m.id),
    packages: Object.values(PACKAGES).map(p => p.id),
    promoCodes: PROMO_CODES.map(p => p.id),
    messageTemplates: MESSAGE_TEMPLATES.map(t => t.id),
} as const;

const asIds = (ids: readonly string[]): Varchar<36>[] => ids as Varchar<36>[];

export async function cleanSeed(tx: SeedTx, logger?: Logger): Promise<Record<string, number>> {
    await tx.orm.public.DeliveryObstacle.where(r => r.authorId.in(asIds(SEED_IDS.users))).deleteAndCount();
    await tx.orm.public.OrderStatusHistory.where(r => r.changedById.in(asIds(SEED_IDS.users))).deleteAndCount();

    const [userSubs, pkgSubs, pkgSchedules] = await Promise.all([
        tx.orm.public.Subscription.where(s => s.userId.in(asIds(SEED_IDS.users)))
            .select("id")
            .all(),
        tx.orm.public.Subscription.where(s => s.packageId.in(asIds(SEED_IDS.packages)))
            .select("id")
            .all(),
        tx.orm.public.Schedule.where(s => s.packageId.in(asIds(SEED_IDS.packages)))
            .select("id")
            .all(),
    ]);

    const subscriptionIds = [...new Set([...userSubs, ...pkgSubs].map(s => s.id))];
    const scheduleIds = pkgSchedules.map(s => s.id);

    await tx.orm.public.Payment.where(p => p.userId.in(asIds(SEED_IDS.users))).deleteAndCount();
    if (subscriptionIds.length > 0) {
        await tx.orm.public.Payment.where(p => p.subscriptionId.in(asIds(subscriptionIds))).deleteAndCount();
    }
    if (scheduleIds.length > 0) {
        await tx.orm.public.Order.where(o => o.menuScheduleId.in(asIds(scheduleIds))).deleteAndCount();
    }
    if (subscriptionIds.length > 0) {
        await tx.orm.public.Subscription.where(s => s.id.in(asIds(subscriptionIds))).deleteAndCount();
    }

    await tx.orm.public.Membership.where(m => m.tierId.in(asIds(SEED_IDS.tiers))).deleteAndCount();
    await tx.orm.public.Membership.where(m => m.userId.in(asIds(SEED_IDS.users))).deleteAndCount();
    await tx.orm.public.ScheduleMenu.where(sm => sm.menuId.in(asIds(SEED_IDS.menus))).deleteAndCount();
    await tx.orm.public.MenuIngredient.where(mi => mi.ingredientId.in(asIds(SEED_IDS.ingredients))).deleteAndCount();

    const steps: readonly [name: string, run: () => Promise<number>][] = [
        [
            "message-templates",
            () => tx.orm.public.MessageTemplate.where(t => t.id.in(asIds(SEED_IDS.messageTemplates))).deleteAndCount(),
        ],
        ["promo-codes", () => tx.orm.public.PromoCode.where(p => p.id.in(asIds(SEED_IDS.promoCodes))).deleteAndCount()],
        [
            "schedules",
            () => tx.orm.public.Schedule.where(s => s.packageId.in(asIds(SEED_IDS.packages))).deleteAndCount(),
        ],
        ["packages", () => tx.orm.public.Package.where(p => p.id.in(asIds(SEED_IDS.packages))).deleteAndCount()],
        ["menus", () => tx.orm.public.Menu.where(m => m.id.in(asIds(SEED_IDS.menus))).deleteAndCount()],
        [
            "ingredients",
            () => tx.orm.public.Ingredient.where(i => i.id.in(asIds(SEED_IDS.ingredients))).deleteAndCount(),
        ],
        ["tiers", () => tx.orm.public.Tier.where(t => t.id.in(asIds(SEED_IDS.tiers))).deleteAndCount()],
        ["users", () => tx.orm.public.User.where(u => u.id.in(asIds(SEED_IDS.users))).deleteAndCount()],
        ["allergies", () => tx.orm.public.Allergy.where(a => a.id.in(asIds(SEED_IDS.allergies))).deleteAndCount()],
        ["business", () => tx.orm.public.Business.where(b => b.id.in(asIds(SEED_IDS.business))).deleteAndCount()],
    ];

    const totals: Record<string, number> = {};
    for (const [name, run] of steps) {
        const deleted = await run();
        totals[name] = deleted;
        logger?.info({ module: name, deleted }, "seeded module cleaned");
    }
    return totals;
}
