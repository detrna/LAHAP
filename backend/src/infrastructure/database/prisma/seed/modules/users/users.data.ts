import type { Role } from "../../../../../../shared/auth/roles.js";
import type { AllergyKey } from "../allergies/allergies.data.js";
import { seedId } from "../../shared/seed-id.js";

export interface UserSeed {
    readonly id: string;
    readonly name: string;
    readonly phone: string;
    readonly email: string | null;
    readonly role: Role;
    readonly address: string | null;
    readonly latitude: string | null;
    readonly longitude: string | null;
    readonly allergyNote: string | null;
    readonly allergies: readonly AllergyKey[];
}

const staff = (n: number, name: string, phone: string, email: string, role: Role): UserSeed => ({
    id: seedId("user", n),
    name,
    phone,
    email,
    role,
    address: null,
    latitude: null,
    longitude: null,
    allergyNote: null,
    allergies: [],
});

export const KITCHEN_COOK_ID = seedId("user", 2);

export const USERS: readonly UserSeed[] = [
    staff(1, "Admin Lahap", "6281100000001", "admin@lahap.test", "ADMIN"),
    staff(2, "Dapur Lahap", "6281100000002", "dapur@lahap.test", "KITCHEN"),
    staff(3, "Joko Kurir", "6281100000003", "joko@lahap.test", "COURIER"),
    staff(4, "Eko Kurir", "6281100000004", "eko@lahap.test", "COURIER"),
    {
        id: seedId("user", 5),
        name: "Rina Putri",
        phone: "6281200000001",
        email: "rina@lahap.test",
        role: "CUSTOMER",
        address: "Jl. MT Haryono No. 12, Dinoyo, Lowokwaru, Kota Malang",
        latitude: "-7.93930000",
        longitude: "112.60940000",
        allergyNote: null,
        allergies: ["kacang"],
    },
    {
        id: seedId("user", 6),
        name: "Andi Wijaya",
        phone: "6281200000002",
        email: "andi@lahap.test",
        role: "CUSTOMER",
        address: "Jl. Danau Toba No. 5, Sawojajar, Kedungkandang, Kota Malang",
        latitude: "-7.97210000",
        longitude: "112.65800000",
        allergyNote: "Tidak bisa makan terong",
        allergies: ["seafood"],
    },
    {
        id: seedId("user", 7),
        name: "Dewi Lestari",
        phone: "6281200000003",
        email: null,
        role: "CUSTOMER",
        address: null,
        latitude: null,
        longitude: null,
        allergyNote: null,
        allergies: [],
    },
    {
        id: seedId("user", 8),
        name: "Bagus Santoso",
        phone: "6281200000004",
        email: "bagus@lahap.test",
        role: "CUSTOMER",
        address: "Jl. Diponegoro No. 20, Sisir, Kota Batu",
        latitude: "-7.87100000",
        longitude: "112.52600000",
        allergyNote: null,
        allergies: [],
    },
];
