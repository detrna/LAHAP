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
}
