export interface PhotoKeys {
    assertPhotoKeyExists(key: string, path?: string): Promise<void>;
}
