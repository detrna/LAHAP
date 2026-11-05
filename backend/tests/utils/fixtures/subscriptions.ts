import { randomUUID } from "node:crypto";
import type { CreatedRows } from "../../../src/infrastructure/database/prisma/cleanup.js";
import type { Db } from "../../../src/infrastructure/database/prisma/db.js";

export async function createTestPackage(db: Db, rows: CreatedRows): Promise<string> {
    const created = await db.orm.public.Package.create({
        name: `Zz Test Package ${randomUUID().slice(0, 8)}`,
        description: "test package",
        basePrice: "15000.00",
        periods: ["Harian"],
        deliveryTimes: [Temporal.PlainTime.from("07:00")],
        photoKey: "packages/test.webp",
    });
    return rows.track("Package", created.id);
}

export interface TestSubscriptionInput {
    readonly userId: string;
    readonly packageId: string;
    readonly status: "Pending" | "Success" | "Expire" | "Dibatalkan";
    readonly startDate: Temporal.PlainDate;
    readonly endDate: Temporal.PlainDate;
}

export async function createTestSubscription(db: Db, rows: CreatedRows, input: TestSubscriptionInput): Promise<string> {
    const created = await db.orm.public.Subscription.create({
        userId: input.userId,
        packageId: input.packageId,
        status: input.status,
        purchaseType: "Online",
        period: "Harian",
        startDate: input.startDate,
        endDate: input.endDate,
        isDelivery: false,
        recipientName: "Test Recipient",
        pricePerPortion: "15000.00",
        foodSubtotal: "15000.00",
        totalPrice: "15000.00",
    });
    return rows.track("Subscription", created.id);
}
