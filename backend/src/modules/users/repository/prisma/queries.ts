import type { Db } from "../../../../infrastructure/database/prisma/db.js";

type Orm = Db["orm"];

export const usersWithAllergies = (orm: Orm) => orm.public.User.include("allergies", link => link.include("allergy"));
