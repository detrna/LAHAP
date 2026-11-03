import type { NotificationsService } from "../service/notifications.service.js";

export class NotificationsController {
    constructor(readonly notificationsService: NotificationsService) {}
}
