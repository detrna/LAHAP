import type OpenAI from "openai";
import { z } from "zod";
import type { StockLevelEstimatorConfig } from "../../../config/stock-level-estimator.js";
import {
    ErrorContainerNotVisible,
    ErrorLowConfidence,
    InvalidStockImageError,
    StockLevelEstimationError,
    StockLevelEstimatorProviderError,
    type StockLevelEstimateInput,
    type StockLevelEstimateOutput,
    type StockLevelEstimator,
} from "../../../shared/ports/stock-level-estimator/stock-level-estimator.js";
import { createQwenClient, executeWithParseRetry } from "../../qwen/index.js";
import { MAX_IMAGE_BYTES, SUPPORTED_MIME_TYPES } from "./const.js";
import { calculateBottles, sumFills } from "./rounding.js";

const fillValueSchema = z.preprocess(val => {
    if (typeof val === "number") return val;
    if (typeof val === "string") {
        const parsed = parseFloat(val.trim());
        if (!isNaN(parsed)) return parsed;
    }
    return val;
}, z.number().min(0).max(1));

const stockLevelOutputSchema = z.object({
    fills: z.array(fillValueSchema),
    confidence: z.enum(["low", "medium", "high"]).default("high"),
});

type StockLevelParsedOutput = z.infer<typeof stockLevelOutputSchema>;

export function buildPrompt(ingredientName: string): string {
    return `This photo shows containers of ${ingredientName}. For each container, estimate how full it is as a number from 0 to 1 (0 = empty, 1 = full). Count only containers of ${ingredientName}. Return only valid JSON, no explanation: {"fills":[1,1,1,0.5],"confidence":"high"}. If you cannot see the liquid level clearly, set confidence to "low".`;
}

type ImageUrl = OpenAI.Chat.Completions.ChatCompletionContentPartImage["image_url"];

export interface QwenStockLevelEstimatorOptions {
    onUsage?: (usage: OpenAI.Completions.CompletionUsage | undefined) => void;
    tolerance?: number | undefined;
}

export class QwenStockLevelEstimator implements StockLevelEstimator {
    private readonly client: OpenAI;
    private readonly model: string;
    private readonly tolerance: number;
    private readonly onUsage?: QwenStockLevelEstimatorOptions["onUsage"];

    constructor(config: StockLevelEstimatorConfig, options: QwenStockLevelEstimatorOptions = {}) {
        this.client = createQwenClient({
            apiKey: config.API_KEY,
            baseURL: config.BASE_URL,
            timeoutMs: config.TIMEOUT_MS,
            maxRetries: config.MAX_RETRIES,
        });
        this.model = config.MODEL;
        this.tolerance = options.tolerance ?? config.TOLERANCE ?? 0.15;
        this.onUsage = options.onUsage;
    }

    async estimate(input: StockLevelEstimateInput): Promise<StockLevelEstimateOutput> {
        const { image, mimeType, ingredient } = input;

        if (!SUPPORTED_MIME_TYPES.has(mimeType)) {
            throw new InvalidStockImageError(`Unsupported image type: ${mimeType}`);
        }
        if (image.length === 0) {
            throw new InvalidStockImageError("Image is empty");
        }
        if (image.length > MAX_IMAGE_BYTES) {
            throw new InvalidStockImageError("Image is too large");
        }

        const dataUrl = `data:${mimeType};base64,${image.toString("base64")}`;
        const promptText = buildPrompt(ingredient.name);

        const callModel = async (): Promise<string> => {
            let completion: OpenAI.Chat.Completions.ChatCompletion;
            try {
                completion = await this.client.chat.completions.create({
                    model: this.model,
                    max_tokens: 2048,
                    messages: [
                        {
                            role: "user",
                            content: [
                                {
                                    type: "image_url",
                                    image_url: {
                                        url: dataUrl,
                                        min_pixels: 32 * 32 * 3,
                                        max_pixels: 32 * 32 * 8192,
                                    } as ImageUrl,
                                },
                                { type: "text", text: promptText },
                            ],
                        },
                    ],
                });
            } catch (cause) {
                throw new StockLevelEstimatorProviderError("Stock level estimator provider request failed", { cause });
            }

            this.onUsage?.(completion.usage);

            const content = completion.choices[0]?.message.content;
            if (!content) {
                throw new StockLevelEstimatorProviderError("Stock level estimator provider returned no content");
            }

            return content;
        };

        let result: { data: StockLevelParsedOutput; rawText: string };
        try {
            result = await executeWithParseRetry(callModel, stockLevelOutputSchema);
        } catch (cause) {
            if (cause instanceof StockLevelEstimatorProviderError || cause instanceof InvalidStockImageError) {
                throw cause;
            }
            throw new StockLevelEstimationError(
                "Stock level estimator output was not valid JSON or failed schema validation",
                { cause },
            );
        }

        const { data } = result;

        // If no containers were identified
        if (data.fills.length === 0) {
            throw new ErrorContainerNotVisible(`No containers of '${ingredient.name}' visible in image`);
        }

        // If confidence is low, handle error inside infrastructure (just like ReceiptExtractor).
        // If containers are visible but completely empty (fills all 0), the model may flag low confidence
        // because no liquid level is visible; empty containers count as 0.
        const isAllEmpty = data.fills.every(fill => fill === 0);
        if (data.confidence === "low" && !isAllEmpty) {
            throw new ErrorLowConfidence("Low confidence estimation: liquid level is not clearly visible in the image");
        }

        // Convert fills into whole quantity of bottles using tolerance
        const total = sumFills(data.fills);
        const quantity = calculateBottles(total, this.tolerance);

        return {
            item: {
                name: ingredient.name,
                quantity,
                unit: ingredient.unit,
            },
        };
    }
}
