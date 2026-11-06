import { describe, expect, it } from "vitest";
import { buildUserRecord } from "../test-utils/factory/users.factory.js";
import { setupUsersService } from "../test-utils/setup/users.setup.js";
import { UnknownAllergyError, UserAlreadyExistsError } from "./interfaces/users.repository.js";

const ALLERGY_A = "00000002-0000-4000-8000-000000000001";
const ALLERGY_B = "00000002-0000-4000-8000-000000000002";

function setup() {
    const context = setupUsersService();
    context.repository.create.mockImplementation(async user => buildUserRecord({ name: user.name, phone: user.phone }));
    return context;
}

describe("UsersService.registerCustomer (unit)", () => {
    it("creates a CUSTOMER with a hashed password and the phone as the default name", async () => {
        const { repository, hasher, service } = setup();

        const user = await service.registerCustomer({ phone: "6281234567890", password: "password123" });

        expect(hasher.hash).toHaveBeenCalledWith("password123");
        expect(repository.create).toHaveBeenCalledWith({
            name: "6281234567890",
            email: null,
            phone: "6281234567890",
            passwordHash: "hashed:password123",
            role: "CUSTOMER",
            address: null,
            latitude: null,
            longitude: null,
            allergyNote: null,
            isActive: true,
            allergyIds: [],
        });
        expect(user).toMatchObject({ name: "6281234567890", phone: "6281234567890", role: "CUSTOMER" });
    });

    it("trims the name, lowercases the email and stores blank optional text as null", async () => {
        const { repository, service } = setup();

        await service.registerCustomer({
            phone: "6281234567890",
            password: "password123",
            name: "  Rina Putri ",
            email: " Rina@Lahap.TEST ",
            address: "  ",
            allergyNote: "",
            latitude: -7.9393,
            longitude: 112.6094,
        });

        expect(repository.create).toHaveBeenCalledWith(
            expect.objectContaining({
                name: "Rina Putri",
                email: "rina@lahap.test",
                address: null,
                allergyNote: null,
                latitude: -7.9393,
                longitude: 112.6094,
            }),
        );
        expect(repository.existsByEmail).toHaveBeenCalledWith("rina@lahap.test");
    });

    it("falls back to the phone when the name is blank", async () => {
        const { repository, service } = setup();

        await service.registerCustomer({ phone: "6281234567890", password: "password123", name: "   " });

        expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ name: "6281234567890" }));
    });

    it("stores each allergy once", async () => {
        const { allergyLookup, repository, service } = setup();

        await service.registerCustomer({
            phone: "6281234567890",
            password: "password123",
            allergyIds: [ALLERGY_A, ALLERGY_B, ALLERGY_A],
        });

        expect(allergyLookup.findMissingAllergyIds).toHaveBeenCalledWith([ALLERGY_A, ALLERGY_B]);
        expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ allergyIds: [ALLERGY_A, ALLERGY_B] }));
    });

    it("rejects a phone that is already registered without hashing or creating", async () => {
        const { repository, hasher, service } = setup();
        repository.existsByPhone.mockResolvedValue(true);

        const attempt = service.registerCustomer({ phone: "6281234567890", password: "password123" });

        await expect(attempt).rejects.toBeInstanceOf(UserAlreadyExistsError);
        await expect(attempt).rejects.toMatchObject({ field: "phone", statusCode: 409, code: "CONFLICT" });
        expect(hasher.hash).not.toHaveBeenCalled();
        expect(repository.create).not.toHaveBeenCalled();
    });

    it("rejects an email that is already registered", async () => {
        const { repository, service } = setup();
        repository.existsByEmail.mockResolvedValue(true);

        await expect(
            service.registerCustomer({ phone: "6281234567890", password: "password123", email: "rina@lahap.test" }),
        ).rejects.toMatchObject({ field: "email" });
        expect(repository.create).not.toHaveBeenCalled();
    });

    it("does not look up the email when none is given", async () => {
        const { repository, service } = setup();

        await service.registerCustomer({ phone: "6281234567890", password: "password123", email: "  " });

        expect(repository.existsByEmail).not.toHaveBeenCalled();
        expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ email: null }));
    });

    it("rejects unknown allergies with their ids", async () => {
        const { allergyLookup, repository, service } = setup();
        allergyLookup.findMissingAllergyIds.mockResolvedValue([ALLERGY_B]);

        const attempt = service.registerCustomer({
            phone: "6281234567890",
            password: "password123",
            allergyIds: [ALLERGY_A, ALLERGY_B],
        });

        await expect(attempt).rejects.toBeInstanceOf(UnknownAllergyError);
        await expect(attempt).rejects.toMatchObject({ allergyIds: [ALLERGY_B], statusCode: 400 });
        expect(repository.create).not.toHaveBeenCalled();
    });

    it("skips the allergy lookup when there are none", async () => {
        const { allergyLookup, service } = setup();

        await service.registerCustomer({ phone: "6281234567890", password: "password123" });

        expect(allergyLookup.findMissingAllergyIds).not.toHaveBeenCalled();
    });

    it("passes on a conflict the repository detects (two sign-ups racing)", async () => {
        const { repository, service } = setup();
        repository.create.mockRejectedValue(new UserAlreadyExistsError("phone"));

        await expect(
            service.registerCustomer({ phone: "6281234567890", password: "password123" }),
        ).rejects.toMatchObject({ field: "phone" });
    });
});
