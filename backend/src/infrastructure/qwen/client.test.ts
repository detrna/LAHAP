import { describe, expect, it } from "vitest";
import { createQwenClient, DEFAULT_QWEN_BASE_URL } from "./client.js";

describe("createQwenClient", () => {
    it("creates an OpenAI client instance with provided config", () => {
        const client = createQwenClient({
            apiKey: "test-api-key",
            baseURL: "https://custom.endpoint.com/v1",
            timeoutMs: 15_000,
            maxRetries: 2,
        });

        expect(client).toBeDefined();
        expect(client.baseURL).toBe("https://custom.endpoint.com/v1");
    });

    it("uses DEFAULT_QWEN_BASE_URL when baseURL is not provided", () => {
        const client = createQwenClient({
            apiKey: "test-api-key",
        });

        expect(client.baseURL).toBe(DEFAULT_QWEN_BASE_URL);
    });

    it("throws when API key is missing and DASHSCOPE_API_KEY env is not set", () => {
        const originalEnv = process.env["DASHSCOPE_API_KEY"];
        delete process.env["DASHSCOPE_API_KEY"];

        try {
            expect(() => createQwenClient({})).toThrow("DASHSCOPE_API_KEY is not set");
        } finally {
            if (originalEnv) {
                process.env["DASHSCOPE_API_KEY"] = originalEnv;
            }
        }
    });
});
