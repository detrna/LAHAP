export interface UnreadCount {
    countUnread(userId: string): Promise<number>;
}
