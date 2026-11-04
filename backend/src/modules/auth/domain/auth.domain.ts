import type { User } from "../../users/domain/user.domain.js";

export interface AuthSession {
    readonly accessToken: string;
    readonly refreshToken: string;
    readonly tokenType: "Bearer";
    readonly expiresIn: number;
    readonly refreshExpiresIn: number;
    readonly user: User;
}
