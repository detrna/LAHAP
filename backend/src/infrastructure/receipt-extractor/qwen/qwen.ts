import type OpenAI from "openai";
import { z } from "zod";
import type { ReceiptExtractorConfig } from "../../../config/receipt-extractor.js";
import {
    InvalidReceiptImageError,
    LowConfidenceReceiptError,
    NoReceiptItemsFoundError,
    ReceiptExtractionError,
    ReceiptExtractorProviderError,
    type ReceiptData,
    type ReceiptExtractedItem,
    type ReceiptExtractInput,
    type ReceiptExtractor,
    type ReceiptIngredientInput,
} from "../../../shared/ports/receipt-extractor/receipt-extractor.js";
import { createQwenClient, executeWithParseRetry } from "../../qwen/index.js";
import { CONFIDENCE_THRESHOLD, MAX_IMAGE_BYTES, SUPPORTED_MIME_TYPES } from "./const.js";

const quantitySchema = z.preprocess(value => {
    if (typeof value === "string" && /^\s*\d+(?:[.,]\d+)?\s*$/.test(value)) {
        return Number(value.trim().replace(",", "."));
    }
    return value;
}, z.number().positive().finite());

const receiptLineSchema = z.object({
    id: z.string(),
    quantity: quantitySchema,
    unit: z
        .string()
        .nullish()
        .transform(unit => unit ?? ""),
});

const receiptOutputSchema = z.object({
    confidence: z.number().min(0).max(100),
    items: z.array(z.unknown()),
});

type ReceiptParsedOutput = z.infer<typeof receiptOutputSchema>;

export function buildPrompt(ingredients: readonly ReceiptIngredientInput[]): string {
    const knownList = ingredients.map(({ id, name, unit }) => ({ id, name, unit }));
    const example = {
        confidence: 90,
        items: [
            {
                name: "BWG MRH",
                id: ingredients[0]?.id ?? "00000000-0000-4000-8000-000000000001",
                quantity: 500,
                unit: "gr",
            },
        ],
    };

    return `
Extract the purchased line items from the receipt image and match each one to one of these known ingredients:
${JSON.stringify(knownList, null, 2)}

For each purchased line on the receipt, in order, return:
- "name": the item name exactly as printed on the receipt
- "id": the id of the known ingredient that this printed name refers to, copied exactly from the list above, or null when it is none of them
- "quantity": the purchased quantity as printed on the receipt, as a JSON number with a dot as the decimal separator and no thousands separators
- "unit": the unit printed next to the quantity on the receipt, exactly as printed (e.g. "kg", "gr", "L", "ml", "ikat", "btr"), or "" when no unit is printed

Decide the id from the printed name of that same line only. Match by meaning, including abbreviations and different wording (e.g. "BWG MRH" is "Bawang Merah"), but never pick an ingredient whose name means a different product.
Do not convert units: report the quantity and unit printed on the receipt, even when the known ingredient uses another unit.
Skip totals, subtotals, taxes, discounts, and payment lines. Do not include prices.
If no quantity is shown on a matched line, use 1.
Include a confidence field (0–100) reflecting how clearly the receipt items could be read.
Return only valid JSON, with no explanation, in exactly this shape:
${JSON.stringify(example, null, 2)}
`;
}

function toReceiptLines(data: ReceiptParsedOutput, knownIds: ReadonlySet<string>): ReceiptExtractedItem[] {
    return data.items.flatMap(item => {
        const parsed = receiptLineSchema.safeParse(item);
        if (!parsed.success || !knownIds.has(parsed.data.id)) return [];
        return [{ id: parsed.data.id, quantity: parsed.data.quantity, printedUnit: parsed.data.unit }];
    });
}

type ImageUrl = OpenAI.Chat.Completions.ChatCompletionContentPartImage["image_url"];

export interface QwenReceiptExtractorOptions {
    onUsage?: (usage: OpenAI.Completions.CompletionUsage | undefined) => void;
}

export class QwenReceiptExtractor implements ReceiptExtractor {
    private readonly client: OpenAI;
    private readonly model: string;
    private readonly onUsage?: QwenReceiptExtractorOptions["onUsage"];

    constructor(config: ReceiptExtractorConfig, options: QwenReceiptExtractorOptions = {}) {
        this.client = createQwenClient({
            apiKey: config.API_KEY,
            baseURL: config.BASE_URL,
            timeoutMs: config.TIMEOUT_MS,
            maxRetries: config.MAX_RETRIES,
        });
        this.model = config.MODEL;
        this.onUsage = options.onUsage;
    }

    async extract(input: ReceiptExtractInput): Promise<ReceiptData> {
        const { image, mimeType, ingredients } = input;

        if (!SUPPORTED_MIME_TYPES.has(mimeType)) {
            throw new InvalidReceiptImageError(`unsupported image type: ${mimeType}`);
        }
        if (image.length === 0) {
            throw new InvalidReceiptImageError("image is empty");
        }
        if (image.length > MAX_IMAGE_BYTES) {
            throw new InvalidReceiptImageError("image is too large");
        }
        if (ingredients.length === 0) {
            throw new NoReceiptItemsFoundError("no items found: no ingredients configured");
        }

        const dataUrl = `data:${mimeType};base64,${image.toString("base64")}`;
        const promptText = buildPrompt(ingredients);

        const callModel = async (): Promise<string> => {
            let completion: OpenAI.Chat.Completions.ChatCompletion;
            try {
                completion = await this.client.chat.completions.create({
                    model: this.model,
                    max_tokens: 4096,
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
                throw new ReceiptExtractorProviderError("receipt extractor provider request failed", { cause });
            }

            this.onUsage?.(completion.usage);

            const content = completion.choices[0]?.message.content;
            if (!content) {
                throw new ReceiptExtractorProviderError("receipt extractor provider returned no content");
            }

            return content;
        };

        let result: { data: ReceiptParsedOutput; rawText: string };
        try {
            result = await executeWithParseRetry(callModel, receiptOutputSchema);
        } catch (cause) {
            if (cause instanceof ReceiptExtractorProviderError || cause instanceof InvalidReceiptImageError) {
                throw cause;
            }
            throw new ReceiptExtractionError("receipt extractor output was not valid receipt data", { cause });
        }

        if (result.data.confidence < CONFIDENCE_THRESHOLD) {
            throw new LowConfidenceReceiptError(
                `low confidence extraction (${result.data.confidence}/100): image may be blurry or unreadable`,
            );
        }

        const items = toReceiptLines(result.data, new Set(ingredients.map(ingredient => ingredient.id)));

        if (items.length === 0) {
            throw new NoReceiptItemsFoundError("no matching receipt items found");
        }

        return { items };
    }
}
