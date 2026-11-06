import { z } from "zod";
import { decimalSchema } from "../../../shared/schema/decimal.js";
import { latitudeSchema, longitudeSchema } from "../../../shared/schema/coordinates.js";
import { phoneSchema } from "../../../shared/utils/phone/phone.js";

const MAX_DISTANCE_KM = 999.99;
const MAX_PRICE_PER_KM = 99999999.99;
const MAX_PAYMENT_TIMEOUT_MINUTES = 1440;

export const settingsUpdateSchema = z
    .object({
        name: z.string().trim().min(1).max(100),
        whatsappNumber: phoneSchema,
        address: z.string().trim().min(1),
        latitude: latitudeSchema,
        longitude: longitudeSchema,
        deliveryFreeRadius: decimalSchema({ scale: 2, min: 0, max: MAX_DISTANCE_KM }),
        deliveryMaxDistance: decimalSchema({ scale: 2, min: 0, max: MAX_DISTANCE_KM, exclusiveMin: true }),
        deliveryPricePerKm: decimalSchema({ scale: 2, min: 0, max: MAX_PRICE_PER_KM }),
        paymentTimeoutMinutes: z.number().int().min(1).max(MAX_PAYMENT_TIMEOUT_MINUTES),
    })
    .superRefine((value, ctx) => {
        if (value.deliveryFreeRadius > value.deliveryMaxDistance) {
            ctx.addIssue({
                code: "custom",
                path: ["deliveryFreeRadius"],
                message: "must not be greater than deliveryMaxDistance",
            });
        }
    });

export type SettingsUpdateBody = z.infer<typeof settingsUpdateSchema>;
