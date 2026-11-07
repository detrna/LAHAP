import { findClashingAllergies } from "../../../shared/utils/allergy-clash/allergy-clash.js";
import type { SpecialCategoryEntry } from "./to-cook.domain.js";
import type { ServedSlot, ToCookLookups } from "./to-cook-source.js";

type Reason = SpecialCategoryEntry["reasons"][number];

function presentText(value: string | null | undefined): string | null {
    const trimmed = value?.trim() ?? "";
    return trimmed === "" ? null : trimmed;
}

function toEntry(
    { slot, schedule, primaryMenuId }: ServedSlot,
    { menus, packageNames, profiles }: ToCookLookups,
): SpecialCategoryEntry | null {
    const profile = profiles.get(slot.userId);
    const clashing = findClashingAllergies(profile?.allergyIds ?? [], menus.get(primaryMenuId)?.allergies ?? []);
    const allergyNote = presentText(profile?.allergyNote);
    const note = presentText(slot.notes);

    const reasons: Reason[] = [];
    if (clashing.length > 0) reasons.push("ALLERGY_CLASH");
    if (allergyNote !== null) reasons.push("ALLERGY_NOTE");
    if (note !== null) reasons.push("NOTE");
    if (reasons.length === 0) return null;

    const packageName = packageNames.get(schedule.packageId);
    return {
        orderId: slot.orderId,
        recipientName: slot.recipientName,
        isDelivery: slot.isDelivery,
        deliveryTime: schedule.deliveryTime,
        reasons,
        ...(clashing.length > 0
            ? { conflictingAllergies: [...clashing].sort((a, b) => a.name.localeCompare(b.name)) }
            : {}),
        ...(allergyNote !== null ? { allergyNote } : {}),
        ...(note !== null ? { note } : {}),
        primaryMenuId,
        alternativeMenuId: schedule.alternativeMenuId,
        usesAlternativeMenu: slot.usesAlternativeMenu,
        ...(packageName !== undefined ? { packageName } : {}),
    };
}

export function buildSpecialCategory(
    served: readonly ServedSlot[],
    lookups: ToCookLookups,
): readonly SpecialCategoryEntry[] {
    return served
        .flatMap(item => {
            const entry = toEntry(item, lookups);
            return entry === null ? [] : [entry];
        })
        .sort(
            (a, b) =>
                a.deliveryTime.time.localeCompare(b.deliveryTime.time) ||
                a.recipientName.localeCompare(b.recipientName),
        );
}
