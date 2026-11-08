import type { IngredientKey } from "../ingredients/ingredients.data.js";
import { KITCHEN_COOK_ID } from "../users/users.data.js";
import { seedId } from "../../shared/seed-id.js";

export interface MenuComponentSeed {
    readonly name: string;
    readonly cookId: string | null;
}

export interface MenuSeed {
    readonly id: string;
    readonly name: string;
    readonly description: string;
    readonly isAlternative: boolean;
    readonly tags: readonly string[];
    readonly ingredients: Readonly<Partial<Record<IngredientKey, string>>>;
    readonly components: readonly MenuComponentSeed[];
}

const open = (name: string): MenuComponentSeed => ({ name, cookId: null });
const cooked = (name: string): MenuComponentSeed => ({ name, cookId: KITCHEN_COOK_ID });

export const MENUS = {
    ayamGoreng: {
        id: seedId("menu", 1),
        name: "Nasi Ayam Goreng Tepung & Sayur Bayam",
        description: "Ayam goreng tepung renyah dengan sayur bening bayam.",
        isAlternative: false,
        tags: ["ayam", "goreng"],
        ingredients: {
            beras: "0.10",
            ayam: "0.10",
            tepung: "20.00",
            bayam: "0.25",
            bawangPutih: "5.00",
            minyak: "0.03",
        },
        components: [open("Nasi Putih"), cooked("Ayam Goreng Tepung"), open("Sayur Bening Bayam")],
    },
    tempeOrek: {
        id: seedId("menu", 2),
        name: "Nasi Tempe Orek & Tumis Kangkung",
        description: "Tempe orek kecap manis dengan tumis kangkung bawang.",
        isAlternative: false,
        tags: ["tempe", "sayur"],
        ingredients: {
            beras: "0.10",
            tempe: "60.00",
            kecap: "10.00",
            kangkung: "0.25",
            bawangMerah: "10.00",
            cabai: "5.00",
            minyak: "0.02",
        },
        components: [open("Nasi Putih"), cooked("Tempe Orek Kecap"), open("Tumis Kangkung")],
    },
    pecel: {
        id: seedId("menu", 3),
        name: "Nasi Pecel Malang",
        description: "Sayur rebus dengan sambal kacang khas Malang.",
        isAlternative: false,
        tags: ["sayur", "pedas"],
        ingredients: {
            beras: "0.10",
            kacangTanah: "30.00",
            kacangPanjang: "0.20",
            tauge: "30.00",
            bayam: "0.20",
            cabai: "5.00",
        },
        components: [open("Nasi Putih"), open("Sayur Rebus"), cooked("Sambal Kacang")],
    },
    telurBalado: {
        id: seedId("menu", 4),
        name: "Nasi Telur Balado & Sayur Sop",
        description: "Telur rebus bumbu balado dengan sayur sop kol dan wortel.",
        isAlternative: false,
        tags: ["telur", "pedas"],
        ingredients: {
            beras: "0.10",
            telur: "1.00",
            cabai: "10.00",
            bawangMerah: "10.00",
            kol: "50.00",
            wortel: "30.00",
        },
        components: [open("Nasi Putih"), cooked("Telur Balado"), open("Sayur Sop")],
    },
    ayamBakar: {
        id: seedId("menu", 5),
        name: "Nasi Ayam Bakar Kecap & Lalapan",
        description: "Ayam bakar bumbu kecap dengan lalapan kol dan sambal.",
        isAlternative: false,
        tags: ["ayam", "bakar"],
        ingredients: {
            beras: "0.10",
            ayam: "0.15",
            kecap: "20.00",
            bawangMerah: "10.00",
            bawangPutih: "5.00",
            kol: "30.00",
            cabai: "5.00",
        },
        components: [open("Nasi Putih"), cooked("Ayam Bakar Kecap"), open("Lalapan"), open("Sambal")],
    },
    udangPadang: {
        id: seedId("menu", 6),
        name: "Nasi Udang Saus Padang & Capcay",
        description: "Udang saus padang pedas dengan capcay kol dan wortel.",
        isAlternative: false,
        tags: ["seafood", "pedas"],
        ingredients: {
            beras: "0.10",
            udang: "0.08",
            kol: "50.00",
            wortel: "30.00",
            bawangPutih: "5.00",
            cabai: "10.00",
            minyak: "0.02",
        },
        components: [open("Nasi Putih"), cooked("Udang Saus Padang"), open("Capcay")],
    },
    sotoAyam: {
        id: seedId("menu", 7),
        name: "Nasi Soto Ayam Lamongan",
        description: "Soto ayam kuah kuning dengan telur, kol, dan tauge.",
        isAlternative: false,
        tags: ["ayam", "berkuah"],
        ingredients: {
            beras: "0.10",
            ayam: "0.10",
            telur: "0.50",
            kol: "30.00",
            tauge: "20.00",
            bawangPutih: "5.00",
        },
        components: [open("Nasi Putih"), cooked("Soto Ayam Kuah Kuning"), open("Telur Rebus")],
    },
    macaroniSchotel: {
        id: seedId("menu", 8),
        name: "Makaroni Schotel Ayam",
        description: "Makaroni panggang dengan ayam, telur, dan keju.",
        isAlternative: false,
        tags: ["ayam", "panggang"],
        ingredients: { tepung: "80.00", ayam: "0.08", telur: "1.00", keju: "30.00", wortel: "20.00" },
        components: [cooked("Makaroni Schotel")],
    },
    ayamJahe: {
        id: seedId("menu", 9),
        name: "Nasi Ayam Rebus Jahe & Sayur Bayam",
        description: "Menu alternatif bebas alergen: ayam rebus jahe dengan sayur bening bayam.",
        isAlternative: true,
        tags: ["ayam", "bebas-alergen"],
        ingredients: { beras: "0.10", ayam: "0.10", bayam: "0.25", bawangPutih: "5.00" },
        components: [open("Nasi Putih"), cooked("Ayam Rebus Jahe"), open("Sayur Bening Bayam")],
    },
    ayamSuwir: {
        id: seedId("menu", 10),
        name: "Nasi Ayam Suwir & Tumis Sayur",
        description: "Menu alternatif bebas alergen: ayam suwir dengan tumis kol dan wortel.",
        isAlternative: true,
        tags: ["ayam", "bebas-alergen"],
        ingredients: {
            beras: "0.10",
            ayam: "0.10",
            kol: "40.00",
            wortel: "30.00",
            bawangPutih: "5.00",
            minyak: "0.02",
        },
        components: [open("Nasi Putih"), cooked("Ayam Suwir"), open("Tumis Kol Wortel")],
    },
} as const satisfies Record<string, MenuSeed>;

export type MenuKey = keyof typeof MENUS;

export const menuPhotoKey = (id: string) => `menus/seed/${id}.webp`;
