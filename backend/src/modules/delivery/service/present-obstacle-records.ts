import { toPhotoUrls } from "../../../shared/media/photo.js";
import type { DeliveryObstacle } from "../domain/delivery-obstacle.domain.js";
import { presentObstacles } from "../domain/present-obstacles.js";
import type { DeliveryService } from "./delivery.service.js";
import type { ObstacleRecord } from "./interfaces/delivery.repository.js";

export async function presentObstacleRecords(
    this: DeliveryService,
    records: readonly ObstacleRecord[],
): Promise<DeliveryObstacle[]> {
    if (records.length === 0) return [];
    const [authors, photoUrls] = await Promise.all([
        this.users.getSummaries([...new Set(records.map(record => record.authorId))]),
        toPhotoUrls(
            this.objectStorage,
            records.map(record => record.photoKey),
        ),
    ]);
    return presentObstacles(records, new Map(authors.map(author => [author.id, author])), photoUrls);
}
