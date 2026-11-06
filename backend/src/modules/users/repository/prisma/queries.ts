import type { Db } from "../../../../infrastructure/database/prisma/db.js";

type Orm = Db["orm"];

export const usersWithAllergyIds = (orm: Orm) => orm.public.User.include("allergies", link => link.select("allergyId"));
