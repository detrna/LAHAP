import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { executeWithParseRetry, parseAndValidateJson, stripCodeFences } from "./json-parser.js";

describe("stripCodeFences", () => {
    it("strips standard ```json ... ``` fences", () => {
        const input = '```json\n{"name":"oil","fills":[1,0.5]}\n```';
        expect(stripCodeFences(input)).toBe('{"name":"oil","fills":[1,0.5]}');
    });

    it("strips ``` ... ``` fences without json tag", () => {
        const input = '```\n{"fills":[1,1]}\n```';
        expect(stripCodeFences(input)).toBe('{"fills":[1,1]}');
    });

    it("strips fences with leading and trailing whitespace", () => {
        const input = '   \n\n```json\n{"fills":[0.75]}\n```\n\n  ';
        expect(stripCodeFences(input)).toBe('{"fills":[0.75]}');
    });

    it("returns plain JSON as-is if no fences exist", () => {
        const input = '{"fills":[1,0.5],"confidence":"high"}';
        expect(stripCodeFences(input)).toBe('{"fills":[1,0.5],"confidence":"high"}');
    });

    it("extracts json from embedded markdown fences surrounded by conversational text", () => {
        const input =
            'Here is the estimation you requested:\n```json\n{"fills":[0.5],"confidence":"medium"}\n```\nHope that helps!';
        expect(stripCodeFences(input)).toBe('{"fills":[0.5],"confidence":"medium"}');
    });

    it("strips an opening ```json fence that is never closed", () => {
        const input = '```json\n{\n"items": [],\n"confidence": 90\n}';
        expect(stripCodeFences(input)).toBe('{\n"items": [],\n"confidence": 90\n}');
    });

    it("strips an unclosed opening fence without a json tag and trailing whitespace", () => {
        const input = '\n```\n{"fills":[1]}\n  ';
        expect(stripCodeFences(input)).toBe('{"fills":[1]}');
    });

    it("strips a closing fence that has no opening fence", () => {
        const input = '{"fills":[1]}\n```';
        expect(stripCodeFences(input)).toBe('{"fills":[1]}');
    });
});

describe("parseAndValidateJson", () => {
    const testSchema = z.object({
        fills: z.array(z.number()),
        confidence: z.enum(["low", "medium", "high"]),
    });

    it("parses and validates JSON wrapped in code fences", () => {
        const input = '```json\n{"fills":[1, 0.5],"confidence":"high"}\n```';
        const result = parseAndValidateJson(input, testSchema);
        expect(result).toEqual({ fills: [1, 0.5], confidence: "high" });
    });

    it("parses JSON whose opening code fence is never closed", () => {
        const input = '```json\n{\n"fills":[1, 0.5],\n"confidence":"high"\n}';
        const result = parseAndValidateJson(input, testSchema);
        expect(result).toEqual({ fills: [1, 0.5], confidence: "high" });
    });

    it("throws on malformed JSON syntax", () => {
        const input = "```json\n{fills:[1, 0.5]\n```";
        expect(() => parseAndValidateJson(input, testSchema)).toThrow(SyntaxError);
    });

    it("throws on Zod validation failure", () => {
        const input = '```json\n{"fills":["not-a-number"],"confidence":"unknown"}\n```';
        expect(() => parseAndValidateJson(input, testSchema)).toThrow(z.ZodError);
    });
});

describe("executeWithParseRetry", () => {
    const testSchema = z.object({
        fills: z.array(z.number()),
        confidence: z.enum(["low", "medium", "high"]),
    });

    it("succeeds on the first attempt without retrying", async () => {
        const callModel = vi.fn().mockResolvedValue('{"fills":[1,1],"confidence":"high"}');
        const onParseFailure = vi.fn();

        const result = await executeWithParseRetry(callModel, testSchema, { onParseFailure });

        expect(callModel).toHaveBeenCalledTimes(1);
        expect(onParseFailure).not.toHaveBeenCalled();
        expect(result.data).toEqual({ fills: [1, 1], confidence: "high" });
    });

    it("retries once when the first response has invalid JSON syntax and succeeds on second attempt", async () => {
        const callModel = vi
            .fn()
            .mockResolvedValueOnce("Invalid JSON text")
            .mockResolvedValueOnce('{"fills":[0.5],"confidence":"medium"}');
        const onParseFailure = vi.fn();

        const result = await executeWithParseRetry(callModel, testSchema, { onParseFailure });

        expect(callModel).toHaveBeenCalledTimes(2);
        expect(onParseFailure).toHaveBeenCalledTimes(1);
        expect(result.data).toEqual({ fills: [0.5], confidence: "medium" });
    });

    it("retries once when the first response fails Zod schema validation and succeeds on second attempt", async () => {
        const callModel = vi
            .fn()
            .mockResolvedValueOnce('{"fills":["invalid"],"confidence":"high"}')
            .mockResolvedValueOnce('{"fills":[1],"confidence":"high"}');
        const onParseFailure = vi.fn();

        const result = await executeWithParseRetry(callModel, testSchema, { onParseFailure });

        expect(callModel).toHaveBeenCalledTimes(2);
        expect(onParseFailure).toHaveBeenCalledTimes(1);
        expect(result.data).toEqual({ fills: [1], confidence: "high" });
    });

    it("throws when both the first and second attempts fail", async () => {
        const callModel = vi.fn().mockResolvedValueOnce("broken 1").mockResolvedValueOnce("broken 2");
        const onParseFailure = vi.fn();

        await expect(executeWithParseRetry(callModel, testSchema, { onParseFailure })).rejects.toThrow();
        expect(callModel).toHaveBeenCalledTimes(2);
        expect(onParseFailure).toHaveBeenCalledTimes(2);
    });
});
