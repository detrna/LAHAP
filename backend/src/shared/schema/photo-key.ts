import { z } from "zod";
import type { PhotoFolder } from "../media/photo.js";

export const PHOTO_KEY_MAX_LENGTH = 255;

export const photoKeySchema = z.string().trim().min(1).max(PHOTO_KEY_MAX_LENGTH);

const hasValidSegments = (key: string, folder: PhotoFolder): boolean => {
    const [first, ...rest] = key.split("/");
    return (
        first === folder &&
        rest.length > 0 &&
        rest.every(segment => segment !== "" && segment !== "." && segment !== "..")
    );
};

export function photoKeyIn(folder: PhotoFolder) {
    return photoKeySchema.refine(key => hasValidSegments(key, folder), `must be a key in the "${folder}" folder`);
}
