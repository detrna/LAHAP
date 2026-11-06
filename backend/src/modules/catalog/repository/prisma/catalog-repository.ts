import type { Db } from "../../../../infrastructure/database/prisma/db.js";
import type { CatalogRepository } from "../../service/interfaces/catalog.repository.js";
import { createAllergy } from "./allergies/create-allergy.js";
import { deleteAllergy } from "./allergies/delete-allergy.js";
import { findAllAllergies } from "./allergies/find-all-allergies.js";
import { findAllergiesByIds } from "./allergies/find-allergies-by-ids.js";
import { findAllergyById } from "./allergies/find-allergy-by-id.js";
import { findMissingAllergyIds } from "./allergies/find-missing-allergy-ids.js";
import { listAllergies } from "./allergies/list-allergies.js";
import { updateAllergy } from "./allergies/update-allergy.js";
import { createPackage } from "./packages/create-package.js";
import { deletePackage } from "./packages/delete-package.js";
import { findMissingPackageIds } from "./packages/find-missing-package-ids.js";
import { findPackageById } from "./packages/find-package-by-id.js";
import { findPackagesByIds } from "./packages/find-packages-by-ids.js";
import { findScheduleIdsAtTimes } from "./packages/find-schedule-ids-at-times.js";
import { listPackages } from "./packages/list-packages.js";
import { updatePackage } from "./packages/update-package.js";
import { listMenus } from "./menus/list-menus.js";
import { findMenuById } from "./menus/find-menu-by-id.js";
import { findMenusByIds } from "./menus/find-menus-by-ids.js";
import { findMenuKinds } from "./menus/find-menu-kinds.js";
import { createMenu } from "./menus/create-menu.js";
import { updateMenu } from "./menus/update-menu.js";
import { deleteMenu } from "./menus/delete-menu.js";
import { findScheduleIdsUsingMenu } from "./menus/find-schedule-ids-using-menu.js";
import { findRecipeLines } from "./menus/find-recipe-lines.js";
import { findMenusUsingIngredients } from "./menus/find-menus-using-ingredients.js";
import { listSchedules } from "./schedules/list-schedules.js";
import { findSchedules } from "./schedules/find-schedules.js";
import { findScheduleById } from "./schedules/find-schedule-by-id.js";
import { findMissingScheduleIds } from "./schedules/find-missing-schedule-ids.js";
import { createSchedules } from "./schedules/create-schedules.js";
import { updateSchedules } from "./schedules/update-schedules.js";
import { deleteSchedules } from "./schedules/delete-schedules.js";
import { setSchedulesPublished } from "./schedules/set-schedules-published.js";

export class PrismaCatalogRepository implements CatalogRepository {
    constructor(readonly db: Db) {}

    findMissingAllergyIds = findMissingAllergyIds;
    findAllergiesByIds = findAllergiesByIds;
    findAllAllergies = findAllAllergies;
    listAllergies = listAllergies;
    findAllergyById = findAllergyById;
    createAllergy = createAllergy;
    updateAllergy = updateAllergy;
    deleteAllergy = deleteAllergy;

    listPackages = listPackages;
    findPackageById = findPackageById;
    findPackagesByIds = findPackagesByIds;
    findMissingPackageIds = findMissingPackageIds;
    createPackage = createPackage;
    updatePackage = updatePackage;
    deletePackage = deletePackage;
    findScheduleIdsAtTimes = findScheduleIdsAtTimes;

    listMenus = listMenus;
    findMenuById = findMenuById;
    findMenusByIds = findMenusByIds;
    findMenuKinds = findMenuKinds;
    createMenu = createMenu;
    updateMenu = updateMenu;
    deleteMenu = deleteMenu;
    findScheduleIdsUsingMenu = findScheduleIdsUsingMenu;
    findRecipeLines = findRecipeLines;
    findMenusUsingIngredients = findMenusUsingIngredients;

    listSchedules = listSchedules;
    findSchedules = findSchedules;
    findScheduleById = findScheduleById;
    findMissingScheduleIds = findMissingScheduleIds;
    createSchedules = createSchedules;
    updateSchedules = updateSchedules;
    deleteSchedules = deleteSchedules;
    setSchedulesPublished = setSchedulesPublished;
}
