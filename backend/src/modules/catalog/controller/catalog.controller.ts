import type { CatalogService } from "../service/catalog.service.js";
import { createAllergy } from "./allergies/create-allergy.js";
import { deleteAllergy } from "./allergies/delete-allergy.js";
import { getAllergy } from "./allergies/get-allergy.js";
import { listAdminAllergies } from "./allergies/list-admin-allergies.js";
import { listAllergies } from "./allergies/list-allergies.js";
import { updateAllergy } from "./allergies/update-allergy.js";
import { createPackage } from "./packages/create-package.js";
import { deletePackage } from "./packages/delete-package.js";
import { getAvailablePackage } from "./packages/get-available-package.js";
import { getPackage } from "./packages/get-package.js";
import { listAvailablePackages } from "./packages/list-available-packages.js";
import { listPackages } from "./packages/list-packages.js";
import { updatePackage } from "./packages/update-package.js";
import { listMenus } from "./menus/list-menus.js";
import { getMenu } from "./menus/get-menu.js";
import { createMenu } from "./menus/create-menu.js";
import { updateMenu } from "./menus/update-menu.js";
import { deleteMenu } from "./menus/delete-menu.js";
import { listPackageSchedules } from "./schedules/list-package-schedules.js";
import { listSchedules } from "./schedules/list-schedules.js";
import { getSchedule } from "./schedules/get-schedule.js";
import { createSchedules } from "./schedules/create-schedules.js";
import { updateSchedules } from "./schedules/update-schedules.js";
import { updateSchedule } from "./schedules/update-schedule.js";
import { deleteSchedules } from "./schedules/delete-schedules.js";
import { publishSchedules } from "./schedules/publish-schedules.js";

export class CatalogController {
    constructor(readonly catalogService: CatalogService) {}

    listAllergies = listAllergies.bind(this);
    listAdminAllergies = listAdminAllergies.bind(this);
    getAllergy = getAllergy.bind(this);
    createAllergy = createAllergy.bind(this);
    updateAllergy = updateAllergy.bind(this);
    deleteAllergy = deleteAllergy.bind(this);

    listAvailablePackages = listAvailablePackages.bind(this);
    getAvailablePackage = getAvailablePackage.bind(this);
    listPackages = listPackages.bind(this);
    getPackage = getPackage.bind(this);
    createPackage = createPackage.bind(this);
    updatePackage = updatePackage.bind(this);
    deletePackage = deletePackage.bind(this);

    listMenus = listMenus.bind(this);
    getMenu = getMenu.bind(this);
    createMenu = createMenu.bind(this);
    updateMenu = updateMenu.bind(this);
    deleteMenu = deleteMenu.bind(this);

    listPackageSchedules = listPackageSchedules.bind(this);
    listSchedules = listSchedules.bind(this);
    getSchedule = getSchedule.bind(this);
    createSchedules = createSchedules.bind(this);
    updateSchedules = updateSchedules.bind(this);
    updateSchedule = updateSchedule.bind(this);
    deleteSchedules = deleteSchedules.bind(this);
    publishSchedules = publishSchedules.bind(this);
}
