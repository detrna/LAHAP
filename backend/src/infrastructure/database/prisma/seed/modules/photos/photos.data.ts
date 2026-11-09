import path from "node:path";
import { INGREDIENTS, ingredientPhotoKey } from "../ingredients/ingredients.data.js";
import { MENUS, menuPhotoKey } from "../menus/menus.data.js";
import { PACKAGES, packagePhotoKey } from "../packages/packages.data.js";
import { TIERS, tierPhotoKey } from "../tiers/tiers.data.js";

export interface SeedPhoto {
    readonly file: string;
    readonly key: string;
}

export const SEED_ASSETS_DIR = path.resolve(process.cwd(), "src/infrastructure/database/prisma/seed/assets");

export const SEED_PHOTO_CONTENT_TYPE = "image/webp";

const photosOf = (
    folder: string,
    fixtures: Readonly<Record<string, { readonly id: string }>>,
    toKey: (id: string) => string,
): SeedPhoto[] =>
    Object.entries(fixtures).map(([name, { id }]) => ({ file: `${folder}/${name}.webp`, key: toKey(id) }));

export const SEED_PHOTOS: readonly SeedPhoto[] = [
    ...photosOf("packages", PACKAGES, packagePhotoKey),
    ...photosOf("menus", MENUS, menuPhotoKey),
    ...photosOf("ingredients", INGREDIENTS, ingredientPhotoKey),
    ...photosOf("tiers", TIERS, tierPhotoKey),
];
