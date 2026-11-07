export interface ObstacleNotification {
    readonly userId: string;
    readonly title: string;
    readonly body: string;
}

export interface ObstacleNotifier {
    notifyUser(notification: ObstacleNotification): Promise<unknown>;
}
