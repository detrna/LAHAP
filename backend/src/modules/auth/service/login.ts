import { InvalidCredentialsError } from "../domain/errors.js";
import type { AuthSession } from "../domain/auth.domain.js";
import type { AuthService } from "./auth.service.js";

export interface LoginInput {
    readonly identifier: string;
    readonly password: string;
}

export async function login(this: AuthService, input: LoginInput): Promise<AuthSession> {
    const user = await this.userAccounts.verifyCredentials(input.identifier, input.password);
    if (user === null) {
        throw new InvalidCredentialsError();
    }
    return this.createSession(user);
}
