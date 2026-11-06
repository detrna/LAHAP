export * from "./errors.js";

export type EventBusHandler = (message: string) => void;

export type EventBusUnsubscribe = () => Promise<void>;

export interface EventBus {
    publish(channel: string, message: string): Promise<void>;
    subscribe(channel: string, handler: EventBusHandler): Promise<EventBusUnsubscribe>;
    close(): Promise<void>;
}
