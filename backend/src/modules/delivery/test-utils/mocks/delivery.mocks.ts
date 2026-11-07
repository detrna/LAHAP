import { vi } from "vitest";
import type { ObjectStorage } from "../../../../shared/ports/object-storage/object-storage.js";
import type { DeliveryService } from "../../service/delivery.service.js";
import type { CourierSlots } from "../../service/interfaces/courier-slots.js";
import type { DeliveryCatalog } from "../../service/interfaces/delivery-catalog.js";
import type { DeliveryRepository } from "../../service/interfaces/delivery.repository.js";
import type { ObstacleNotifier } from "../../service/interfaces/obstacle-notifier.js";
import type { PhotoKeys } from "../../service/interfaces/photo-keys.js";
import type { RealtimePublisher } from "../../service/interfaces/realtime-publisher.js";
import type { UserDirectory } from "../../service/interfaces/user-directory.js";

export type Mocked<T> = { [K in keyof T]: T[K] & ReturnType<typeof vi.fn> };

export type MockedDeliveryService = Mocked<
    Pick<DeliveryService, "listMyDeliveries" | "reportObstacle" | "findObstaclesByOrderIds">
>;

export type MockedObjectStorage = Mocked<Pick<ObjectStorage, "getSignedUrl">>;

export function createMockDeliveryRepository(): Mocked<DeliveryRepository> {
    return {
        listObstacles: vi.fn(async () => []),
        createObstacle: vi.fn(),
    } as Mocked<DeliveryRepository>;
}

export function createMockDeliveryCatalog(): Mocked<DeliveryCatalog> {
    return {
        findSchedules: vi.fn(async () => []),
        getMenusByIds: vi.fn(async () => []),
        getPackagesByIds: vi.fn(async () => []),
    } as Mocked<DeliveryCatalog>;
}

export function createMockCourierSlots(): Mocked<CourierSlots> {
    return {
        listCourierSlots: vi.fn(async () => []),
        getSlotForObstacle: vi.fn(async () => null),
    } as Mocked<CourierSlots>;
}

export function createMockUserDirectory(): Mocked<UserDirectory> {
    return { getSummaries: vi.fn(async () => []) } as Mocked<UserDirectory>;
}

export function createMockObstacleNotifier(): Mocked<ObstacleNotifier> {
    return { notifyUser: vi.fn(async () => undefined) } as Mocked<ObstacleNotifier>;
}

export function createMockRealtimePublisher(): Mocked<RealtimePublisher> {
    return { publish: vi.fn(async () => undefined) } as Mocked<RealtimePublisher>;
}

export function createMockPhotoKeys(): Mocked<PhotoKeys> {
    return { assertPhotoKeyExists: vi.fn(async () => undefined) } as Mocked<PhotoKeys>;
}

export function createMockObjectStorage(): MockedObjectStorage {
    return {
        getSignedUrl: vi.fn(async (key: string) => `https://storage.test/${key}?signed`),
    } as MockedObjectStorage;
}

export function createMockDeliveryService(): MockedDeliveryService {
    return {
        listMyDeliveries: vi.fn(async () => []),
        reportObstacle: vi.fn(),
        findObstaclesByOrderIds: vi.fn(async () => []),
    } as MockedDeliveryService;
}
