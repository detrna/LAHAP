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
}
