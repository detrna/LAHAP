import type { PhotoFolder } from "../../../shared/media/photo.js";

const EXTENSIONS: Readonly<Record<string, string>> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
};

export interface ObjectKeyInput {
    readonly folder: PhotoFolder;
    readonly date: Temporal.PlainDate;
    readonly id: string;
    readonly contentType: string;
}

export function buildObjectKey({ folder, date, id, contentType }: ObjectKeyInput): string {
    const extension = EXTENSIONS[contentType];
    if (extension === undefined) throw new Error(`unsupported content type: ${contentType}`);
    const month = String(date.month).padStart(2, "0");
    return `${folder}/${date.year}/${month}/${id}.${extension}`;
}
