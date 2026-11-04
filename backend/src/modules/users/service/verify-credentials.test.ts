import { describe, expect, it } from "vitest";
import { buildUserCredentialsRecord, buildUserRecord } from "../test-utils/factory/users.factory.js";
import { setupUsersService } from "../test-utils/setup/users.setup.js";

const credentials = (overrides: Parameters<typeof buildUserRecord>[0] = {}) =>
    buildUserCredentialsRecord({ user: buildUserRecord(overrides), passwordHash: "hashed:password123" });

describe("UsersService.verifyCredentials (unit)", () => {
    it("finds the user by phone in any accepted format and returns them on a matching password", async () => {
        const { repository, service } = setupUsersService();
        repository.findCredentialsByPhone.mockResolvedValue(credentials({ phone: "6281234567890" }));

        const user = await service.verifyCredentials("0812-3456-7890", "password123");

        expect(repository.findCredentialsByPhone).toHaveBeenCalledWith("6281234567890");
        expect(user).toMatchObject({ phone: "6281234567890", createdAt: "2026-11-03T08:00:00.000+07:00" });
    });

    it("finds the user by a trimmed, lowercased email", async () => {
        const { repository, service } = setupUsersService();
        repository.findCredentialsByEmail.mockResolvedValue(credentials({ email: "rina@lahap.test" }));

        const user = await service.verifyCredentials("  Rina@Lahap.test ", "password123");

        expect(repository.findCredentialsByEmail).toHaveBeenCalledWith("rina@lahap.test");
        expect(repository.findCredentialsByPhone).not.toHaveBeenCalled();
        expect(user).not.toBeNull();
    });

    it("returns null for a wrong password", async () => {
        const { repository, service } = setupUsersService();
        repository.findCredentialsByPhone.mockResolvedValue(credentials());

        expect(await service.verifyCredentials("081200000000", "wrong-password")).toBeNull();
    });

    it("returns null for an inactive account even with the right password", async () => {
        const { repository, service } = setupUsersService();
        repository.findCredentialsByPhone.mockResolvedValue(credentials({ isActive: false }));

        expect(await service.verifyCredentials("081200000000", "password123")).toBeNull();
    });

    it("still runs one password comparison for an unknown user, so timing does not reveal who is registered", async () => {
        const { hasher, service } = setupUsersService();

        expect(await service.verifyCredentials("081299999999", "password123")).toBeNull();
        expect(hasher.compare).toHaveBeenCalledTimes(1);
    });

    it("returns null without a lookup for an identifier that is neither a phone nor an email", async () => {
        const { repository, hasher, service } = setupUsersService();

        expect(await service.verifyCredentials("not-a-phone", "password123")).toBeNull();
        expect(repository.findCredentialsByPhone).not.toHaveBeenCalled();
        expect(repository.findCredentialsByEmail).not.toHaveBeenCalled();
        expect(hasher.compare).toHaveBeenCalledTimes(1);
    });

    it("hashes the dummy password only once across calls", async () => {
        const { hasher, service } = setupUsersService();

        await service.verifyCredentials("081299999991", "a-password");
        await service.verifyCredentials("081299999992", "a-password");

        expect(hasher.hash).toHaveBeenCalledTimes(1);
    });
});
