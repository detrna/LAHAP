import OpenAI from "openai";

export const DEFAULT_QWEN_BASE_URL = "https://ap-southeast-1.maas.qwencloudapi.com/compatible-mode/v1";

export interface QwenClientConfig {
    apiKey?: string | undefined;
    baseURL?: string | undefined;
    timeoutMs?: number | undefined;
    maxRetries?: number | undefined;
}

export function createQwenClient(config: QwenClientConfig): OpenAI {
    const apiKey = config.apiKey || process.env["DASHSCOPE_API_KEY"];
    if (!apiKey) {
        throw new Error("DASHSCOPE_API_KEY is not set");
    }

    return new OpenAI({
        apiKey,
        baseURL: config.baseURL || DEFAULT_QWEN_BASE_URL,
        timeout: config.timeoutMs ?? 30_000,
        maxRetries: config.maxRetries ?? 1,
    });
}
