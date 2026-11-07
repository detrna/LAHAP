export type IndonesianDateStyle = "short-weekday" | "long";

const LOCALE = "id-ID";

export function formatIndonesianDate(date: Temporal.PlainDate, style: IndonesianDateStyle): string {
    if (style === "long") {
        return date.toLocaleString(LOCALE, { day: "numeric", month: "long", year: "numeric" });
    }
    return date.toLocaleString(LOCALE, { weekday: "long", day: "numeric", month: "short" });
}
