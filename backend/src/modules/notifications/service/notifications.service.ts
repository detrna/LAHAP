import type { NotificationsRepository } from "./interfaces/notifications.repository.js";

export class NotificationsService {
    constructor(readonly notificationsRepository: NotificationsRepository) {}
}
