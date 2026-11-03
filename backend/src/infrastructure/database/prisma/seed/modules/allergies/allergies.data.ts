import { seedId } from "../../shared/seed-id.js";

export const ALLERGIES = {
    kacang: { id: seedId("allergy", 1), name: "Kacang" },
    seafood: { id: seedId("allergy", 2), name: "Seafood" },
    gluten: { id: seedId("allergy", 3), name: "Gluten" },
    susu: { id: seedId("allergy", 4), name: "Susu" },
    telur: { id: seedId("allergy", 5), name: "Telur" },
    kedelai: { id: seedId("allergy", 6), name: "Kedelai" },
} as const;

export type AllergyKey = keyof typeof ALLERGIES;
