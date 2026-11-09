import { readFile } from "node:fs/promises";
import path from "node:path";
import type { ObjectStorage } from "../../../../../../shared/ports/object-storage/object-storage.js";
import { SEED_ASSETS_DIR, SEED_PHOTO_CONTENT_TYPE, SEED_PHOTOS } from "./photos.data.js";

export interface PhotosSeedContext {
    readonly objectStorage: Pick<ObjectStorage, "upload">;
    readonly assetsDir?: string | undefined;
}

export async function seedPhotos({ objectStorage, assetsDir = SEED_ASSETS_DIR }: PhotosSeedContext): Promise<number> {
    const photos = await Promise.all(
        SEED_PHOTOS.map(async photo => {
            const file = path.join(assetsDir, photo.file);
            try {
                return { key: photo.key, body: await readFile(file) };
            } catch (cause) {
                throw new Error(`seed photo ${file} cannot be read`, { cause });
            }
        }),
    );
    await Promise.all(
        photos.map(({ key, body }) => objectStorage.upload({ key, body, contentType: SEED_PHOTO_CONTENT_TYPE })),
    );
    return photos.length;
}

export async function deleteSeedPhotos(objectStorage: Pick<ObjectStorage, "delete">): Promise<number> {
    await Promise.all(SEED_PHOTOS.map(photo => objectStorage.delete(photo.key)));
    return SEED_PHOTOS.length;
}
