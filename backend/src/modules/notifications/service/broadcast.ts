import type { BroadcastResult } from "../domain/notification.domain.js";
import { AnnouncementTargetNotFoundError } from "./interfaces/notifications.repository.js";
import type { NotificationsService } from "./notifications.service.js";

interface BroadcastText {
    readonly title: string;
    readonly body: string;
}

export type BroadcastInput =
    | (BroadcastText & { readonly target: "GLOBAL" })
    | (BroadcastText & { readonly target: "PACKAGE"; readonly packageId: string })
    | (BroadcastText & { readonly target: "SCHEDULE"; readonly menuScheduleId: string })
    | (BroadcastText & { readonly target: "CUSTOMER"; readonly userId: string });

export async function broadcast(this: NotificationsService, input: BroadcastInput): Promise<BroadcastResult> {
    const { title, body } = input;

    if (input.target === "CUSTOMER") {
        const [customerId] = await this.recipients.filterActiveUserIds([input.userId], "CUSTOMER");
        if (customerId === undefined) throw new AnnouncementTargetNotFoundError("customer", input.userId);
        const notification = await this.notifyUser({ userId: customerId, title, body });
        return { announcement: null, notification, recipientCount: 1 };
    }

    if (input.target === "PACKAGE") {
        await this.assertTargetsExist({ packageId: input.packageId });
        const { announcement, recipientCount } = await this.announce({
            scope: "PACKAGE",
            packageId: input.packageId,
            title,
            body,
        });
        return { announcement, notification: null, recipientCount };
    }

    if (input.target === "SCHEDULE") {
        await this.assertTargetsExist({ menuScheduleId: input.menuScheduleId });
        const { announcement, recipientCount } = await this.announce({
            scope: "SCHEDULE",
            menuScheduleId: input.menuScheduleId,
            title,
            body,
        });
        return { announcement, notification: null, recipientCount };
    }

    const { announcement, recipientCount } = await this.announce({ scope: "GLOBAL", title, body });
    return { announcement, notification: null, recipientCount };
}
