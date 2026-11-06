import { randomUUID } from "node:crypto";
import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../../../http/middleware/index.js";
import { formatSseRetry, SSE_PING, SSE_RETRY_MILLISECONDS } from "../domain/sse-format.js";
import type { RealtimeController } from "./realtime.controller.js";

const MAX_TIMER_MILLISECONDS = 2 ** 31 - 1;

export function stream(this: RealtimeController, req: Request, res: Response): void {
    const { user, tokenPayload } = req as AuthenticatedRequest;
    const connectionId = randomUUID();
    const write = (text: string): void => {
        if (!res.writableEnded) res.write(text);
    };

    this.realtimeService.connect({
        id: connectionId,
        userId: user.userId,
        role: user.role,
        send: write,
        bufferedBytes: () => res.writableLength,
        close: () => {
            res.end();
        },
    });

    res.status(200);
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();
    write(formatSseRetry(SSE_RETRY_MILLISECONDS));

    const pingTimer = setInterval(() => write(SSE_PING), this.pingIntervalSeconds * 1000);
    const expiryTimer = setTimeout(
        () => res.end(),
        Math.min(this.realtimeService.getMillisecondsUntil(tokenPayload.exp), MAX_TIMER_MILLISECONDS),
    );

    res.on("error", () => undefined);
    res.on("close", () => {
        clearInterval(pingTimer);
        clearTimeout(expiryTimer);
        this.realtimeService.disconnect(connectionId, user.userId);
    });
}
