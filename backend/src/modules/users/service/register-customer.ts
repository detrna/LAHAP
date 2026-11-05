import type { User } from "../domain/user.domain.js";
import type { CreateUserInput } from "./create-user.js";
import type { UsersService } from "./users.service.js";

export type RegisterCustomerInput = Omit<CreateUserInput, "role" | "isActive">;

export async function registerCustomer(this: UsersService, input: RegisterCustomerInput): Promise<User> {
    return this.createUser({ ...input, role: "CUSTOMER", isActive: true });
}
