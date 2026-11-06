import type { Db } from "../../../../infrastructure/database/prisma/db.js";

type Orm = Db["orm"];

export const ingredientsWithAllergyIds = (orm: Orm) =>
    orm.public.Ingredient.include("ingredientAllergy", link => link.select("allergyId"));
