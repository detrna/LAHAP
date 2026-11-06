import { describe, expect, it, vi } from "vitest";
import type { Role } from "../../../shared/auth/roles.js";
import { RealtimeCapacityError } from "../domain/errors.js";
import { type Connection, ConnectionHub, type ConnectionHubLimits } from "./connection-hub.js";

const limits: ConnectionHubLimits = { maxPerUser: 5, maxTotal: 1000, maxBufferedBytes: 1024 };

let counter = 0;
function buildConnection(overrides: Partial<Connection> & { userId?: string; role?: Role } = {}) {
    counter += 1;
    const connection = {
        id: `c-${counter}`,
        userId: "user-1",
        role: "CUSTOMER" as Role,
        send: vi.fn(),
        bufferedBytes: vi.fn(() => 0),
        close: vi.fn(),
        ...overrides,
    };
    return connection;
}

describe("ConnectionHub (unit)", () => {
    describe("deliver", () => {
        it("sends to every connection of a listed user", () => {
            const hub = new ConnectionHub(limits);
            const first = buildConnection({ userId: "user-1" });
            const second = buildConnection({ userId: "user-1" });
            const other = buildConnection({ userId: "user-2" });
            [first, second, other].forEach(connection => hub.add(connection));

            hub.deliver({ userIds: ["user-1"] }, "text");

            expect(first.send).toHaveBeenCalledWith("text");
            expect(second.send).toHaveBeenCalledWith("text");
            expect(other.send).not.toHaveBeenCalled();
        });

        it("sends to every connection with a listed role", () => {
            const hub = new ConnectionHub(limits);
            const kitchen = buildConnection({ userId: "k-1", role: "KITCHEN" });
            const admin = buildConnection({ userId: "a-1", role: "ADMIN" });
            const customer = buildConnection({ userId: "c-1", role: "CUSTOMER" });
            [kitchen, admin, customer].forEach(connection => hub.add(connection));

            hub.deliver({ roles: ["KITCHEN", "ADMIN"] }, "text");

            expect(kitchen.send).toHaveBeenCalledOnce();
            expect(admin.send).toHaveBeenCalledOnce();
            expect(customer.send).not.toHaveBeenCalled();
        });

        it("sends once to a connection that matches both a user id and a role", () => {
            const hub = new ConnectionHub(limits);
            const admin = buildConnection({ userId: "a-1", role: "ADMIN" });
            hub.add(admin);

            hub.deliver({ userIds: ["a-1"], roles: ["ADMIN"] }, "text");

            expect(admin.send).toHaveBeenCalledOnce();
        });

        it("sends nothing for an empty audience or unknown users", () => {
            const hub = new ConnectionHub(limits);
            const connection = buildConnection();
            hub.add(connection);

            hub.deliver({}, "text");
            hub.deliver({ userIds: ["nobody"], roles: [] }, "text");

            expect(connection.send).not.toHaveBeenCalled();
        });

        it("closes and forgets a slow connection instead of sending to it", () => {
            const hub = new ConnectionHub(limits);
            const slow = buildConnection({ bufferedBytes: vi.fn(() => 2048) });
            hub.add(slow);

            hub.deliver({ userIds: ["user-1"] }, "text");

            expect(slow.send).not.toHaveBeenCalled();
            expect(slow.close).toHaveBeenCalledOnce();
            expect(hub.size).toBe(0);
        });

        it("closes and forgets a connection whose send throws, and still reaches the others", () => {
            const hub = new ConnectionHub(limits);
            const broken = buildConnection({
                send: vi.fn(() => {
                    throw new Error("socket closed");
                }),
            });
            const healthy = buildConnection();
            hub.add(broken);
            hub.add(healthy);

            hub.deliver({ userIds: ["user-1"] }, "text");

            expect(broken.close).toHaveBeenCalledOnce();
            expect(healthy.send).toHaveBeenCalledWith("text");
            expect(hub.size).toBe(1);
        });
    });

    describe("remove", () => {
        it("stops delivering to a removed connection and ignores unknown ids", () => {
            const hub = new ConnectionHub(limits);
            const connection = buildConnection({ role: "KITCHEN" });
            hub.add(connection);

            hub.remove(connection.id);
            hub.remove("unknown");
            hub.deliver({ userIds: [connection.userId], roles: ["KITCHEN"] }, "text");

            expect(connection.send).not.toHaveBeenCalled();
            expect(connection.close).not.toHaveBeenCalled();
            expect(hub.size).toBe(0);
        });
    });

    describe("limits", () => {
        it("closes the oldest stream of a user when they open more than the per-user limit", () => {
            const hub = new ConnectionHub({ ...limits, maxPerUser: 2 });
            const first = buildConnection();
            const second = buildConnection();
            const third = buildConnection();

            hub.add(first);
            hub.add(second);
            hub.add(third);
            hub.deliver({ userIds: ["user-1"] }, "text");

            expect(first.close).toHaveBeenCalledOnce();
            expect(first.send).not.toHaveBeenCalled();
            expect(second.send).toHaveBeenCalledOnce();
            expect(third.send).toHaveBeenCalledOnce();
            expect(hub.size).toBe(2);
        });

        it("does not touch other users when one user is over the limit", () => {
            const hub = new ConnectionHub({ ...limits, maxPerUser: 1 });
            const other = buildConnection({ userId: "user-2" });
            hub.add(other);

            hub.add(buildConnection());
            hub.add(buildConnection());

            expect(other.close).not.toHaveBeenCalled();
        });

        it("refuses a new connection at the global limit", () => {
            const hub = new ConnectionHub({ ...limits, maxTotal: 2 });
            hub.add(buildConnection({ userId: "a" }));
            hub.add(buildConnection({ userId: "b" }));

            expect(() => hub.add(buildConnection({ userId: "c" }))).toThrow(RealtimeCapacityError);
            expect(hub.size).toBe(2);
        });
    });

    describe("closeAll", () => {
        it("closes and forgets every connection", () => {
            const hub = new ConnectionHub(limits);
            const connections = [buildConnection({ userId: "a" }), buildConnection({ userId: "b", role: "ADMIN" })];
            connections.forEach(connection => hub.add(connection));

            hub.closeAll();

            connections.forEach(connection => expect(connection.close).toHaveBeenCalledOnce());
            expect(hub.size).toBe(0);
        });
    });
});
