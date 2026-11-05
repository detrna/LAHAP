import { createFixedClock, type FixedClock } from "../../../../../tests/utils/factory/clock/clock.js";
import type { ObjectStorage } from "../../../../shared/ports/object-storage/object-storage.js";
import { FilesController } from "../../controller/files.controller.js";
import { FilesService } from "../../service/files.service.js";
import {
    createMockFilesService,
    createMockObjectStorage,
    type MockedFilesService,
    type MockedObjectStorage,
} from "../mocks/files.mocks.js";

export interface FilesServiceSetup {
    readonly objectStorage: MockedObjectStorage;
    readonly clock: FixedClock;
    readonly service: FilesService;
}

export interface FilesControllerSetup {
    readonly filesService: MockedFilesService;
    readonly controller: FilesController;
}

export function setupFilesService(): FilesServiceSetup {
    const objectStorage = createMockObjectStorage();
    const clock = createFixedClock();
    return { objectStorage, clock, service: new FilesService(objectStorage as unknown as ObjectStorage, clock) };
}

export function setupFilesController(): FilesControllerSetup {
    const filesService = createMockFilesService();
    return { filesService, controller: new FilesController(filesService as unknown as FilesService) };
}
