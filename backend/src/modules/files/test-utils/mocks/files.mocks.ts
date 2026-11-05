import { vi } from "vitest";
import type { ObjectStorage } from "../../../../shared/ports/object-storage/object-storage.js";
import type { FilesService } from "../../service/files.service.js";

export type Mocked<T> = { [K in keyof T]: T[K] & ReturnType<typeof vi.fn> };

export type MockedObjectStorage = Mocked<Pick<ObjectStorage, "upload" | "exists" | "getSignedUrl">>;

export type MockedFilesService = Mocked<Pick<FilesService, "uploadFile">>;

export function createMockObjectStorage(): MockedObjectStorage {
    return {
        upload: vi.fn(async () => undefined),
        exists: vi.fn(async () => true),
        getSignedUrl: vi.fn(async (key: string) => `https://storage.test/${key}?signed`),
    } as MockedObjectStorage;
}

export function createMockFilesService(): MockedFilesService {
    return {
        uploadFile: vi.fn(),
    } as MockedFilesService;
}
