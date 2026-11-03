import type { IngredientUnit } from "../../../../../../modules/ingredients/domain/ingredient.domain.js";
import type { AllergyKey } from "../allergies/allergies.data.js";
import { seedId } from "../../shared/seed-id.js";

export interface IngredientSeed {
    readonly id: string;
    readonly name: string;
    readonly unit: IngredientUnit;
    readonly stock: string;
    readonly minimumThreshold: string;
    readonly allergies: readonly AllergyKey[];
}

const ingredient = (
    n: number,
    name: string,
    unit: IngredientUnit,
    stock: string,
    minimumThreshold: string,
    allergies: readonly AllergyKey[] = [],
): IngredientSeed => ({ id: seedId("ingredient", n), name, unit, stock, minimumThreshold, allergies });

export const INGREDIENTS = {
    beras: ingredient(1, "Beras", "kg", "50.00", "20.00"),
    ayam: ingredient(2, "Daging Ayam", "kg", "15.00", "5.00"),
    udang: ingredient(3, "Udang", "kg", "1.50", "2.00", ["seafood"]),
    telur: ingredient(4, "Telur Ayam", "butir", "120.00", "30.00", ["telur"]),
    tempe: ingredient(5, "Tempe", "gram", "3000.00", "1000.00", ["kedelai"]),
    kacangTanah: ingredient(6, "Kacang Tanah", "gram", "2000.00", "500.00", ["kacang"]),
    kecap: ingredient(7, "Kecap Manis", "ml", "2000.00", "500.00", ["kedelai"]),
    tepung: ingredient(8, "Tepung Terigu", "gram", "5000.00", "1000.00", ["gluten"]),
    bayam: ingredient(9, "Bayam", "ikat", "20.00", "10.00"),
    kangkung: ingredient(10, "Kangkung", "ikat", "8.00", "10.00"),
    kacangPanjang: ingredient(11, "Kacang Panjang", "ikat", "15.00", "5.00"),
    tauge: ingredient(12, "Tauge", "gram", "2000.00", "500.00"),
    kol: ingredient(13, "Kol", "gram", "4000.00", "1000.00"),
    wortel: ingredient(14, "Wortel", "gram", "3000.00", "1000.00"),
    bawangMerah: ingredient(15, "Bawang Merah", "gram", "2000.00", "500.00"),
    bawangPutih: ingredient(16, "Bawang Putih", "gram", "1500.00", "500.00"),
    cabai: ingredient(17, "Cabai Merah", "gram", "1000.00", "300.00"),
    minyak: ingredient(18, "Minyak Goreng", "liter", "10.00", "3.00"),
    santan: ingredient(19, "Santan", "ml", "3000.00", "1000.00"),
    keju: ingredient(20, "Keju", "gram", "800.00", "200.00", ["susu"]),
} as const satisfies Record<string, IngredientSeed>;

export type IngredientKey = keyof typeof INGREDIENTS;

export const ingredientPhotoKey = (id: string) => `seed/ingredients/${id}.webp`;
