import type { z } from "zod";

/**
 * Strips markdown code fences from model outputs.
 * Handles ```json ... ```, ``` ... ```, and surrounding whitespace or text.
 */
export function stripCodeFences(text: string): string {
    const trimmed = text.trim();
    // Case 1: The entire response is wrapped in code fences (e.g. ```json ... ```)
    const wholeBlock = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
    if (wholeBlock && wholeBlock[1] !== undefined) {
        return wholeBlock[1].trim();
    }
    // Case 2: A code fence is embedded inside explanatory text
    const embeddedBlock = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (embeddedBlock && embeddedBlock[1] !== undefined) {
        return embeddedBlock[1].trim();
    }
    return trimmed
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/, "")
        .trim();
}

/**
 * Strips code fences, parses JSON, and validates against a Zod schema.
 */
export function parseAndValidateJson<T>(rawText: string, schema: z.ZodType<T>): T {
    const cleaned = stripCodeFences(rawText);
    const parsed = JSON.parse(cleaned);
    return schema.parse(parsed);
}

export interface ExecuteWithParseRetryOptions {
    onParseFailure?: (err: unknown, attempt: number, rawText: string) => void;
}

/**
 * Calls a model completion function, parses and validates the JSON output.
 * If JSON.parse or Zod validation fails, retries once.
 */
export async function executeWithParseRetry<T>(
    callModel: () => Promise<string>,
    schema: z.ZodType<T>,
    options: ExecuteWithParseRetryOptions = {},
): Promise<{ data: T; rawText: string }> {
    let rawText = await callModel();
    try {
        const data = parseAndValidateJson(rawText, schema);
        return { data, rawText };
    } catch (firstError) {
        options.onParseFailure?.(firstError, 1, rawText);
        // Retry ONCE on parse or validation failure
        rawText = await callModel();
        try {
            const data = parseAndValidateJson(rawText, schema);
            return { data, rawText };
        } catch (secondError) {
            options.onParseFailure?.(secondError, 2, rawText);
            throw secondError;
        }
    }
}
