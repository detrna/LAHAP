import { Buffer } from "node:buffer";
import { describe, expect, it } from "vitest";
import { createMockRequest, createMockResponse } from "../../../../tests/utils/mocks/express.js";
import { buildReceiptExtractResult } from "../test-utils/factory/ingredients.factory.js";
import { setupIngredientsController } from "../test-utils/setup/ingredients.setup.js";

const ID = "00000000-0000-4000-8000-000000000001";

describe("IngredientsController.extractReceipt (unit)", () => {
    it("passes the photo and its detected type to the service and answers the extracted batch update payload", async () => {
        const { ingredientsService, controller } = setupIngredientsController();
        const extracted = buildReceiptExtractResult({
            items: [{ id: ID, name: "Dada Ayam Fillet", unit: "kg", stock: 15 }],
        });
        ingredientsService.extractReceipt.mockResolvedValue(extracted);
        const image = Buffer.from("receipt");
        const req = createMockRequest();
        req.file = { buffer: image, mimetype: "image/jpeg" } as Express.Multer.File;
        const res = createMockResponse();

        await controller.extractReceipt(req, res);

        expect(ingredientsService.extractReceipt).toHaveBeenCalledWith({ image, mimeType: "image/jpeg" });
        expect(res.json).toHaveBeenCalledWith({ data: extracted });
    });
});
