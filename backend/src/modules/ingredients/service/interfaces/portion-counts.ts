export interface PortionCount {
    readonly scheduleId: string;
    readonly usesAlternativeMenu: boolean;
    readonly portions: number;
}

export interface PortionCounts {
    countPortionsBySchedule(scheduleIds: readonly string[]): Promise<readonly PortionCount[]>;
}

export const noPortionCounts: PortionCounts = {
    countPortionsBySchedule: async () => [],
};
