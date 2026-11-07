export interface AdminNotification {
    readonly title: string;
    readonly body: string;
}

export interface AdminNotifier {
    notifyAdmins(notification: AdminNotification): Promise<unknown>;
}

export const noAdminNotifier: AdminNotifier = {
    notifyAdmins: async () => undefined,
};
