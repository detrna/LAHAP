import { z } from "zod";
import { fromIsoTimestamp } from "./timestamp.js";

export const isoTimestampSchema = z.iso.datetime({ offset: true }).transform(value => fromIsoTimestamp(value));

export const isoDateSchema = z.iso.date().transform((value, ctx) => {
    try {
        return Temporal.PlainDate.from(value, { overflow: "reject" });
    } catch {
        ctx.addIssue({ code: "custom", message: "must be a real calendar date" });
        return z.NEVER;
    }
});
