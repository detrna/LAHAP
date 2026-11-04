import { buildMenu } from "../../../catalog/test-utils/factory/catalog.factory.js";
import type { CourierDelivery } from "../../domain/courier-delivery.domain.js";
import type { DeliveryObstacle } from "../../domain/delivery-obstacle.domain.js";

export function buildDeliveryObstacle(overrides: Partial<DeliveryObstacle> = {}): DeliveryObstacle {
    return {
        id: "00000000-0000-4000-8000-000000000001",
        orderId: "00000000-0000-4000-8000-000000000001",
        authorId: "00000000-0000-4000-8000-000000000001",
        note: "Hujan deras, pengantaran terlambat ±20 menit",
        photoKey: null,
        photoUrl: null,
        createdAt: "2026-11-03T00:00:00.000+07:00",
        ...overrides,
    };
}

export function buildCourierDelivery(overrides: Partial<CourierDelivery> = {}): CourierDelivery {
    return {
        orderId: "00000000-0000-4000-8000-000000000001",
        status: "Terjadwal",
        date: "2026-11-03",
        deliveryTime: { time: "07:00", range: "Pagi" },
        recipientName: "test recipientName",
        phone: "6281200000000",
        deliveryAddress: "test deliveryAddress",
        deliveryLatitude: -90,
        deliveryLongitude: -180,
        packageName: "test packageName",
        menu: buildMenu(),
        usesAlternativeMenu: false,
        notes: null,
        isReadyForPickup: false,
        obstacles: [],
        ...overrides,
    };
}
