export interface SessionRevoker {
    revokeSessionsOfUser(userId: string): Promise<void>;
}
