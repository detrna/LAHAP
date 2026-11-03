import type { UploadedFile } from "../../domain/file.domain.js";

export function buildUploadedFile(overrides: Partial<UploadedFile> = {}): UploadedFile {
    return { key: "menus/2026/11/3f2b6c1e.webp", url: "https://example.com/url", ...overrides };
}
