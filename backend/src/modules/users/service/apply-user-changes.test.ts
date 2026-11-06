import { describe, expect, it } from "vitest";
import { buildUserRecord } from "../test-utils/factory/users.factory.js";
import { setupUsersService } from "../test-utils/setup/users.setup.js";
import { UnknownAllergyError } from "../../../shared/errors/unknown-allergy-error.js";
import { UserAlreadyExistsError, UserNotFoundError } from "./interfaces/users.repository.js";

const USER_ID = buildUserRecord().id;
const ALLERGY_A = "00000002-0000-4000-8000-000000000001";

function setup(current = buildUserRecord()) {
    const context = setupUsersService();
    context.repository.findById.mockResolvedValue(current);
    context.repository.update.mockImplementation(async () => current);
    return context;
}

describe("UsersService.applyUserChanges (unit)", () => {
    it("writes only the fields that were sent", async () => {
        const { repository, service } = setup();

        await service.applyUserChanges(USER_ID, { name: "Rina", phone: "6281299990000" });

        expect(repository.update).toHaveBeenCalledWith(
            USER_ID,
            { name: "Rina", phone: "6281299990000" },
            { ensureActiveAdminRemains: false },
        );
    });

    it("lowercases the email, removes it with null and stores blank text as null", async () => {
        const { repository, service } = setup();

        await service.applyUserChanges(USER_ID, { email: " Rina@Lahap.TEST ", address: "  ", allergyNote: null });
        await service.applyUserChanges(USER_ID, { email: null });

        expect(repository.update).toHaveBeenNthCalledWith(
            1,
            USER_ID,
            { email: "rina@lahap.test", address: null, allergyNote: null },
            expect.anything(),
        );
        expect(repository.update).toHaveBeenNthCalledWith(2, USER_ID, { email: null }, expect.anything());
        expect(repository.findConflict).toHaveBeenNthCalledWith(1, { exceptId: USER_ID, email: "rina@lahap.test" });
        expect(repository.findConflict).toHaveBeenNthCalledWith(2, { exceptId: USER_ID });
    });

    it("clears both coordinates together", async () => {
        const { repository, service } = setup();

        await service.applyUserChanges(USER_ID, { latitude: null, longitude: null });

        expect(repository.update).toHaveBeenCalledWith(USER_ID, { latitude: null, longitude: null }, expect.anything());
    });

    it("replaces the allergy set only when allergyIds is sent", async () => {
        const { allergyLookup, repository, service } = setup();

        await service.applyUserChanges(USER_ID, { allergyIds: [ALLERGY_A] });
        await service.applyUserChanges(USER_ID, { allergyIds: [] });
        await service.applyUserChanges(USER_ID, { name: "Rina" });

        expect(repository.update.mock.calls.map(call => call[2])).toEqual([
            { allergyIds: [ALLERGY_A], ensureActiveAdminRemains: false },
            { allergyIds: [], ensureActiveAdminRemains: false },
            { ensureActiveAdminRemains: false },
        ]);
        expect(allergyLookup.findMissingAllergyIds).toHaveBeenCalledTimes(1);
    });

    it("hashes a new password", async () => {
        const { repository, service } = setup();

        await service.applyUserChanges(USER_ID, { password: "new-password" });

        expect(repository.update).toHaveBeenCalledWith(
            USER_ID,
            { passwordHash: "hashed:new-password" },
            expect.anything(),
        );
    });

    it("rejects a phone or email another user holds, checking against other users only", async () => {
        const { repository, service } = setup();
        repository.findConflict.mockResolvedValue("phone");

        await expect(service.applyUserChanges(USER_ID, { phone: "6281299990000" })).rejects.toMatchObject({
            constructor: UserAlreadyExistsError,
            field: "phone",
        });
        expect(repository.findConflict).toHaveBeenCalledWith({ exceptId: USER_ID, phone: "6281299990000" });
        expect(repository.update).not.toHaveBeenCalled();
    });

    it("rejects unknown allergies", async () => {
        const { allergyLookup, repository, service } = setup();
        allergyLookup.findMissingAllergyIds.mockResolvedValue([ALLERGY_A]);

        await expect(service.applyUserChanges(USER_ID, { allergyIds: [ALLERGY_A] })).rejects.toBeInstanceOf(
            UnknownAllergyError,
        );
        expect(repository.update).not.toHaveBeenCalled();
    });

    it("asks the repository to keep an active admin when an active admin is demoted or deactivated", async () => {
        const { repository, service } = setup(buildUserRecord({ role: "ADMIN" }));

        await service.applyUserChanges(USER_ID, { role: "KITCHEN" });
        await service.applyUserChanges(USER_ID, { isActive: false });
        await service.applyUserChanges(USER_ID, { name: "Owner" });

        expect(repository.update.mock.calls.map(call => call[2]?.ensureActiveAdminRemains)).toEqual([
            true,
            true,
            false,
        ]);
    });

    it("gives 404 for an unknown user, and when the user disappears before the write", async () => {
        const { repository, service } = setup();
        repository.findById.mockResolvedValueOnce(null);
        repository.update.mockResolvedValueOnce(null);

        await expect(service.applyUserChanges(USER_ID, { name: "Rina" })).rejects.toBeInstanceOf(UserNotFoundError);
        await expect(service.applyUserChanges(USER_ID, { name: "Rina" })).rejects.toBeInstanceOf(UserNotFoundError);
    });
});
