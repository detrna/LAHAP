import { EventEmitter } from "node:events";
import type { Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { createMockNext, createMockRequest } from "../../../tests/utils/mocks/express.js";
import { createMockLogger } from "../../../tests/utils/mocks/logger.js";
import { REQUEST_ID_HEADER, requestLogger, resolveRequestId } from "./request-logger.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function createClosableResponse(statusCode = 200, writableFinished = true) {
    return Object.assign(new EventEmitter(), {
        statusCode,
        writableFinished,
        setHeader: vi.fn(),
    }) as unknown as Response & EventEmitter & { setHeader: ReturnType<typeof vi.fn> };
}

describe("resolveRequestId", () => {
    it("reuses a well-formed incoming id", () => {
        expect(resolveRequestId("abc-123_DEF")).toBe("abc-123_DEF");
        expect(resolveRequestId(["first-id", "second-id"])).toBe("first-id");
    });

    it.each([undefined, "", "has space", "a".repeat(65), "<script>", "id\nforged-line"])(
        "generates a UUID for %j",
        header => {
            expect(resolveRequestId(header)).toMatch(UUID);
        },
    );
});

describe("requestLogger middleware (unit)", () => {
    it("sets req.id and the X-Request-Id header, then calls next", () => {
        const middleware = requestLogger({ logger: createMockLogger() });
        const req = createMockRequest({ headers: { "x-request-id": "proxy-id-1" } });
        const res = createClosableResponse();
        const next = createMockNext();

        middleware(req, res, next);

        expect(req.id).toBe("proxy-id-1");
        expect(res.setHeader).toHaveBeenCalledWith(REQUEST_ID_HEADER, "proxy-id-1");
        expect(next).toHaveBeenCalledWith();
    });

    it("logs one line on close with the path stripped of its query string", () => {
        const logger = createMockLogger();
        const req = createMockRequest({
            method: "GET",
            originalUrl: "/api/realtime/stream?accessToken=secret-token",
            user: { userId: "user-1", name: "Rina", role: "CUSTOMER" },
        });
        const res = createClosableResponse(200);

        requestLogger({ logger })(req, res, createMockNext());
        expect(logger.info).not.toHaveBeenCalled();
        res.emit("close");

        expect(logger.info).toHaveBeenCalledTimes(1);
        const [context, message] = logger.info.mock.calls[0] as [Record<string, unknown>, string];
        expect(message).toBe("request completed");
        expect(context).toMatchObject({
            requestId: req.id,
            method: "GET",
            path: "/api/realtime/stream",
            statusCode: 200,
            userId: "user-1",
        });
        expect(context["durationMs"]).toEqual(expect.any(Number));
        expect(context).not.toHaveProperty("aborted");
        expect(JSON.stringify(context)).not.toContain("secret-token");
    });

    it("omits userId for anonymous requests and flags aborted connections", () => {
        const logger = createMockLogger();
        const res = createClosableResponse(200, false);

        requestLogger({ logger })(createMockRequest({ originalUrl: "/api/packages" }), res, createMockNext());
        res.emit("close");

        const [context] = logger.info.mock.calls[0] as [Record<string, unknown>];
        expect(context).not.toHaveProperty("userId");
        expect(context["aborted"]).toBe(true);
    });

    it("tags but does not log ignored paths", () => {
        const logger = createMockLogger();
        const req = createMockRequest({ originalUrl: "/health" });
        const res = createClosableResponse();

        requestLogger({ logger })(req, res, createMockNext());
        res.emit("close");

        expect(req.id).toMatch(UUID);
        expect(logger.info).not.toHaveBeenCalled();
    });

    it("honours custom ignorePaths", () => {
        const logger = createMockLogger();
        const res = createClosableResponse();

        requestLogger({ logger, ignorePaths: ["/metrics"] })(
            createMockRequest({ originalUrl: "/health" }),
            res,
            createMockNext(),
        );
        res.emit("close");

        expect(logger.info).toHaveBeenCalledTimes(1);
    });
});
