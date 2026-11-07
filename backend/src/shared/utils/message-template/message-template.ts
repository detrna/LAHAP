/** Placeholder tokens admins can write in churn follow-up templates (UC-29, UC-48). */
export const MESSAGE_PLACEHOLDERS = {
    name: "{nama}",
    lastPackage: "{paket_terakhir}",
    endDate: "{tanggal_berakhir}",
    daysSinceLastOrder: "{lama_tidak_memesan}",
    promoCode: "{kode_promo}",
} as const;

export type MessageValues = Readonly<Partial<Record<keyof typeof MESSAGE_PLACEHOLDERS, string>>>;

const KEY_BY_PLACEHOLDER: ReadonlyMap<string, keyof MessageValues> = new Map(
    Object.entries(MESSAGE_PLACEHOLDERS).map(([key, placeholder]) => [placeholder, key as keyof MessageValues]),
);

const PLACEHOLDER_PATTERN = /\{[a-z_]+\}/g;

/**
 * Fills the template's placeholders in one pass. A placeholder without a value becomes an empty string;
 * unknown `{...}` text is left untouched, and placeholders inside values are not expanded again.
 */
export function generateMessage(template: string, values: MessageValues): string {
    return template.replace(PLACEHOLDER_PATTERN, token => {
        const key = KEY_BY_PLACEHOLDER.get(token);
        return key ? (values[key] ?? "") : token;
    });
}

export function findUnknownPlaceholders(template: string): readonly string[] {
    const unknown = (template.match(PLACEHOLDER_PATTERN) ?? []).filter(token => !KEY_BY_PLACEHOLDER.has(token));
    return [...new Set(unknown)];
}
