import type { TiersService } from "../service/tiers.service.js";

export class TiersController {
    constructor(readonly tiersService: TiersService) {}
}
