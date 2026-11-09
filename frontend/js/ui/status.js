import { el } from "./dom.js";

export const BADGE = {
    Terjadwal: "badge--prepared",
    Disiapkan: "badge--prepared",
    Diantar: "badge--delivering",
    "Siap Diambil": "badge--ready",
    Selesai: "badge--success",
    Dilewati: "badge--expire",
    Pending: "badge--pending",
    Success: "badge--success",
    Expire: "badge--expire",
    Dibatalkan: "badge--cancel",
    Aktif: "badge--success",
    "Akan Datang": "badge--prepared",
    Refund: "badge--cancel",
};

export const ALUR_ANTAR = ["Terjadwal", "Disiapkan", "Diantar", "Selesai"];
export const ALUR_AMBIL = ["Terjadwal", "Disiapkan", "Siap Diambil", "Selesai"];

export const badge = (teks, label) => el("span", `badge ${BADGE[teks] || "badge--expire"}`, label || teks);

export function setBadge(elemen, kelas, teks) {
    elemen.className = `badge ${kelas}`;
    elemen.textContent = teks;
}

const LABEL_BAYAR = { Pending: "Menunggu", Success: "Lunas", Expire: "Kedaluwarsa", Refund: "Dikembalikan" };
export const labelStatusBayar = status => LABEL_BAYAR[status] || status;

const METODE_MIDTRANS = {
    QRIS: "QRIS",
    BANK_TRANSFER: "Transfer bank",
    GOPAY: "GoPay",
    SHOPEEPAY: "ShopeePay",
    CREDIT_CARD: "Kartu kredit",
    CSTORE: "Gerai retail",
};

export function labelMetode(method) {
    if (method === "CASH") return "Tunai";
    if (method === "FREE") return "Gratis (total Rp0)";
    if (method === "MIDTRANS") return "Non-tunai (belum dipilih)";
    if (method && method.startsWith("MIDTRANS_")) return METODE_MIDTRANS[method.slice(9)] || "Non-tunai";
    return method || "";
}

export const labelJenisBayar = type => (type === "SUBSCRIPTION" ? "Pembayaran pesanan" : "Tambah ongkir");
