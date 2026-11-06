import { describe, expect, it } from "vitest";
import { formatSseEvent, formatSseRetry, SSE_PING } from "./sse-format.js";

describe("sse-format", () => {
    it("writes an event as an event line, one data line and a blank line", () => {
        expect(formatSseEvent({ event: "slot.status", data: { orderId: "o-1" } })).toBe(
            'event: slot.status\ndata: {"orderId":"o-1"}\n\n',
        );
    });

    it("keeps newlines inside strings on the single data line", () => {
        const text = formatSseEvent({ event: "notification", data: { message: "line one\nline two" } });

        expect(text).toBe('event: notification\ndata: {"message":"line one\\nline two"}\n\n');
        expect(text.split("\n")).toHaveLength(4);
    });

    it("writes a ping as a comment", () => {
        expect(SSE_PING).toBe(": ping\n\n");
    });

    it("writes a reconnect hint", () => {
        expect(formatSseRetry(5000)).toBe("retry: 5000\n\n");
    });
});
