import { seedId } from "../../shared/seed-id.js";

export const BUSINESS = {
    id: seedId("business", 1),
    name: "Dapur Lahap Malang",
    whatsappNumber: "6281234500000",
    address: "Jl. Soekarno Hatta No. 9, Lowokwaru, Kota Malang, Jawa Timur",
    latitude: "-7.94060000",
    longitude: "112.62190000",
    deliveryFreeRadius: "1.00",
    deliveryMaxDistance: "10.00",
    deliveryPricePerKm: "5000.00",
    paymentTimeoutMinutes: 15,
} as const;
