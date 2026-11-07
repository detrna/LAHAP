import { describe, expect, it } from "vitest";
import { buildScheduleRecord } from "../../test-utils/factory/catalog.factory.js";
import { setupCatalogService } from "../../test-utils/setup/catalog.setup.js";
import { announceScheduleChanges } from "./announce-schedule-changes.js";

const date = (value: string) => Temporal.PlainDate.from(value);
const time = (value: string) => Temporal.PlainTime.from(value);

function setup() {
    const context = setupCatalogService();
    context.repository.findSchedules.mockResolvedValue([
        buildScheduleRecord({ id: "s-1", date: date("2026-11-12"), deliveryTime: time("07:00") }),
        buildScheduleRecord({ id: "s-2", date: date("2026-11-13"), deliveryTime: time("12:30") }),
    ]);
    return context;
}

describe("announceScheduleChanges (unit)", () => {
    it("sends one SCHEDULE announcement per changed schedule, with its current date, time and reason", async () => {
        const { service, repository, announcer } = setup();

        await announceScheduleChanges(service, [
            { scheduleId: "s-1", changeReason: "stok ayam habis" },
            { scheduleId: "s-2", changeReason: "jam diganti" },
        ]);

        expect(repository.findSchedules).toHaveBeenCalledWith({ ids: ["s-1", "s-2"] });
        expect(announcer.announce).toHaveBeenCalledTimes(2);
        const [first, second] = announcer.announce.mock.calls.map(call => call[0]);
        expect(first).toMatchObject({ scope: "SCHEDULE", menuScheduleId: "s-1", title: "Perubahan jadwal menu" });
        expect(first.body).toContain("12 November 2026");
        expect(first.body).toContain("07:00");
        expect(first.body).toContain("stok ayam habis");
        expect(second).toMatchObject({ scope: "SCHEDULE", menuScheduleId: "s-2" });
        expect(second.body).toContain("12:30");
        expect(second.body).toContain("jam diganti");
    });

    it("does nothing, and queries nothing, when no schedule changed", async () => {
        const { service, repository, announcer } = setup();

        await announceScheduleChanges(service, []);

        expect(repository.findSchedules).not.toHaveBeenCalled();
        expect(announcer.announce).not.toHaveBeenCalled();
    });

    it("skips a schedule that no longer exists", async () => {
        const { service, announcer } = setup();

        await announceScheduleChanges(service, [
            { scheduleId: "s-gone", changeReason: "x" },
            { scheduleId: "s-1", changeReason: "y" },
        ]);

        expect(announcer.announce).toHaveBeenCalledTimes(1);
        expect(announcer.announce.mock.calls[0]?.[0]).toMatchObject({ menuScheduleId: "s-1" });
    });

    it("logs a failed announcement and still announces the others", async () => {
        const { service, announcer, logger } = setup();
        const failure = new Error("redis down");
        announcer.announce.mockRejectedValueOnce(failure);

        await expect(
            announceScheduleChanges(service, [
                { scheduleId: "s-1", changeReason: "x" },
                { scheduleId: "s-2", changeReason: "y" },
            ]),
        ).resolves.toBeUndefined();

        expect(announcer.announce).toHaveBeenCalledTimes(2);
        expect(logger.warn).toHaveBeenCalledWith(
            { err: failure, scheduleId: "s-1" },
            "schedule change announcement failed, the change itself is saved",
        );
    });

    it("logs and swallows a failure while reading the schedules", async () => {
        const { service, repository, announcer, logger } = setup();
        const failure = new Error("db down");
        repository.findSchedules.mockRejectedValue(failure);

        await expect(
            announceScheduleChanges(service, [{ scheduleId: "s-1", changeReason: "x" }]),
        ).resolves.toBeUndefined();

        expect(announcer.announce).not.toHaveBeenCalled();
        expect(logger.warn).toHaveBeenCalledWith(
            { err: failure },
            "schedule change announcement failed, the change itself is saved",
        );
    });
});
