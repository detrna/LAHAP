import type { CustomerAllergyProfile } from "../../domain/to-cook-source.js";

export interface KitchenCustomers {
    getAllergyProfiles(userIds: readonly string[]): Promise<readonly CustomerAllergyProfile[]>;
}
