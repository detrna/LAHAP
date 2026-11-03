import type { SeedContext } from "../../seed-context.js";
import { PACKAGES, packagePhotoKey } from "./packages.data.js";

export async function seedPackages({ tx, logger, today }: SeedContext): Promise<number> {
    const packages = Object.values(PACKAGES);

    for (const { id, ...pkg } of packages) {
        const row = {
            ...pkg,
            periods: [...pkg.periods],
            deliveryTimes: pkg.deliveryTimes.map(time => Temporal.PlainTime.from(time)),
            photoKey: packagePhotoKey(id),
            startAt: today.subtract({ days: 1 }).toPlainDateTime(),
            endAt: null,
            isActive: true,
            deliveryFreeRadius: null,
            deliveryMaxDistance: null,
            deliveryPricePerKm: null,
        };
        await tx.orm.public.Package.upsert({ create: { id, ...row }, update: row });
        logger.info(
            { id, name: pkg.name, basePrice: pkg.basePrice, periods: pkg.periods, deliveryTimes: pkg.deliveryTimes },
            "upserted package",
        );
    }
    return packages.length;
}
