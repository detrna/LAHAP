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
import { roundHalfUp } from "../../../shared/utils/decimal/decimal.js";
import { createQwenClient, executeWithParseRetry } from "../../qwen/index.js";
import { CONFIDENCE_THRESHOLD, MAX_IMAGE_BYTES, SUPPORTED_MIME_TYPES } from "./const.js";

const STOP_WORDS = new Set([
    "total",
    "subtotal",
    "sub total",
    "grand total",
    "diskon",
    "discount",
    "ppn",
    "pajak",
    "tax",
    "kembalian",
    "tunai",
    "cash",
    "bayar",
    "payment",
    "service",
    "service charge",
    "tip",
]);

const isStopWord = (name: string) => STOP_WORDS.has(name.toLowerCase().trim());

const quantitySchema = z.preprocess(v => {
    if (typeof v === "number") return v;
    if (typeof v === "string") {
        const m = v.match(/\d+(?:[.,]\d+)?/);
        if (m) return parseFloat(m[0].replace(",", "."));
    }
    return undefined;
}, z.number().positive());

const receiptOutputSchema = z.object({
    confidence: z.number().min(0).max(100),
    items: z.array(
        z.object({
            id: z.string(),
            name: z.string(),
            quantity: quantitySchema,
            unit: z.string(),
        }),
    ),
});

type ReceiptParsedOutput = z.infer<typeof receiptOutputSchema>;

export function buildPrompt(ingredients: readonly ReceiptIngredientInput[]): string {
    const knownList = ingredients.map(item => ({
        id: item.id,
        name: item.name,
        unit: item.unit,
    }));
    const first = ingredients[0] ?? {
        id: "00000000-0000-4000-8000-000000000001",
        name: "Dada Ayam Fillet",
        unit: "kg",
    };

    const example = {
        confidence: 90,
        items: [{ id: first.id, name: first.name, quantity: 2, unit: first.unit }],
    };

    return `
Extract purchasable line items from the receipt image that match the following known catalog ingredients:
${JSON.stringify(knownList, null, 2)}

For each matched line item on the receipt, return its matched catalog "id", "name", purchased "quantity", and "unit".
Skip any receipt line item that does not match one of the known catalog ingredients above.
Skip totals, subtotals, taxes, discounts, and payment lines entirely.
Do not include prices, price columns, or any monetary values in the output.
If the quantity is not shown on a matched line, use 1.
quantity must be a JSON number only (no unit, no text).
Also include a confidence field (0–100) reflecting how clearly the receipt items could be read.
Return only valid JSON, with no explanation, in exactly this shape:
${JSON.stringify(example, null, 2)}
`;
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

        const { data } = result;

        if (data.confidence < CONFIDENCE_THRESHOLD) {
            throw new LowConfidenceReceiptError(
                `low confidence extraction (${data.confidence}/100): image may be blurry or unreadable`,
            );
        }

        const knownById = new Map(ingredients.map(ingredient => [ingredient.id, ingredient]));
        const quantityById = new Map<string, number>();

        for (const item of data.items) {
            if (isStopWord(item.name)) continue;
            const known = knownById.get(item.id);
            if (known === undefined) continue;
            quantityById.set(known.id, roundHalfUp((quantityById.get(known.id) ?? 0) + item.quantity, 2));
        }

        const items: ReceiptExtractedItem[] = [];
        for (const [id, quantity] of quantityById) {
            const known = knownById.get(id);
            if (known === undefined) continue;
            items.push({
                id: known.id,
                name: known.name,
                quantity,
                unit: known.unit,
            });
        }

        if (items.length === 0) {
            throw new NoReceiptItemsFoundError("no matching receipt items found");
        }

        return { items };
    }
}
