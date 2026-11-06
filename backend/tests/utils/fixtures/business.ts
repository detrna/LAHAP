import type { CreatedRows } from "../../../src/infrastructure/database/prisma/cleanup.js";
import type { Db } from "../../../src/infrastructure/database/prisma/db.js";

export interface TestBusiness {
    readonly latitude: number;
    readonly longitude: number;
}

export async function ensureTestBusiness(db: Db, rows: CreatedRows): Promise<TestBusiness> {
    const [existing] = await db.orm.public.Business.select("latitude", "longitude").all();
    if (existing !== undefined) {
        return { latitude: Number(existing.latitude), longitude: Number(existing.longitude) };
    }
    const created = await db.orm.public.Business.create({
        name: "Zz E2E Original Kitchen",
        whatsappNumber: "6281200000000",
        address: "Jl. Original No. 1",
        latitude: "-7.94060000",
        longitude: "112.62190000",
        deliveryFreeRadius: "1.00",
        deliveryMaxDistance: "10.00",
        deliveryPricePerKm: "5000.00",
        paymentTimeoutMinutes: 15,
    });
    rows.track("Business", created.id);
    return { latitude: Number(created.latitude), longitude: Number(created.longitude) };
}
