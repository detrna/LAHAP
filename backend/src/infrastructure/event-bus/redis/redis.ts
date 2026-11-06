import { Redis } from "ioredis";
import type { RedisConfig } from "../../../config/redis.js";
import type { EventBus, EventBusHandler, EventBusUnsubscribe } from "../../../shared/ports/event-bus/event-bus.js";
import { EventBusFailureError } from "../../../shared/ports/event-bus/errors.js";

export class RedisEventBus implements EventBus {
    private readonly publisher: Redis;
    private readonly subscriber: Redis;
    private readonly handlers = new Map<string, Set<EventBusHandler>>();
    private readonly keyPrefix: string;

    constructor(config: RedisConfig) {
        const url = config.URL.trim();
        if (!url) {
            throw new Error("REDIS_URL is not set");
        }

        const options = {
            connectTimeout: config.CONNECT_TIMEOUT_MS,
            maxRetriesPerRequest: config.MAX_RETRIES,
            lazyConnect: true,
        };
        this.keyPrefix = config.KEY_PREFIX;
        this.publisher = new Redis(url, options);
        this.subscriber = new Redis(url, options);
        this.subscriber.on("message", (channel: string, message: string) => {
            this.dispatch(channel, message);
        });
    }

    async verifyConnection(): Promise<void> {
        try {
            const response = await this.publisher.ping();
            if (response !== "PONG") {
                throw new Error(`Unexpected PING response: ${response}`);
            }
        } catch (cause) {
            throw new EventBusFailureError("verifyConnection", cause);
        }
    }

    async publish(channel: string, message: string): Promise<void> {
        try {
            await this.publisher.publish(this.toChannelName(channel), message);
        } catch (cause) {
            throw new EventBusFailureError("publish", cause);
        }
    }

    async subscribe(channel: string, handler: EventBusHandler): Promise<EventBusUnsubscribe> {
        const name = this.toChannelName(channel);
        let handlers = this.handlers.get(name);
        const isFirst = handlers === undefined;
        if (handlers === undefined) {
            handlers = new Set();
            this.handlers.set(name, handlers);
        }
        handlers.add(handler);

        if (isFirst) {
            try {
                await this.subscriber.subscribe(name);
            } catch (cause) {
                this.handlers.delete(name);
                throw new EventBusFailureError("subscribe", cause);
            }
        }

        const registered = handlers;
        return async () => {
            registered.delete(handler);
            if (registered.size > 0 || this.handlers.get(name) !== registered) {
                return;
            }
            this.handlers.delete(name);
            try {
                await this.subscriber.unsubscribe(name);
            } catch (cause) {
                throw new EventBusFailureError("unsubscribe", cause);
            }
        };
    }

    async close(): Promise<void> {
        this.handlers.clear();
        try {
            await Promise.all([this.closeClient(this.publisher), this.closeClient(this.subscriber)]);
        } catch (cause) {
            throw new EventBusFailureError("close", cause);
        }
    }

    private toChannelName(channel: string): string {
        return `${this.keyPrefix}${channel}`;
    }

    private dispatch(channel: string, message: string): void {
        const handlers = this.handlers.get(channel);
        if (handlers === undefined) {
            return;
        }
        for (const handler of [...handlers]) {
            try {
                handler(message);
            } catch {
                continue;
            }
        }
    }

    private async closeClient(client: Redis): Promise<void> {
        if (client.status === "wait" || client.status === "end") {
            client.disconnect();
            return;
        }
        await client.quit();
    }
}

export const loadRedisEventBus = async (config: RedisConfig): Promise<RedisEventBus> => {
    const bus = new RedisEventBus(config);
    try {
        await bus.verifyConnection();
        return bus;
    } catch (error) {
        await bus.close().catch(() => undefined);
        throw error;
    }
};
