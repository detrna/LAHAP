import type { ToCookMenu } from "./to-cook.domain.js";
import type { ServedSlot, ToCookLookups } from "./to-cook-source.js";

export function buildToCookMenus(
    served: readonly ServedSlot[],
    { menus, packageNames }: Pick<ToCookLookups, "menus" | "packageNames">,
): readonly ToCookMenu[] {
    const lines = new Map<string, ToCookMenu>();
    for (const { slot, schedule, servedMenuId } of served) {
        const menu = menus.get(servedMenuId);
        const packageName = packageNames.get(schedule.packageId);
        if (menu === undefined || packageName === undefined) continue;

        const key = [schedule.packageId, schedule.deliveryTime.time, servedMenuId, slot.usesAlternativeMenu].join("|");
        const current = lines.get(key);
        lines.set(key, {
            packageId: schedule.packageId,
            packageName,
            menuId: servedMenuId,
            name: menu.name,
            isAlternative: slot.usesAlternativeMenu,
            deliveryTime: schedule.deliveryTime,
            portions: (current?.portions ?? 0) + 1,
            components: menu.components,
        });
    }
    return [...lines.values()].sort(
        (a, b) =>
            a.deliveryTime.time.localeCompare(b.deliveryTime.time) ||
            a.packageName.localeCompare(b.packageName) ||
            Number(a.isAlternative) - Number(b.isAlternative),
    );
}
