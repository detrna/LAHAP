import type { MealTimeView } from "../../../shared/utils/meal-time/meal-time.js";
import type { Menu } from "./menu.domain.js";

export interface ScheduleMenu {
    readonly menuId: string;
    readonly isPrimary: boolean;
    readonly menu?: Menu | undefined;
}

export interface MenuSchedule {
    readonly id: string;
    readonly packageId: string;
    readonly date: string;
    readonly deliveryTime: MealTimeView;
    readonly isPublished: boolean;
    readonly createdAt: string;
    readonly updatedAt: string;
    readonly menus?: readonly ScheduleMenu[] | undefined;
}

export interface PublishMenuSchedulesResult {
    readonly updatedCount: number;
}
