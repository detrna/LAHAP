import type { Db } from "../../../../../infrastructure/database/prisma/db.js";

type Orm = Db["orm"];

export const menusWithRelations = (orm: Orm) =>
    orm.public.Menu.include("menuIngredients", line =>
        line.select("ingredientId", "quantityPerPortion").orderBy(item => item.ingredientId.asc()),
    ).include("menuComponents", component =>
        component.select("id", "name", "cookId").orderBy([item => item.name.asc(), item => item.id.asc()]),
    );
