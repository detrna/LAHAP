import { daysBetween } from "../../../shared/time/calendar.js";
import type { ChurnCustomer } from "./churn.domain.js";

export interface ChurnCandidate {
    readonly userId: string;
    readonly lastEndDate: Temporal.PlainDate;
    readonly lastPackageId: string;
    readonly totalSubscriptions: number;
}

export interface ChurnContact {
    readonly id: string;
    readonly name: string;
    readonly phone: string;
    readonly role: string;
}

export interface ChurnListSources {
    readonly candidates: readonly ChurnCandidate[];
    readonly contacts: readonly ChurnContact[];
    readonly packageNames: ReadonlyMap<string, string>;
    readonly today: Temporal.PlainDate;
    readonly search?: string | undefined;
}

function matches(customer: ChurnCustomer, search: string | undefined): boolean {
    if (search === undefined) return true;
    const term = search.toLowerCase();
    return customer.name.toLowerCase().includes(term) || customer.phone.includes(term);
}

function byMostRecentChurn(a: ChurnCustomer, b: ChurnCustomer): number {
    return (
        b.lastEndDate.localeCompare(a.lastEndDate) || a.name.localeCompare(b.name) || a.userId.localeCompare(b.userId)
    );
}

export function buildChurnList({
    candidates,
    contacts,
    packageNames,
    today,
    search,
}: ChurnListSources): ChurnCustomer[] {
    const contactById = new Map(
        contacts.filter(contact => contact.role === "CUSTOMER").map(contact => [contact.id, contact]),
    );
    const customers: ChurnCustomer[] = [];
    for (const candidate of candidates) {
        const contact = contactById.get(candidate.userId);
        const lastPackageName = packageNames.get(candidate.lastPackageId);
        if (contact === undefined || lastPackageName === undefined) continue;
        customers.push({
            userId: candidate.userId,
            name: contact.name,
            phone: contact.phone,
            lastPackageName,
            lastEndDate: candidate.lastEndDate.toString(),
            daysSinceLastOrder: daysBetween(candidate.lastEndDate, today),
            totalSubscriptions: candidate.totalSubscriptions,
        });
    }
    return customers.filter(customer => matches(customer, search)).sort(byMostRecentChurn);
}
