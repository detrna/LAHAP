import { describe, expect, it } from "vitest";
import { buildUserRecord } from "../test-utils/factory/users.factory.js";
import { setupUsersService } from "../test-utils/setup/users.setup.js";
import { UserAlreadyExistsError } from "./interfaces/users.repository.js";

function setup() {
    const context = setupUsersService();
    context.repository.create.mockImplementation(async user =>
        buildUserRecord({ name: user.name, phone: user.phone, role: user.role, isActive: user.isActive }),
    );
    return context;
}

describe("UsersService.createUser (unit)", () => {
    it("creates a user with the given role and active state", async () => {
        const { repository, service } = setup();

        const user = await service.createUser({
            phone: "6281234567890",
            password: "password123",
            role: "COURIER",
            isActive: false,
            name: " Budi ",
        });

        expect(repository.create).toHaveBeenCalledWith(
            expect.objectContaining({
                name: "Budi",
                role: "COURIER",
                isActive: false,
                passwordHash: "hashed:password123",
            }),
        );
        expect(user).toMatchObject({ role: "COURIER", isActive: false });
    });

    it("makes the user active when no state is given", async () => {
        const { repository, service } = setup();

        await service.createUser({ phone: "6281234567890", password: "password123", role: "KITCHEN" });

        expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ isActive: true }));
    });

    it("runs the same uniqueness checks as registration", async () => {
        const { repository, service } = setup();
        repository.existsByPhone.mockResolvedValue(true);

        await expect(
            service.createUser({ phone: "6281234567890", password: "password123", role: "ADMIN" }),
        ).rejects.toBeInstanceOf(UserAlreadyExistsError);
        expect(repository.create).not.toHaveBeenCalled();
    });
});
