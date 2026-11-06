import { describe, expect, it } from "vitest";
import { ValidationError } from "../../../../shared/errors/validation-error.js";
import { buildPackageRecord } from "../../test-utils/factory/catalog.factory.js";
import { setupCatalogService } from "../../test-utils/setup/catalog.setup.js";
import type { CreatePackageInput } from "./create-package.js";

const time = (value: string) => Temporal.PlainTime.from(value);

const input = (overrides: Partial<CreatePackageInput> = {}): CreatePackageInput => ({
    name: "Diet Sehat",
    description: "test description",
    basePrice: 20000,
    periods: ["Harian"],
    deliveryTimes: [time("18:30"), time("07:00")],
    photoKey: "packages/2026/11/3f2b6c1e.webp",
    ...overrides,
});

describe("CatalogService.createPackage (unit)", () => {
    it("stores sorted meal times, now as the default start, and the defaults for the rest", async () => {
        const { repository, service } = setupCatalogService();
        repository.createPackage.mockResolvedValue(buildPackageRecord());

        await service.createPackage(input());

        expect(repository.createPackage).toHaveBeenCalledWith({
            name: "Diet Sehat",
            description: "test description",
            basePrice: 20000,
            periods: ["Harian"],
            deliveryTimes: [time("07:00"), time("18:30")],
            deliveryFreeRadius: null,
            deliveryMaxDistance: null,
            deliveryPricePerKm: null,
            photoKey: "packages/2026/11/3f2b6c1e.webp",
            startAt: Temporal.PlainDateTime.from("2026-11-03T01:00:00"),
            endAt: null,
            isActive: true,
        });
    });

    it("keeps the given overrides, window and switch", async () => {
        const { repository, service } = setupCatalogService();
        repository.createPackage.mockResolvedValue(buildPackageRecord());
        const startAt = Temporal.PlainDateTime.from("2026-11-10T00:00:00");
        const endAt = Temporal.PlainDateTime.from("2026-12-10T00:00:00");

        await service.createPackage(
            input({
                deliveryFreeRadius: 3,
                deliveryMaxDistance: 10,
                deliveryPricePerKm: 2500,
                startAt,
                endAt,
                isActive: false,
            }),
        );

        expect(repository.createPackage).toHaveBeenCalledWith(
            expect.objectContaining({
                deliveryFreeRadius: 3,
                deliveryMaxDistance: 10,
                deliveryPricePerKm: 2500,
                startAt,
                endAt,
                isActive: false,
            }),
        );
    });

    it("checks that the photo exists", async () => {
        const { photoKeys, repository, service } = setupCatalogService();
        repository.createPackage.mockResolvedValue(buildPackageRecord());

        await service.createPackage(input());

        expect(photoKeys.assertPhotoKeyExists).toHaveBeenCalledWith("packages/2026/11/3f2b6c1e.webp");
    });

    it("rejects an end that is not after the start, with an issue on endAt", async () => {
        const { repository, service } = setupCatalogService();

        const error = await service
            .createPackage(input({ endAt: Temporal.PlainDateTime.from("2026-11-03T01:00:00") }))
            .catch((caught: unknown) => caught);

        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).issues).toEqual([
            { target: "body", path: "endAt", message: "must be after startAt", code: "end_before_start" },
        ]);
        expect(repository.createPackage).not.toHaveBeenCalled();
    });

    it("does not create the package when the photo is missing", async () => {
        const { photoKeys, repository, service } = setupCatalogService();
        photoKeys.assertPhotoKeyExists.mockRejectedValue(new Error("photo does not exist"));

        await expect(service.createPackage(input())).rejects.toThrow("photo does not exist");
        expect(repository.createPackage).not.toHaveBeenCalled();
    });

    it("answers with a zero subscriber count and a signed photo url", async () => {
        const { repository, service } = setupCatalogService();
        repository.createPackage.mockResolvedValue(buildPackageRecord());

        expect(await service.createPackage(input())).toMatchObject({
            activeSubscriberCount: 0,
            photoUrl: "https://storage.test/packages/2026/11/3f2b6c1e.webp?signed",
        });
    });
});
