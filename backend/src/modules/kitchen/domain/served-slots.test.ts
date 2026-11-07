import { describe, expect, it } from "vitest";
import { buildScheduleSummary } from "../../catalog/test-utils/factory/catalog.factory.js";
import { buildKitchenSlot } from "../test-utils/factory/kitchen.factory.js";
import { toServedSlots } from "./served-slots.js";

describe("toServedSlots (unit)", () => {
    const schedule = buildScheduleSummary({ id: "s-1", primaryMenuId: "m-1", alternativeMenuId: "m-2" });

    it("pairs each slot with its schedule and the primary menu it is served", () => {
        const slot = buildKitchenSlot({ menuScheduleId: "s-1", usesAlternativeMenu: false });

        expect(toServedSlots([slot], [schedule])).toEqual([
            { slot, schedule, primaryMenuId: "m-1", servedMenuId: "m-1" },
        ]);
    });

    it("serves the alternative menu to a slot switched to it", () => {
        const slot = buildKitchenSlot({ menuScheduleId: "s-1", usesAlternativeMenu: true });

        expect(toServedSlots([slot], [schedule])).toEqual([
            { slot, schedule, primaryMenuId: "m-1", servedMenuId: "m-2" },
        ]);
    });

    it("drops a slot whose schedule is not in the list", () => {
        const slot = buildKitchenSlot({ menuScheduleId: "s-other" });

        expect(toServedSlots([slot], [schedule])).toEqual([]);
    });

    it("drops a slot whose schedule has no primary menu", () => {
        const slot = buildKitchenSlot({ menuScheduleId: "s-1" });
        const noPrimary = buildScheduleSummary({ id: "s-1", primaryMenuId: null, alternativeMenuId: "m-2" });

        expect(toServedSlots([slot], [noPrimary])).toEqual([]);
    });

    it("drops a slot switched to an alternative its schedule no longer has", () => {
        const slot = buildKitchenSlot({ menuScheduleId: "s-1", usesAlternativeMenu: true });
        const noAlternative = buildScheduleSummary({ id: "s-1", primaryMenuId: "m-1", alternativeMenuId: null });

        expect(toServedSlots([slot], [noAlternative])).toEqual([]);
    });
});
