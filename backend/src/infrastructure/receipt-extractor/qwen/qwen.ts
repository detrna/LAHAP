import OpenAI from "openai";
import { z } from "zod";
import type { ReceiptExtractorConfig } from "../../../config/receipt-extractor.js";
import { CONFIDENCE_THRESHOLD, MAX_IMAGE_BYTES, SUPPORTED_MIME_TYPES } from "./const.js";
import {
    InvalidReceiptImageError,
    LowConfidenceReceiptError,
    NoReceiptItemsFoundError,
    ReceiptExtractionError,
    ReceiptExtractorProviderError,
} from "../../../shared/ports/receipt-extractor/errors.js";
import type { ReceiptData, ReceiptExtractor } from "../../../shared/ports/receipt-extractor/receipt-extractor.js";

type NonEmptyArray<T> = [T, ...T[]];

// Lines that appear on receipts but are not purchasable items
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

const quantity = z.preprocess(v => {
    if (typeof v === "number") return v;
    if (typeof v === "string") {
        const m = v.match(/\d+(?:[.,]\d+)?/);
        if (m) return parseFloat(m[0].replace(",", "."));
    }
    return undefined;
}, z.number().positive());

function buildReceiptSchema(units: NonEmptyArray<string>) {
    return z.object({
        confidence: z.number().min(0).max(100),
        items: z.array(
            z.object({
                name: z.string(),
                quantity: quantity,
                unit: z.enum(units).catch("BUAH"),
            }),
        ),
    });
}

function buildPrompt(units: NonEmptyArray<string>): string {
    // JSON.stringify escapes quotes so a unit code can't break out of the prompt
    const allowed = units.map(u => JSON.stringify(u)).join(", ");

    const example = {
        confidence: 90,
        items: [
            { name: "Indomie Goreng", quantity: 2, unit: units[0] },
            { name: "Tepung Terigu", quantity: 1, unit: units[0] },
        ],
    };

    return `
Extract every purchasable line item from the receipt image. For each item return its name, quantity, and unit.
Only include actual products or goods — skip totals, subtotals, taxes, discounts, and payment lines entirely.
Do not include prices, price columns, or any monetary values in the output.
Do not omit or fabricate items. Replace any single blurry or obscured character with a question mark (?).
If the quantity is not shown, use 1.
unit must be exactly one of: ${allowed}. If the unit is not shown, infer the most appropriate one from the list.
quantity must be a JSON number only (no unit, no text). Put the unit in "unit".
Also include a confidence field (0–100) reflecting how clearly the receipt items could be read.
Return only valid JSON, with no explanation, in exactly this shape:
${JSON.stringify(example, null, 2)}
`;
}

// The model may wrap JSON in code fences, so strip them before parsing
function parseReceiptData(text: string, units: NonEmptyArray<string>): { confidence: number; data: ReceiptData } {
    const cleaned = text.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
    const parsed = buildReceiptSchema(units).parse(JSON.parse(cleaned));
    return { confidence: parsed.confidence, data: { items: parsed.items } };
}

type ImageUrl = OpenAI.Chat.Completions.ChatCompletionContentPartImage["image_url"];

export interface QwenReceiptExtractorOptions {
    /** Called with real token counts after each request, useful for cost checking */
    onUsage?: (usage: OpenAI.Completions.CompletionUsage | undefined) => void;
}

export class QwenReceiptExtractor implements ReceiptExtractor {
    private readonly client: OpenAI;
    private readonly model: string;
    private readonly onUsage?: QwenReceiptExtractorOptions["onUsage"];

    constructor(config: ReceiptExtractorConfig, options: QwenReceiptExtractorOptions = {}) {
        if (!config.API_KEY) {
            throw new Error("DASHSCOPE_API_KEY is not set");
        }

        this.client = new OpenAI({
            apiKey: config.API_KEY,
            baseURL: config.BASE_URL,
            timeout: config.TIMEOUT_MS,
            maxRetries: config.MAX_RETRIES,
        });
        this.model = config.MODEL;
        this.onUsage = options.onUsage;
    }

    async extract(image: Buffer, mimeType: string, units: [string, ...string[]]): Promise<ReceiptData> {
        if (!SUPPORTED_MIME_TYPES.has(mimeType)) {
            throw new InvalidReceiptImageError(`Unsupported image type: ${mimeType}`);
        }
        if (image.length === 0) {
            throw new InvalidReceiptImageError("Image is empty");
        }
        if (image.length > MAX_IMAGE_BYTES) {
            throw new InvalidReceiptImageError("Image is too large");
        }

        // Send the bytes as a Base64 data URL so no public URL is needed
        const dataUrl = `data:${mimeType};base64,${image.toString("base64")}`;

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
                                    // Non-standard fields, so the SDK types need a cast
                                    min_pixels: 32 * 32 * 3,
                                    max_pixels: 32 * 32 * 8192,
                                } as ImageUrl,
                            },
                            { type: "text", text: buildPrompt(units) },
                        ],
                    },
                ],
            });
        } catch (cause) {
            throw new ReceiptExtractorProviderError("Receipt extractor provider request failed", { cause });
        }

        this.onUsage?.(completion.usage);

        const content = completion.choices[0]?.message.content;
        if (!content) {
            throw new ReceiptExtractorProviderError("Receipt extractor provider returned no content");
        }

        let confidence: number;
        let data: ReceiptData;
        try {
            ({ confidence, data } = parseReceiptData(content, units));
        } catch (cause) {
            throw new ReceiptExtractionError("Receipt extractor output was not valid receipt data", { cause });
        }

        // Confidence < threshold means the image was too blurry or unreadable
        if (confidence < CONFIDENCE_THRESHOLD) {
            throw new LowConfidenceReceiptError(
                `Low confidence extraction (${confidence}/100): image may be blurry or unreadable`,
            );
        }

        // Strip total/tax/discount lines — not purchasable items
        const filtered = { items: data.items.filter(item => !isStopWord(item.name)) };

        // A successful parse with no items means the image isn't a receipt
        if (filtered.items.length === 0) {
            throw new NoReceiptItemsFoundError("No items found: image may not be a receipt");
        }

        return filtered;
    }
}
