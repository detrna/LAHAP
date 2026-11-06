import type { Db } from "../../../../../infrastructure/database/prisma/db.js";

type Orm = Db["orm"];

export const menusWithIngredients = (orm: Orm) =>
    orm.public.Menu.include("menuIngredients", line =>
        line.select("ingredientId", "quantityPerPortion").orderBy(item => item.ingredientId.asc()),
    );
