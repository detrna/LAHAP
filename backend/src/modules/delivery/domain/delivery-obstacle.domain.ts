import type { UserSummary } from "../../users/domain/user.domain.js";

export interface DeliveryObstacle {
    readonly id: string;
    readonly orderId: string;
    readonly authorId: string;
    readonly author?: UserSummary | undefined;
    readonly note: string;
    readonly photoKey: string | null;
    readonly photoUrl: string | null;
    readonly createdAt: string;
}
