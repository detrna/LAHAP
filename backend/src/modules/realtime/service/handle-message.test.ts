import { describe, expect, it } from "vitest";
import { createMockConnection } from "../test-utils/mocks/realtime.mocks.js";
import { setupRealtimeService } from "../test-utils/setup/realtime.setup.js";

const message = (audience: unknown, event: unknown = { event: "slot.status", data: { orderId: "o-1" } }) =>
    JSON.stringify({ audience, event });

describe("RealtimeService.handleMessage (unit)", () => {
    it("delivers the formatted event to the matching connections only", () => {
        const { service, hub } = setupRealtimeService();
        const customer = createMockConnection({ userId: "user-1" });
        const other = createMockConnection({ userId: "user-2" });
        hub.add(customer);
        hub.add(other);

        service.handleMessage(message({ userIds: ["user-1"] }));

        expect(customer.send).toHaveBeenCalledWith('event: slot.status\ndata: {"orderId":"o-1"}\n\n');
        expect(other.send).not.toHaveBeenCalled();
    });

    it("delivers a role-addressed event to every connection with that role", () => {
        const { service, hub } = setupRealtimeService();
        const kitchen = createMockConnection({ userId: "k-1", role: "KITCHEN" });
        hub.add(kitchen);

        service.handleMessage(message({ roles: ["KITCHEN"] }));

        expect(kitchen.send).toHaveBeenCalledOnce();
    });

    it("logs a warning and drops a message that is not JSON", () => {
        const { service, hub, logger } = setupRealtimeService();
        const connection = createMockConnection();
        hub.add(connection);

        expect(() => service.handleMessage("not json")).not.toThrow();

        expect(logger.warn).toHaveBeenCalledOnce();
        expect(connection.send).not.toHaveBeenCalled();
    });

    it.each([
        ["an unknown event name", message({ userIds: ["user-1"] }, { event: "slot.unknown", data: {} })],
        ["an unknown role", message({ roles: ["OWNER"] })],
        ["a missing audience", JSON.stringify({ event: { event: "slot.status", data: {} } })],
        ["a non-object payload", JSON.stringify("hello")],
    ])("logs a warning and drops a message with %s", (_label, payload) => {
        const { service, hub, logger } = setupRealtimeService();
        const connection = createMockConnection();
        hub.add(connection);

        expect(() => service.handleMessage(payload)).not.toThrow();

        expect(logger.warn).toHaveBeenCalledOnce();
        expect(connection.send).not.toHaveBeenCalled();
    });
});
