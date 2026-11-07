import type { ObstacleRecord } from "../../service/interfaces/delivery.repository.js";

interface ObstacleRow {
    readonly id: string;
    readonly orderId: string;
    readonly authorId: string;
    readonly note: string;
    readonly photoKey: string | null;
    readonly createdAt: Temporal.PlainDateTime;
}

export function toObstacleRecord(row: ObstacleRow): ObstacleRecord {
    return {
        id: row.id,
        orderId: row.orderId,
        authorId: row.authorId,
        note: row.note,
        photoKey: row.photoKey,
        createdAt: row.createdAt,
    };
}
