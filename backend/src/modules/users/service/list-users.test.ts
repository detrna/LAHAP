import { describe, expect, it } from "vitest";
import { buildUserRecord } from "../test-utils/factory/users.factory.js";
import { setupUsersService } from "../test-utils/setup/users.setup.js";

describe("UsersService.listUsers (unit)", () => {
    it("passes the filters with today's churn cut-off and a normalized phone search", async () => {
        const { repository, service } = setupUsersService();

        await service.listUsers({ search: "0812", roles: ["KITCHEN", "COURIER"], isChurned: true, skip: 20, take: 10 });

        expect(repository.list).toHaveBeenCalledWith({
            search: "0812",
            phoneSearch: "62812",
            roles: ["KITCHEN", "COURIER"],
            isChurned: true,
            churnCutoff: Temporal.PlainDate.from("2026-10-20"),
            skip: 20,
            take: 10,
        });
    });

    it("leaves the phone search out for a name", async () => {
        const { repository, service } = setupUsersService();

        await service.listUsers({ search: "Rina", skip: 0, take: 20 });

        expect(repository.list).toHaveBeenCalledWith(expect.objectContaining({ phoneSearch: undefined }));
    });

    it("marks churned customers only and passes the total through", async () => {
        const { repository, service } = setupUsersService();
        const longAgo = Temporal.PlainDate.from("2026-10-01");
        repository.list.mockResolvedValue({
            items: [
                { user: buildUserRecord({ name: "churned" }), lastSuccessEndDate: longAgo },
                {
                    user: buildUserRecord({ name: "recent" }),
                    lastSuccessEndDate: Temporal.PlainDate.from("2026-11-01"),
                },
                { user: buildUserRecord({ name: "staff", role: "COURIER" }), lastSuccessEndDate: longAgo },
                { user: buildUserRecord({ name: "new" }), lastSuccessEndDate: null },
            ],
            total: 42,
        });

        const page = await service.listUsers({ skip: 0, take: 20 });

        expect(page.total).toBe(42);
        expect(page.items.map(user => [user.name, user.isChurned])).toEqual([
            ["churned", true],
            ["recent", false],
            ["staff", false],
            ["new", false],
        ]);
        expect(page.items[0]).not.toHaveProperty("membership");
    });
});
