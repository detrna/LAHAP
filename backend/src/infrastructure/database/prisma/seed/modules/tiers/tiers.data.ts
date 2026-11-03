import { seedId } from "../../shared/seed-id.js";

export const TIERS = [
    {
        id: seedId("tier", 1),
        name: "Biasa",
        description: "Tier awal untuk semua pelanggan.",
        requiredSubscriptionDays: 0,
        durationDays: 30,
        discountPercent: "0.00",
        photoKey: null,
    },
    {
        id: seedId("tier", 2),
        name: "Silver",
        description: "Diskon 5% setelah 20 hari layanan.",
        requiredSubscriptionDays: 20,
        durationDays: 30,
        discountPercent: "5.00",
        photoKey: null,
    },
    {
        id: seedId("tier", 3),
        name: "Gold",
        description: "Diskon 10% setelah 60 hari layanan.",
        requiredSubscriptionDays: 60,
        durationDays: 30,
        discountPercent: "10.00",
        photoKey: null,
    },
] as const;
