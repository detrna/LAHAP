export interface OrderNotification {
    readonly userId: string;
    readonly title: string;
    readonly body: string;
}

export interface AdminNotification {
    readonly title: string;
    readonly body: string;
}

export interface OrderNotifier {
    notifyUser(notification: OrderNotification): Promise<unknown>;
    notifyAdmins(notification: AdminNotification): Promise<unknown>;
}
