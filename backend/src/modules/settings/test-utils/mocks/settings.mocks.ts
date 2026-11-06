import { vi } from "vitest";
import type { SettingsRepository } from "../../service/interfaces/settings.repository.js";
import type { SettingsService } from "../../service/settings.service.js";

export type Mocked<T> = { [K in keyof T]: T[K] & ReturnType<typeof vi.fn> };

export type MockedSettingsService = Mocked<Pick<SettingsService, "getSettings" | "getBusinessInfo" | "updateSettings">>;

export function createMockSettingsRepository(): Mocked<SettingsRepository> {
    return {
        find: vi.fn(async () => null),
        save: vi.fn(),
    } as Mocked<SettingsRepository>;
}

export function createMockSettingsService(): MockedSettingsService {
    return {
        getSettings: vi.fn(),
        getBusinessInfo: vi.fn(),
        updateSettings: vi.fn(),
    } as MockedSettingsService;
}
