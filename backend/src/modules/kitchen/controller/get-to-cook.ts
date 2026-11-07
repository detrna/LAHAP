import type { Request, Response } from "express";
import { createSuccessResponse } from "../../../shared/response/index.js";
import type { ToCookQuery } from "../schema/kitchen.schemas.js";
import type { KitchenController } from "./kitchen.controller.js";

export async function getToCook(this: KitchenController, req: Request, res: Response): Promise<void> {
    const query = req.query as unknown as ToCookQuery;
    res.json(createSuccessResponse(await this.kitchenService.getToCook(query)));
}
