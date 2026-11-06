import type { Clock } from "../../../shared/ports/clock/clock.js";
import type { ObjectStorage } from "../../../shared/ports/object-storage/object-storage.js";
import { createAllergy } from "./allergies/create-allergy.js";
import { deleteAllergy } from "./allergies/delete-allergy.js";
import { findMissingAllergyIds } from "./allergies/find-missing-allergy-ids.js";
import { getAllergiesByIds } from "./allergies/get-allergies-by-ids.js";
import { getAllergy } from "./allergies/get-allergy.js";
import { listAllergies } from "./allergies/list-allergies.js";
import { listAllergyPage } from "./allergies/list-allergy-page.js";
import { updateAllergy } from "./allergies/update-allergy.js";
import type { CatalogRepository } from "./interfaces/catalog.repository.js";
import type { IngredientLookup } from "./interfaces/ingredient-lookup.js";
import type { OrderActivity } from "./interfaces/order-activity.js";
import type { PhotoKeys } from "./interfaces/photo-keys.js";
import { createPackage } from "./packages/create-package.js";
import { deletePackage } from "./packages/delete-package.js";
import { findMissingPackageIds } from "./packages/find-missing-package-ids.js";
import { getAvailablePackage } from "./packages/get-available-package.js";
import { getPackage } from "./packages/get-package.js";
import { getPackagesByIds } from "./packages/get-packages-by-ids.js";
import { listAvailablePackages } from "./packages/list-available-packages.js";
import { listPackages } from "./packages/list-packages.js";
import { presentPackage, presentPackages } from "./packages/present-packages.js";
import { updatePackage } from "./packages/update-package.js";
import { presentMenu, presentMenus } from "./menus/present-menus.js";
import { listMenus } from "./menus/list-menus.js";
import { getMenu } from "./menus/get-menu.js";
import { getMenusByIds } from "./menus/get-menus-by-ids.js";
import { createMenu } from "./menus/create-menu.js";
import { updateMenu } from "./menus/update-menu.js";
import { deleteMenu } from "./menus/delete-menu.js";
import { getRecipeLines } from "./menus/get-recipe-lines.js";
import { findMenusUsingIngredients } from "./menus/find-menus-using-ingredients.js";
import { presentSchedule, presentSchedules } from "./schedules/present-schedules.js";
import { listSchedules } from "./schedules/list-schedules.js";
import { getSchedulesByIds } from "./schedules/get-schedules-by-ids.js";
import { getSchedule } from "./schedules/get-schedule.js";
import { listPublishedSchedules } from "./schedules/list-published-schedules.js";
import { findSchedules } from "./schedules/find-schedules.js";
import { findMissingScheduleIds } from "./schedules/find-missing-schedule-ids.js";
import { createSchedules } from "./schedules/create-schedules.js";
import { updateSchedule, updateSchedules } from "./schedules/update-schedules.js";
import { deleteSchedules } from "./schedules/delete-schedules.js";
import { publishSchedules } from "./schedules/publish-schedules.js";

export class CatalogService {
    constructor(
        readonly catalogRepository: CatalogRepository,
        readonly objectStorage: ObjectStorage,
        readonly clock: Clock,
        readonly photoKeys: PhotoKeys,
        readonly ingredients: IngredientLookup,
        readonly orderActivity: OrderActivity,
    ) {}

    findMissingAllergyIds = findMissingAllergyIds;
    getAllergiesByIds = getAllergiesByIds;
    listAllergies = listAllergies;
    listAllergyPage = listAllergyPage;
    getAllergy = getAllergy;
    createAllergy = createAllergy;
    updateAllergy = updateAllergy;
    deleteAllergy = deleteAllergy;

    presentPackages = presentPackages;
    presentPackage = presentPackage;
    listAvailablePackages = listAvailablePackages;
    getAvailablePackage = getAvailablePackage;
    listPackages = listPackages;
    getPackage = getPackage;
    createPackage = createPackage;
    updatePackage = updatePackage;
    deletePackage = deletePackage;
    getPackagesByIds = getPackagesByIds;
    findMissingPackageIds = findMissingPackageIds;

    presentMenus = presentMenus;
    presentMenu = presentMenu;
    listMenus = listMenus;
    getMenu = getMenu;
    getMenusByIds = getMenusByIds;
    createMenu = createMenu;
    updateMenu = updateMenu;
    deleteMenu = deleteMenu;
    getRecipeLines = getRecipeLines;
    findMenusUsingIngredients = findMenusUsingIngredients;

    presentSchedules = presentSchedules;
    presentSchedule = presentSchedule;
    listSchedules = listSchedules;
    getSchedule = getSchedule;
    getSchedulesByIds = getSchedulesByIds;
    listPublishedSchedules = listPublishedSchedules;
    findSchedules = findSchedules;
    findMissingScheduleIds = findMissingScheduleIds;
    createSchedules = createSchedules;
    updateSchedules = updateSchedules;
    updateSchedule = updateSchedule;
    deleteSchedules = deleteSchedules;
    publishSchedules = publishSchedules;
}
