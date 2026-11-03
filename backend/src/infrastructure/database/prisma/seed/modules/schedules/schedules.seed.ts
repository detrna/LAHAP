import { MENUS } from "../menus/menus.data.js";
import { PACKAGES, type PackageKey } from "../packages/packages.data.js";
import type { SeedContext } from "../../seed-context.js";
import { ALTERNATIVES_BY_MEAL, DRAFT_DAYS, PUBLISHED_DAYS, WEEKLY_PLANS } from "./schedules.data.js";

export async function seedSchedules({ tx, logger, today }: SeedContext): Promise<number> {
    let count = 0;

    for (const [key, pkg] of Object.entries(PACKAGES) as [PackageKey, (typeof PACKAGES)[PackageKey]][]) {
        let packageCount = 0;
        for (let day = 0; day < PUBLISHED_DAYS + DRAFT_DAYS; day++) {
            const date = today.add({ days: day });
            const dayPlan = WEEKLY_PLANS[key][date.dayOfWeek - 1]!;

            for (const [meal, time] of pkg.deliveryTimes.entries()) {
                const deliveryTime = Temporal.PlainTime.from(time);
                const isPublished = day < PUBLISHED_DAYS;
                const schedule = await tx.orm.public.Schedule.upsert({
                    create: { packageId: pkg.id, date, deliveryTime, isPublished },
                    update: { isPublished },
                    conflictOn: { packageId: pkg.id, date, deliveryTime },
                });

                await tx.orm.public.ScheduleMenu.where({ scheduleId: schedule.id }).deleteAll();
                await tx.orm.public.ScheduleMenu.createAll([
                    { scheduleId: schedule.id, menuId: MENUS[dayPlan[meal]!].id, isPrimary: true },
                    { scheduleId: schedule.id, menuId: MENUS[ALTERNATIVES_BY_MEAL[meal]!].id, isPrimary: false },
                ]);
                packageCount++;
            }
        }
        count += packageCount;
        logger.info(
            {
                package: pkg.name,
                schedules: packageCount,
                from: today.toString(),
                publishedUntil: today.add({ days: PUBLISHED_DAYS - 1 }).toString(),
                draftUntil: today.add({ days: PUBLISHED_DAYS + DRAFT_DAYS - 1 }).toString(),
            },
            "upserted schedules with primary and alternative menus",
        );
    }
    return count;
}
