import type { MenuComponentInput } from "./menu.domain.js";

export const COOK_NOT_ACTIVE_KITCHEN_MESSAGE = "cook is not an active kitchen staff";

export function distinctCookIds(components: readonly { readonly cookId?: string | null | undefined }[]): string[] {
    const ids = new Set<string>();
    for (const component of components) {
        if (component.cookId !== undefined && component.cookId !== null) ids.add(component.cookId);
    }
    return [...ids];
}

export function toComponentRecords(
    components: readonly MenuComponentInput[],
): readonly { readonly name: string; readonly cookId: string | null }[] {
    return components.map(component => ({ name: component.name, cookId: component.cookId ?? null }));
}
