import type { Role } from "../../../shared/auth/roles.js";
import type { PhotoFolder } from "../../../shared/media/photo.js";

const COURIER_FOLDERS: readonly PhotoFolder[] = ["obstacles"];

export function canUploadTo(role: Role, folder: PhotoFolder): boolean {
    if (role === "ADMIN") return true;
    if (role === "COURIER") return COURIER_FOLDERS.includes(folder);
    return false;
}
