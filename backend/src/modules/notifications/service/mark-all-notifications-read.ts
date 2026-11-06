import type { BulkUpdateResult } from "../../../shared/response/batch-result.js";
import type { NotificationsService } from "./notifications.service.js";

export async function markAllNotificationsRead(this: NotificationsService, userId: string): Promise<BulkUpdateResult> {
    return { updatedCount: await this.notificationsRepository.markAllNotificationsRead(userId) };
}
