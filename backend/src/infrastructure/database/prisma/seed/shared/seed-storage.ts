import { loadObjectStorageConfig } from "../../../../../config/object-storage.js";
import type { ObjectStorage } from "../../../../../shared/ports/object-storage/object-storage.js";
import { loadObjectStorage } from "../../../../object-storage/seaweedfs/seaweedfs.js";

export const loadSeedObjectStorage = (): Promise<ObjectStorage> =>
    loadObjectStorage(loadObjectStorageConfig(), { autoCreateBucket: true });
