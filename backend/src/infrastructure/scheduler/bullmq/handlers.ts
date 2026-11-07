import type { JobRunRepository } from "../../../shared/ports/job-run-repository/job-run-repository.js";
import {
    EXPIRE_PENDING_PAYMENTS_JOB_NAME,
    HEARTBEAT_JOB_NAME,
    PREPARE_DUE_SLOTS_JOB_NAME,
    REMIND_EMPTY_SCHEDULES_JOB_NAME,
} from "./register-schedules.js";

export interface ScheduledCheckJobContext {
    readonly id?: string | undefined;
    readonly name: string;
    readonly data: Record<string, unknown>;
}

export type ScheduledJobUseCaseHandler = (data: Record<string, unknown>) => Promise<unknown>;

export type ScheduledJobHandlerMap = Readonly<Record<string, ScheduledJobUseCaseHandler>>;

export interface HeartbeatResult {
    readonly status: "ok";
    readonly timestamp: string;
}

export const defaultHeartbeatHandler = async (): Promise<HeartbeatResult> => {
    const timestamp = new Date().toISOString();
    console.log(`[Heartbeat] Heartbeat pulse at ${timestamp}`);
    return { status: "ok", timestamp };
};

export interface HandlerDependencies {
    readonly heartbeatHandler?: (() => Promise<unknown> | unknown) | undefined;
    readonly expirePendingPayments?: (() => Promise<unknown>) | undefined;
    readonly prepareDueSlots?: (() => Promise<unknown>) | undefined;
    readonly remindEmptySchedules?: (() => Promise<unknown>) | undefined;
}

/**
 * Maps `job.name` on the "scheduled-checks" queue to a use case/handler execution.
 *
 * The scheduler is only a trigger: handlers call a function/usecase and contain
 * no database queries or business rules.
 *
 * Adding a real scheduled check later requires adding one entry here.
 */
export const createScheduledJobHandlerMap = (deps: HandlerDependencies = {}): ScheduledJobHandlerMap => {
    const { expirePendingPayments, prepareDueSlots, remindEmptySchedules } = deps;
    return {
        [HEARTBEAT_JOB_NAME]: async () => (deps.heartbeatHandler ? deps.heartbeatHandler() : defaultHeartbeatHandler()),
        ...(expirePendingPayments !== undefined
            ? { [EXPIRE_PENDING_PAYMENTS_JOB_NAME]: () => expirePendingPayments() }
            : {}),
        ...(prepareDueSlots !== undefined ? { [PREPARE_DUE_SLOTS_JOB_NAME]: () => prepareDueSlots() } : {}),
        ...(remindEmptySchedules !== undefined
            ? { [REMIND_EMPTY_SCHEDULES_JOB_NAME]: () => remindEmptySchedules() }
            : {}),
    };
};

const toErrorMessage = (error: unknown): string => {
    if (error instanceof Error) {
        return error.message;
    }
    return String(error);
};

/**
 * Wraps scheduled job dispatch with `JobRunRepository` lifecycle tracking
 * (`recordStarted` -> `recordSuccess` / `recordFailed`) and rethrows any error
 * so BullMQ applies its retry/backoff policy.
 */
export const createScheduledCheckProcessor = (
    handlerMap: ScheduledJobHandlerMap,
    jobRunRepository: JobRunRepository,
) => {
    return async (job: ScheduledCheckJobContext): Promise<void> => {
        const handler = handlerMap[job.name];
        const jobRun = await jobRunRepository.recordStarted(job.name);

        if (!handler) {
            const unknownJobError = new Error(`Unknown scheduled job "${job.name}"`);
            await jobRunRepository.recordFailed(jobRun.id, unknownJobError.message);
            throw unknownJobError;
        }

        try {
            await handler(job.data);
            await jobRunRepository.recordSuccess(jobRun.id);
        } catch (error) {
            await jobRunRepository.recordFailed(jobRun.id, toErrorMessage(error));
            throw error;
        }
    };
};
