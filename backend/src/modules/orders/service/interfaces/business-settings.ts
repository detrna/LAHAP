import type { Settings } from "../../../settings/domain/settings.domain.js";

export interface BusinessSettings {
    getSettings(): Promise<Settings>;
}
