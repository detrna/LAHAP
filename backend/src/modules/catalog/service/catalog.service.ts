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

export class CatalogService {
    constructor(
        readonly catalogRepository: CatalogRepository,
        readonly objectStorage: ObjectStorage,
        readonly clock: Clock,
        readonly photoKeys: PhotoKeys,
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
}
