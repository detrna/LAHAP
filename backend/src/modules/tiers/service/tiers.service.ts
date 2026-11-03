import type { TiersRepository } from "./interfaces/tiers.repository.js";

export class TiersService {
    constructor(readonly tiersRepository: TiersRepository) {}
}
