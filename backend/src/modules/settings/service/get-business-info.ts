import type { BusinessInfo } from "../domain/settings.domain.js";
import type { SettingsService } from "./settings.service.js";

export async function getBusinessInfo(this: SettingsService): Promise<BusinessInfo> {
    const { name, address, latitude, longitude, whatsappNumber } = await this.getSettings();
    return { name, address, latitude, longitude, whatsappNumber };
}
