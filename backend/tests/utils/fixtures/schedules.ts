import { randomUUID } from "node:crypto";
import type { CreatedRows } from "../../../src/infrastructure/database/prisma/cleanup.js";
import type { Db } from "../../../src/infrastructure/database/prisma/db.js";

export interface TestRecipeLine {
    readonly ingredientId: string;
    readonly quantityPerPortion: number;
}

export interface TestMenuComponentLine {
    readonly name: string;
    readonly cookId?: string | null | undefined;
}

export interface TestMenuInput {
    readonly name?: string | undefined;
    readonly tags?: readonly string[] | undefined;
    readonly isAlternative?: boolean | undefined;
    readonly ingredients?: readonly TestRecipeLine[] | undefined;
    readonly components?: readonly TestMenuComponentLine[] | undefined;
}

export async function createTestMenu(db: Db, rows: CreatedRows, input: TestMenuInput = {}): Promise<string> {
    const menu = await db.orm.public.Menu.create({
        name: input.name ?? `Zz Test Menu ${randomUUID().slice(0, 8)}`,
        description: "test menu",
        isAlternative: input.isAlternative ?? false,
        tags: [...(input.tags ?? [])],
        photoKey: "menus/test.webp",
    });
    const menuId = rows.track("Menu", menu.id);
    for (const line of input.ingredients ?? []) {
        const link = await db.orm.public.MenuIngredient.create({
            menuId,
            ingredientId: line.ingredientId,
            quantityPerPortion: line.quantityPerPortion.toFixed(2),
        });
        rows.track("MenuIngredient", link.id);
    }
    for (const component of input.components ?? []) {
        const created = await db.orm.public.MenuComponent.create({
            menuId,
            name: component.name,
            cookId: component.cookId ?? null,
        });
        rows.track("MenuComponent", created.id);
    }
    return menuId;
}

export interface TestScheduleInput {
    readonly packageId: string;
    readonly date: Temporal.PlainDate | string;
    readonly deliveryTime?: Temporal.PlainTime | string | undefined;
    readonly isPublished?: boolean | undefined;
    readonly primaryMenuId?: string | undefined;
    readonly alternativeMenuId?: string | undefined;
}

export async function createTestSchedule(db: Db, rows: CreatedRows, input: TestScheduleInput): Promise<string> {
    const schedule = await db.orm.public.Schedule.create({
        packageId: input.packageId,
        date: Temporal.PlainDate.from(input.date),
        deliveryTime: Temporal.PlainTime.from(input.deliveryTime ?? "07:00"),
        isPublished: input.isPublished ?? false,
    });
    const scheduleId = rows.track("Schedule", schedule.id);
    const links = [
        { menuId: input.primaryMenuId, isPrimary: true },
        { menuId: input.alternativeMenuId, isPrimary: false },
    ];
    for (const { menuId, isPrimary } of links) {
        if (menuId === undefined) continue;
        const link = await db.orm.public.ScheduleMenu.create({ scheduleId, menuId, isPrimary });
        rows.track("ScheduleMenu", link.id);
    }
    return scheduleId;
}
