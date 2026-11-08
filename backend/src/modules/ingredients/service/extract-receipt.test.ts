import { Buffer } from "node:buffer";
import { describe, expect, it } from "vitest";
import {
    LowConfidenceReceiptError,
    NoReceiptItemsFoundError,
} from "../../../shared/ports/receipt-extractor/receipt-extractor.js";
import { buildIngredientRecord } from "../test-utils/factory/ingredients.factory.js";
import { setupIngredientsService } from "../test-utils/setup/ingredients.setup.js";

const ID_1 = "00000000-0000-4000-8000-000000000001";
const ID_2 = "00000000-0000-4000-8000-000000000002";
const IMAGE = Buffer.from("receipt-photo");

describe("IngredientsService.extractReceipt (unit)", () => {
    it("sends the photo and known ingredients to the extractor and returns new total stock per matched item", async () => {
        const { repository, receiptExtractor, service } = setupIngredientsService();
        repository.findAll.mockResolvedValue([
            buildIngredientRecord({ id: ID_1, name: "Dada Ayam Fillet", unit: "kg", stock: 4.5 }),
            buildIngredientRecord({ id: ID_2, name: "Minyak Zaitun", unit: "liter", stock: 2 }),
        ]);
        receiptExtractor.extract.mockResolvedValue({
            items: [
                { id: ID_1, name: "Dada Ayam Fillet", quantity: 10, unit: "kg" },
                { id: ID_2, name: "Minyak Zaitun", quantity: 5.25, unit: "liter" },
            ],
        });

        const result = await service.extractReceipt({ image: IMAGE, mimeType: "image/png" });

        expect(repository.findAll).toHaveBeenCalledOnce();
        expect(receiptExtractor.extract).toHaveBeenCalledWith({
            image: IMAGE,
            mimeType: "image/png",
            ingredients: [
                { id: ID_1, name: "Dada Ayam Fillet", unit: "kg" },
                { id: ID_2, name: "Minyak Zaitun", unit: "liter" },
            ],
        });
        expect(result).toEqual({
            items: [
                { id: ID_1, name: "Dada Ayam Fillet", unit: "kg", stock: 14.5 },
                { id: ID_2, name: "Minyak Zaitun", unit: "liter", stock: 7.25 },
            ],
        });
    });

    it("sums quantities for duplicate ingredient ids and ignores unknown ids", async () => {
        const { repository, receiptExtractor, service } = setupIngredientsService();
        repository.findAll.mockResolvedValue([
            buildIngredientRecord({ id: ID_1, name: "Dada Ayam Fillet", unit: "kg", stock: 1.1 }),
        ]);
        receiptExtractor.extract.mockResolvedValue({
            items: [
                { id: ID_1, name: "Dada Ayam", quantity: 2.15, unit: "kg" },
                { id: ID_1, name: "Dada Ayam Fillet", quantity: 3.1, unit: "kg" },
                { id: "00000000-0000-4000-8000-000000000999", name: "Unknown", quantity: 5, unit: "kg" },
            ],
        });

        const result = await service.extractReceipt({ image: IMAGE, mimeType: "image/jpeg" });

        expect(result).toEqual({
            items: [{ id: ID_1, name: "Dada Ayam Fillet", unit: "kg", stock: 6.35 }],
        });
    });

    it("throws NoReceiptItemsFoundError when no extracted item matches a known ingredient", async () => {
        const { repository, receiptExtractor, service } = setupIngredientsService();
        repository.findAll.mockResolvedValue([buildIngredientRecord({ id: ID_1 })]);
        receiptExtractor.extract.mockResolvedValue({
            items: [{ id: "00000000-0000-4000-8000-000000000999", name: "Unknown", quantity: 2, unit: "kg" }],
        });

        await expect(service.extractReceipt({ image: IMAGE, mimeType: "image/png" })).rejects.toBeInstanceOf(
            NoReceiptItemsFoundError,
        );
    });

    it("rethrows the extractor's error as is", async () => {
        const { repository, receiptExtractor, service } = setupIngredientsService();
        repository.findAll.mockResolvedValue([buildIngredientRecord({ id: ID_1 })]);
        const error = new LowConfidenceReceiptError("low confidence receipt");
        receiptExtractor.extract.mockRejectedValue(error);

        await expect(service.extractReceipt({ image: IMAGE, mimeType: "image/png" })).rejects.toBe(error);
    });

    it("saves nothing", async () => {
        const { repository, receiptExtractor, service } = setupIngredientsService();
        repository.findAll.mockResolvedValue([buildIngredientRecord({ id: ID_1, stock: 5 })]);
        receiptExtractor.extract.mockResolvedValue({
            items: [{ id: ID_1, name: "Dada Ayam", quantity: 2, unit: "kg" }],
        });

        await service.extractReceipt({ image: IMAGE, mimeType: "image/png" });

        expect(repository.updateMany).not.toHaveBeenCalled();
        expect(repository.createMany).not.toHaveBeenCalled();
    });
});
