export const SSE_PING = ": ping\n\n";

export const SSE_RETRY_MILLISECONDS = 5000;

export interface SseMessage {
    readonly event: string;
    readonly data: unknown;
}

export function formatSseEvent({ event, data }: SseMessage): string {
    return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export function formatSseRetry(milliseconds: number): string {
    return `retry: ${milliseconds}\n\n`;
}
