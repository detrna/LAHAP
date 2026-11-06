import { describe, expect, it } from "vitest";
import { buildAllergy } from "../../catalog/test-utils/factory/catalog.factory.js";
import { buildUserRecord } from "../test-utils/factory/users.factory.js";
import { setupUsersService } from "../test-utils/setup/users.setup.js";

const KACANG = buildAllergy({ id: "00000000-0000-4000-8000-0000000000a1", name: "Kacang" });
const SUSU = buildAllergy({ id: "00000000-0000-4000-8000-0000000000a2", name: "Susu" });

describe("UsersService.listUsers (unit)", () => {
    it("passes the filters with a normalized phone search", async () => {
        const { repository, subscriptionHistory, service } = setupUsersService();

        await service.listUsers({ search: "0812", roles: ["KITCHEN", "COURIER"], isActive: true, skip: 20, take: 10 });

        expect(repository.list).toHaveBeenCalledWith({
            search: "0812",
            phoneSearch: "62812",
            roles: ["KITCHEN", "COURIER"],
            isActive: true,
            skip: 20,
            take: 10,
        });
        expect(subscriptionHistory.findUserIdsWithLastSuccessEndBefore).not.toHaveBeenCalled();
    });

    it("leaves the phone search out for a name", async () => {
        const { repository, service } = setupUsersService();

        await service.listUsers({ search: "Rina", skip: 0, take: 20 });

        expect(repository.list).toHaveBeenCalledWith(expect.objectContaining({ phoneSearch: undefined }));
    });

    it("filters churn with the users orders reports before today's cut-off", async () => {
        const { repository, subscriptionHistory, service } = setupUsersService();
        subscriptionHistory.findUserIdsWithLastSuccessEndBefore.mockResolvedValue(["churned-1"]);

        await service.listUsers({ isChurned: false, skip: 0, take: 20 });

        expect(subscriptionHistory.findUserIdsWithLastSuccessEndBefore).toHaveBeenCalledWith(
            Temporal.PlainDate.from("2026-10-20"),
        );
        expect(repository.list).toHaveBeenCalledWith(
            expect.objectContaining({ churned: { userIds: ["churned-1"], isChurned: false } }),
        );
        expect(repository.list.mock.calls[0]?.[0]).not.toHaveProperty("isChurned");
    });

    it("marks churned customers only, adds each user's allergies, and passes the total through", async () => {
        const { allergyLookup, repository, subscriptionHistory, service } = setupUsersService();
        const users = [
            buildUserRecord({ id: "u-churned", name: "churned", allergyIds: [SUSU.id, KACANG.id] }),
            buildUserRecord({ id: "u-recent", name: "recent" }),
            buildUserRecord({ id: "u-staff", name: "staff", role: "COURIER", allergyIds: [SUSU.id] }),
            buildUserRecord({ id: "u-new", name: "new" }),
        ];
        repository.list.mockResolvedValue({ items: users, total: 42 });
        allergyLookup.getAllergiesByIds.mockResolvedValue([KACANG, SUSU]);
        subscriptionHistory.findLastSuccessEndDates.mockResolvedValue(
            new Map([
                ["u-churned", Temporal.PlainDate.from("2026-10-01")],
                ["u-recent", Temporal.PlainDate.from("2026-11-01")],
            ]),
        );

        const page = await service.listUsers({ skip: 0, take: 20 });

        expect(page.total).toBe(42);
        expect(page.items.map(user => [user.name, user.isChurned])).toEqual([
            ["churned", true],
            ["recent", false],
            ["staff", false],
            ["new", false],
        ]);
        expect(page.items.map(user => user.allergies?.map(allergy => allergy.name))).toEqual([
            ["Kacang", "Susu"],
            [],
            ["Susu"],
            [],
        ]);
        expect(allergyLookup.getAllergiesByIds).toHaveBeenCalledTimes(1);
        expect(subscriptionHistory.findLastSuccessEndDates).toHaveBeenCalledWith(["u-churned", "u-recent", "u-new"]);
        expect(page.items[0]).not.toHaveProperty("membership");
    });
});
