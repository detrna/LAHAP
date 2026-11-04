import type { User } from "../../../users/domain/user.domain.js";

export interface NewCustomer {
    readonly phone: string;
    readonly password: string;
    readonly name?: string | undefined;
    readonly email?: string | undefined;
    readonly address?: string | undefined;
    readonly latitude?: number | undefined;
    readonly longitude?: number | undefined;
    readonly allergyIds?: readonly string[] | undefined;
    readonly allergyNote?: string | undefined;
}

export interface UserAccounts {
    registerCustomer(input: NewCustomer): Promise<User>;
    verifyCredentials(identifier: string, password: string): Promise<User | null>;
    getActiveById(id: string): Promise<User | null>;
}
