import { TierNotFoundError } from "./interfaces/tiers.repository.js";
import type { TiersService } from "./tiers.service.js";

export async function deleteTier(this: TiersService, id: string): Promise<void> {
    if (!(await this.tiersRepository.deleteTier(id))) throw new TierNotFoundError(id);
}
