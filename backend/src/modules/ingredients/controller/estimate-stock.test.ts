import { Buffer } from "node:buffer";
import { describe, expect, it } from "vitest";
import { createMockRequest, createMockResponse } from "../../../../tests/utils/mocks/express.js";
import { buildPhotoEstimate } from "../test-utils/factory/ingredients.factory.js";
import { setupIngredientsController } from "../test-utils/setup/ingredients.setup.js";

const ID = "00000000-0000-4000-8000-000000000001";

describe("IngredientsController.estimateStock (unit)", () => {
    it("passes the id, the photo and its detected type, and answers the estimate", async () => {
        const { ingredientsService, controller } = setupIngredientsController();
        const estimate = buildPhotoEstimate({ ingredientId: ID, estimatedQuantity: 3, unit: "liter" });
        ingredientsService.estimateStock.mockResolvedValue(estimate);
        const image = Buffer.from("photo");
        const req = createMockRequest({ params: { id: ID } });
        req.file = { buffer: image, mimetype: "image/png" } as Express.Multer.File;
        const res = createMockResponse();

        await controller.estimateStock(req, res);

        expect(ingredientsService.estimateStock).toHaveBeenCalledWith(ID, { image, mimeType: "image/png" });
        expect(res.json).toHaveBeenCalledWith({ data: estimate });
    });
});
