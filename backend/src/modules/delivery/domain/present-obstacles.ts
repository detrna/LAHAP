import { toIsoTimestamp } from "../../../shared/time/timestamp.js";
import type { UserSummary } from "../../users/domain/user.domain.js";
import type { ObstacleRecord } from "../service/interfaces/delivery.repository.js";
import type { DeliveryObstacle } from "./delivery-obstacle.domain.js";

export function presentObstacles(
    records: readonly ObstacleRecord[],
    authors: ReadonlyMap<string, UserSummary>,
    photoUrls: readonly (string | null)[],
): DeliveryObstacle[] {
    return records.map((record, index) => {
        const author = authors.get(record.authorId);
        return {
            id: record.id,
            orderId: record.orderId,
            authorId: record.authorId,
            ...(author !== undefined ? { author } : {}),
            note: record.note,
            photoKey: record.photoKey,
            photoUrl: photoUrls[index] ?? null,
            createdAt: toIsoTimestamp(record.createdAt),
        };
    });
}
