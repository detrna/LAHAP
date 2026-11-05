import type { ObjectStorage } from "../ports/object-storage/object-storage.js";

export async function toPhotoUrl(storage: ObjectStorage, key: string | null): Promise<string | null> {
    return key === null ? null : storage.getSignedUrl(key);
}

export async function toPhotoUrls(
    storage: ObjectStorage,
    keys: readonly (string | null)[],
): Promise<(string | null)[]> {
    const distinctKeys = [...new Set(keys.filter((key): key is string => key !== null))];
    const urls = await Promise.all(distinctKeys.map(key => storage.getSignedUrl(key)));
    const urlByKey = new Map(distinctKeys.map((key, index) => [key, urls[index] ?? null]));
    return keys.map(key => (key === null ? null : (urlByKey.get(key) ?? null)));
}
