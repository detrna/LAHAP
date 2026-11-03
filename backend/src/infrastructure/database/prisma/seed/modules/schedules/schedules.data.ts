import type { MenuKey } from "../menus/menus.data.js";
import type { PackageKey } from "../packages/packages.data.js";

export const PUBLISHED_DAYS = 35;
export const DRAFT_DAYS = 7;

type DayPlan = readonly [pagi: MenuKey, siang: MenuKey, malam: MenuKey];
type WeekPlan = readonly [DayPlan, DayPlan, DayPlan, DayPlan, DayPlan, DayPlan, DayPlan];

export const WEEKLY_PLANS: Readonly<Record<PackageKey, WeekPlan>> = {
    hemat: [
        ["telurBalado", "ayamGoreng", "tempeOrek"],
        ["pecel", "tempeOrek", "ayamGoreng"],
        ["tempeOrek", "ayamGoreng", "telurBalado"],
        ["telurBalado", "pecel", "ayamGoreng"],
        ["pecel", "ayamGoreng", "tempeOrek"],
        ["tempeOrek", "telurBalado", "pecel"],
        ["telurBalado", "ayamGoreng", "pecel"],
    ],
    reguler: [
        ["sotoAyam", "ayamBakar", "udangPadang"],
        ["macaroniSchotel", "udangPadang", "ayamBakar"],
        ["sotoAyam", "ayamBakar", "macaroniSchotel"],
        ["macaroniSchotel", "udangPadang", "sotoAyam"],
        ["sotoAyam", "ayamBakar", "udangPadang"],
        ["macaroniSchotel", "sotoAyam", "ayamBakar"],
        ["sotoAyam", "udangPadang", "ayamBakar"],
    ],
};

export const ALTERNATIVES_BY_MEAL: readonly [pagi: MenuKey, siang: MenuKey, malam: MenuKey] = [
    "ayamJahe",
    "ayamSuwir",
    "ayamJahe",
];
