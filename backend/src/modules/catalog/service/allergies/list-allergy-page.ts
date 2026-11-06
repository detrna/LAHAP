import type { Allergy } from "../../domain/allergy.domain.js";
import type { CatalogService } from "../catalog.service.js";
import { toAllergy } from "./to-allergy.js";

export interface ListAllergyPageInput {
    readonly search?: string | undefined;
    readonly skip: number;
    readonly take: number;
}

export interface AllergyPage {
    readonly items: readonly Allergy[];
    readonly total: number;
}

export async function listAllergyPage(this: CatalogService, input: ListAllergyPageInput): Promise<AllergyPage> {
    const { items, total } = await this.catalogRepository.listAllergies(input);
    return { items: items.map(toAllergy), total };
}
