import type { OrderPeriod } from "../../../../../../modules/catalog/domain/package.domain.js";
import { seedId } from "../../shared/seed-id.js";

export interface PackageSeed {
    readonly id: string;
    readonly name: string;
    readonly description: string;
    readonly basePrice: string;
    readonly periods: readonly OrderPeriod[];
    readonly deliveryTimes: readonly string[];
}

export const PACKAGES = {
    hemat: {
        id: seedId("package", 1),
        name: "Paket Hemat",
        description: "Untuk mahasiswa, anak kos, atau anggaran terbatas: lauk dan sayur sederhana, porsi standar.",
        basePrice: "15000.00",
        periods: ["Harian", "Mingguan", "Bulanan"],
        deliveryTimes: ["07:00", "12:00", "18:30"],
    },
    reguler: {
        id: seedId("package", 2),
        name: "Paket Reguler",
        description: "Untuk pekerja atau keluarga: pilihan lauk dan variasi lebih beragam.",
        basePrice: "20000.00",
        periods: ["Harian", "Mingguan", "Bulanan"],
        deliveryTimes: ["07:00", "12:00", "18:30"],
    },
} as const satisfies Record<string, PackageSeed>;

export type PackageKey = keyof typeof PACKAGES;

export const packagePhotoKey = (id: string) => `packages/seed/${id}.webp`;
