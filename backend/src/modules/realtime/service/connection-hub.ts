import type { Role } from "../../../shared/auth/roles.js";
import { RealtimeCapacityError } from "../domain/errors.js";
import type { RealtimeAudience } from "../domain/realtime-event.domain.js";

export interface Connection {
    readonly id: string;
    readonly userId: string;
    readonly role: Role;
    send(text: string): void;
    bufferedBytes(): number;
    close(): void;
}

export interface ConnectionHubLimits {
    readonly maxPerUser: number;
    readonly maxTotal: number;
    readonly maxBufferedBytes: number;
}

export const MAX_BUFFERED_BYTES = 1024 * 1024;

export class ConnectionHub {
    private readonly connections = new Map<string, Connection>();
    private readonly byUser = new Map<string, Set<Connection>>();
    private readonly byRole = new Map<Role, Set<Connection>>();

    constructor(readonly limits: ConnectionHubLimits) {}

    get size(): number {
        return this.connections.size;
    }

    add(connection: Connection): void {
        if (this.connections.size >= this.limits.maxTotal) {
            throw new RealtimeCapacityError();
        }

        const own = this.byUser.get(connection.userId);
        while (own !== undefined && own.size >= this.limits.maxPerUser) {
            const oldest = own.values().next().value;
            if (oldest === undefined) break;
            this.evict(oldest);
        }

        this.connections.set(connection.id, connection);
        this.index(this.byUser, connection.userId, connection);
        this.index(this.byRole, connection.role, connection);
    }

    remove(id: string): void {
        const connection = this.connections.get(id);
        if (connection === undefined) return;
        this.connections.delete(id);
        this.unindex(this.byUser, connection.userId, connection);
        this.unindex(this.byRole, connection.role, connection);
    }

    deliver(audience: RealtimeAudience, text: string): void {
        const recipients = new Set<Connection>();
        for (const userId of audience.userIds ?? []) {
            for (const connection of this.byUser.get(userId) ?? []) recipients.add(connection);
        }
        for (const role of audience.roles ?? []) {
            for (const connection of this.byRole.get(role) ?? []) recipients.add(connection);
        }

        for (const connection of recipients) {
            this.sendTo(connection, text);
        }
    }

    closeAll(): void {
        for (const connection of [...this.connections.values()]) {
            this.evict(connection);
        }
    }

    private sendTo(connection: Connection, text: string): void {
        if (connection.bufferedBytes() > this.limits.maxBufferedBytes) {
            this.evict(connection);
            return;
        }
        try {
            connection.send(text);
        } catch {
            this.evict(connection);
        }
    }

    private evict(connection: Connection): void {
        this.remove(connection.id);
        try {
            connection.close();
        } catch {
            return;
        }
    }

    private index<K>(map: Map<K, Set<Connection>>, key: K, connection: Connection): void {
        const set = map.get(key);
        if (set === undefined) {
            map.set(key, new Set([connection]));
            return;
        }
        set.add(connection);
    }

    private unindex<K>(map: Map<K, Set<Connection>>, key: K, connection: Connection): void {
        const set = map.get(key);
        if (set === undefined) return;
        set.delete(connection);
        if (set.size === 0) map.delete(key);
    }
}
