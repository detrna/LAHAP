import { seedId } from "../../shared/seed-id.js";

export const TIERS = {
    biasa: {
        id: seedId("tier", 1),
        name: "Biasa",
        description: "Tier awal untuk semua pelanggan.",
        requiredSubscriptionDays: 0,
        durationDays: 30,
        discountPercent: "0.00",
    },
    silver: {
        id: seedId("tier", 2),
        name: "Silver",
        description: "Untuk pelanggan yang rutin berlangganan.",
        requiredSubscriptionDays: 30,
        durationDays: 30,
        discountPercent: "5.00",
    },
    gold: {
        id: seedId("tier", 3),
        name: "Gold",
        description: "Untuk pelanggan setia LAHAP.",
        requiredSubscriptionDays: 60,
        durationDays: 30,
        discountPercent: "10.00",
    },
} as const;

export const tierPhotoKey = (id: string) => `tiers/seed/${id}.webp`;
