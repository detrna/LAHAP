import type { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import type { Role } from "../../../shared/auth/roles.js";
import type { PhotoFolder } from "../../../shared/media/photo.js";
import type { UploadedFile } from "../domain/file.domain.js";
import { FolderNotAllowedError } from "../domain/errors.js";
import { canUploadTo } from "../domain/folder-access.js";
import { buildObjectKey } from "../domain/object-key.js";
import type { FilesService } from "./files.service.js";

export interface UploadFileInput {
    readonly folder: PhotoFolder;
    readonly body: Buffer;
    readonly contentType: string;
    readonly role: Role;
}

export async function uploadFile(this: FilesService, input: UploadFileInput): Promise<UploadedFile> {
    if (!canUploadTo(input.role, input.folder)) throw new FolderNotAllowedError(input.folder);
    const key = buildObjectKey({
        folder: input.folder,
        date: this.clock.now().toPlainDate(),
        id: randomUUID(),
        contentType: input.contentType,
    });
    await this.objectStorage.upload({ key, body: input.body, contentType: input.contentType });
    return { key, url: await this.objectStorage.getSignedUrl(key) };
}
