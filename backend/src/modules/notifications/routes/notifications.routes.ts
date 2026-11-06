import { Router } from "express";
import {
    authenticate,
    authorize,
    paginate,
    validateBody,
    validateParams,
    validateQuery,
    validateRequest,
} from "../../../http/middleware/index.js";
import type { TokenProvider } from "../../../shared/ports/token-provider/token-provider.js";
import type { NotificationsController } from "../controller/notifications.controller.js";
import {
    announcementIdParamsSchema,
    announcementListQuerySchema,
    announcementUpdateSchema,
    broadcastSchema,
    myAnnouncementListQuerySchema,
    notificationIdParamsSchema,
    notificationListQuerySchema,
} from "../schema/notifications.schemas.js";

export interface NotificationsRouterDeps {
    readonly controller: NotificationsController;
    readonly tokenProvider: TokenProvider;
}

export function createNotificationsRouter({ controller, tokenProvider }: NotificationsRouterDeps): Router {
    const router = Router();
    const signedIn = authenticate({ tokenProvider });
    const admin = authorize("ADMIN");

    router.get(
        "/me/notifications",
        signedIn,
        validateQuery(notificationListQuerySchema),
        paginate(),
        controller.listMyNotifications,
    );
    router.post("/me/notifications/read-all", signedIn, controller.markAllNotificationsRead);
    router.post(
        "/me/notifications/:id/read",
        signedIn,
        validateParams(notificationIdParamsSchema),
        controller.markNotificationRead,
    );
    router.get(
        "/me/announcements",
        signedIn,
        authorize("CUSTOMER"),
        validateQuery(myAnnouncementListQuerySchema),
        paginate(),
        controller.listMyAnnouncements,
    );

    router.post(
        "/admin/notifications/broadcast",
        signedIn,
        admin,
        validateBody(broadcastSchema),
        controller.broadcastNotification,
    );
    router.get(
        "/admin/announcements",
        signedIn,
        admin,
        validateQuery(announcementListQuerySchema),
        paginate(),
        controller.listAnnouncements,
    );
    router.get(
        "/admin/announcements/:id",
        signedIn,
        admin,
        validateParams(announcementIdParamsSchema),
        controller.getAnnouncement,
    );
    router.patch(
        "/admin/announcements/:id",
        signedIn,
        admin,
        validateRequest({ params: announcementIdParamsSchema, body: announcementUpdateSchema }),
        controller.updateAnnouncement,
    );
    router.delete(
        "/admin/announcements/:id",
        signedIn,
        admin,
        validateParams(announcementIdParamsSchema),
        controller.deleteAnnouncement,
    );

    return router;
}
