import { EventEmitter } from "node:events";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMockRequest, createMockResponse } from "../../../../tests/utils/mocks/express.js";
import { RealtimeCapacityError } from "../domain/errors.js";
import type { Connection } from "../service/connection-hub.js";
import { setupRealtimeController } from "../test-utils/setup/realtime.setup.js";

function buildStreamResponse() {
    const emitter = new EventEmitter();
    const res = createMockResponse();
    const stream = Object.assign(res, {
        write: vi.fn(() => true),
        flushHeaders: vi.fn(),
        writableLength: 0,
        writableEnded: false,
        on: emitter.on.bind(emitter),
    });
    stream.end.mockImplementation(() => {
        stream.writableEnded = true;
        emitter.emit("close");
        return stream;
    });
    return { res: stream, emitter };
}

const request = () =>
    createMockRequest({
        user: { userId: "user-1", name: "Siti", role: "CUSTOMER" },
        tokenPayload: { exp: 2_000_000_000 } as never,
    });

describe("RealtimeController.stream (unit)", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("registers the user as a connection", () => {
        const { controller, realtimeService } = setupRealtimeController();
        const { res } = buildStreamResponse();

        controller.stream(request(), res);

        const connection = realtimeService.connect.mock.calls[0]?.[0] as Connection;
        expect(connection).toMatchObject({ userId: "user-1", role: "CUSTOMER" });
        expect(connection.id).toEqual(expect.any(String));
    });

    it("sends the event stream headers and the reconnect hint first", () => {
        const { controller } = setupRealtimeController();
        const { res } = buildStreamResponse();

        controller.stream(request(), res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "text/event-stream");
        expect(res.setHeader).toHaveBeenCalledWith("Cache-Control", "no-cache, no-transform");
        expect(res.setHeader).toHaveBeenCalledWith("Connection", "keep-alive");
        expect(res.setHeader).toHaveBeenCalledWith("X-Accel-Buffering", "no");
        expect(res.flushHeaders).toHaveBeenCalledOnce();
        expect(res.write).toHaveBeenNthCalledWith(1, "retry: 5000\n\n");
    });

    it("writes what the hub sends and reports the unsent bytes", () => {
        const { controller, realtimeService } = setupRealtimeController();
        const { res } = buildStreamResponse();
        res.writableLength = 42;

        controller.stream(request(), res);
        const connection = realtimeService.connect.mock.calls[0]?.[0] as Connection;
        connection.send("event: x\n\n");

        expect(res.write).toHaveBeenLastCalledWith("event: x\n\n");
        expect(connection.bufferedBytes()).toBe(42);
    });

    it("ends the response when the hub closes the connection", () => {
        const { controller, realtimeService } = setupRealtimeController();
        const { res } = buildStreamResponse();

        controller.stream(request(), res);
        (realtimeService.connect.mock.calls[0]?.[0] as Connection).close();

        expect(res.end).toHaveBeenCalledOnce();
    });

    it("pings on the configured interval", () => {
        const { controller } = setupRealtimeController(10);
        const { res } = buildStreamResponse();
        controller.stream(request(), res);
        res.write.mockClear();

        vi.advanceTimersByTime(9_999);
        expect(res.write).not.toHaveBeenCalled();
        vi.advanceTimersByTime(1);
        expect(res.write).toHaveBeenCalledWith(": ping\n\n");
        vi.advanceTimersByTime(10_000);
        expect(res.write).toHaveBeenCalledTimes(2);
    });

    it("ends the stream when the access token expires", () => {
        const { controller, realtimeService } = setupRealtimeController();
        realtimeService.getMillisecondsUntil.mockReturnValue(60_000);
        const { res } = buildStreamResponse();

        controller.stream(request(), res);

        expect(realtimeService.getMillisecondsUntil).toHaveBeenCalledWith(2_000_000_000);
        vi.advanceTimersByTime(59_999);
        expect(res.end).not.toHaveBeenCalled();
        vi.advanceTimersByTime(1);
        expect(res.end).toHaveBeenCalledOnce();
    });

    it("unregisters and stops the timers when the client goes away", () => {
        const { controller, realtimeService } = setupRealtimeController();
        const { res, emitter } = buildStreamResponse();
        controller.stream(request(), res);
        const connection = realtimeService.connect.mock.calls[0]?.[0] as Connection;
        res.write.mockClear();

        emitter.emit("close");
        vi.advanceTimersByTime(3_600_000);

        expect(realtimeService.disconnect).toHaveBeenCalledWith(connection.id, "user-1");
        expect(res.write).not.toHaveBeenCalled();
        expect(res.end).not.toHaveBeenCalled();
    });

    it("does not write after the response has ended", () => {
        const { controller, realtimeService } = setupRealtimeController();
        const { res } = buildStreamResponse();
        controller.stream(request(), res);
        const connection = realtimeService.connect.mock.calls[0]?.[0] as Connection;
        res.writableEnded = true;
        res.write.mockClear();

        connection.send("late");

        expect(res.write).not.toHaveBeenCalled();
    });

    it("sends no headers when the server is full", () => {
        const { controller, realtimeService } = setupRealtimeController();
        realtimeService.connect.mockImplementation(() => {
            throw new RealtimeCapacityError();
        });
        const { res } = buildStreamResponse();

        expect(() => controller.stream(request(), res)).toThrow(RealtimeCapacityError);

        expect(res.setHeader).not.toHaveBeenCalled();
        expect(res.flushHeaders).not.toHaveBeenCalled();
    });
});
