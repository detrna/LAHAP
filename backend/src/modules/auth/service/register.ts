import type { AuthSession } from "../domain/auth.domain.js";
import type { AuthService } from "./auth.service.js";
import type { NewCustomer } from "./interfaces/user-accounts.js";

export async function register(this: AuthService, input: NewCustomer): Promise<AuthSession> {
    const user = await this.userAccounts.registerCustomer(input);
    return this.createSession(user);
}
