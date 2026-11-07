export * from "../../domain/errors.js";

export interface ObstacleRecord {
    readonly id: string;
    readonly orderId: string;
    readonly authorId: string;
    readonly note: string;
    readonly photoKey: string | null;
    readonly createdAt: Temporal.PlainDateTime;
}

export interface NewObstacleRecord {
    readonly orderId: string;
    readonly authorId: string;
    readonly note: string;
    readonly photoKey: string | null;
}

export interface DeliveryRepository {
    listObstacles(orderIds: readonly string[]): Promise<readonly ObstacleRecord[]>;
    createObstacle(record: NewObstacleRecord): Promise<ObstacleRecord>;
}
