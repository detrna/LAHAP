import { Buffer } from "node:buffer";
import { describe, expect, it } from "vitest";
import { LowConfidenceError } from "../../../shared/ports/stock-level-estimator/stock-level-estimator.js";
import { buildIngredientRecord } from "../test-utils/factory/ingredients.factory.js";
import { setupIngredientsService } from "../test-utils/setup/ingredients.setup.js";
import { IngredientNotFoundError } from "./interfaces/ingredients.repository.js";

const ID = "00000000-0000-4000-8000-000000000001";
const IMAGE = Buffer.from("photo");

describe("IngredientsService.estimateStock (unit)", () => {
    it("returns the counted containers labelled with the ingredient's unit", async () => {
        const { repository, stockLevelEstimator, service } = setupIngredientsService();
        repository.findById.mockResolvedValue(buildIngredientRecord({ id: ID, name: "Minyak Goreng", unit: "liter" }));
        stockLevelEstimator.estimate.mockResolvedValue({
            item: { name: "Minyak Goreng", quantity: 4, unit: "bottle" },
        });

        const estimate = await service.estimateStock(ID, { image: IMAGE, mimeType: "image/png" });

        expect(estimate).toEqual({ ingredientId: ID, estimatedQuantity: 4, unit: "liter" });
    });

    it("sends the photo with the ingredient's name and unit to the estimator", async () => {
        const { repository, stockLevelEstimator, service } = setupIngredientsService();
        repository.findById.mockResolvedValue(buildIngredientRecord({ id: ID, name: "Air Galon", unit: "liter" }));

        await service.estimateStock(ID, { image: IMAGE, mimeType: "image/webp" });

        expect(repository.findById).toHaveBeenCalledWith(ID);
        expect(stockLevelEstimator.estimate).toHaveBeenCalledWith({
            image: IMAGE,
            mimeType: "image/webp",
            ingredient: { name: "Air Galon", unit: "liter" },
        });
    });

    it("returns 0 when every container is empty", async () => {
        const { repository, stockLevelEstimator, service } = setupIngredientsService();
        repository.findById.mockResolvedValue(buildIngredientRecord({ id: ID, unit: "ml" }));
        stockLevelEstimator.estimate.mockResolvedValue({ item: { name: "x", quantity: 0, unit: "ml" } });

        const estimate = await service.estimateStock(ID, { image: IMAGE, mimeType: "image/jpeg" });

        expect(estimate).toEqual({ ingredientId: ID, estimatedQuantity: 0, unit: "ml" });
    });

    it("throws IngredientNotFoundError without calling the estimator", async () => {
        const { stockLevelEstimator, service } = setupIngredientsService();

        await expect(service.estimateStock(ID, { image: IMAGE, mimeType: "image/png" })).rejects.toBeInstanceOf(
            IngredientNotFoundError,
        );
        expect(stockLevelEstimator.estimate).not.toHaveBeenCalled();
    });

    it("rethrows the estimator's error as is", async () => {
        const { repository, stockLevelEstimator, service } = setupIngredientsService();
        repository.findById.mockResolvedValue(buildIngredientRecord({ id: ID }));
        const error = new LowConfidenceError("low confidence estimation");
        stockLevelEstimator.estimate.mockRejectedValue(error);

        await expect(service.estimateStock(ID, { image: IMAGE, mimeType: "image/png" })).rejects.toBe(error);
    });

    it("saves nothing", async () => {
        const { repository, service } = setupIngredientsService();
        repository.findById.mockResolvedValue(buildIngredientRecord({ id: ID }));

        await service.estimateStock(ID, { image: IMAGE, mimeType: "image/png" });

        expect(repository.updateMany).not.toHaveBeenCalled();
        expect(repository.createMany).not.toHaveBeenCalled();
    });
});
