import { api, ApiError } from "../../core/api.js";
import { errorMessage } from "../../core/errors.js";
import { muatBisnis } from "../../features/bisnis.js";
import { bayarSnap, hitungMundur } from "../../features/pelanggan.js";
import { el } from "../../ui/dom.js";
import { rp } from "../../ui/format.js";
import { muatUlang } from "./halaman.js";

let tutupHitung = null;

export function hentikanHitung() {
    if (tutupHitung) tutupHitung();
    tutupHitung = null;
}

export async function kartuTunggu(s) {
    const bayar = (s.payments || []).find(p => p.type === "SUBSCRIPTION" && p.status === "Pending");
    if (s.status !== "Pending" || !bayar) return null;
    const card = el("section", "card live stack");
    card.append(el("h2", "t-h2", "Menunggu pembayaran"));
    if (bayar.method === "CASH") {
        const b = await muatBisnis();
        card.append(
            el(
                "p",
                "",
                `Bayar ${rp(bayar.amount)} tunai di kasir${b && b.address ? ` (${b.address})` : ""} secepatnya.`,
            ),
            el(
                "p",
                "t-small t-muted",
                "Pesanan yang belum dibayar batal otomatis. Admin memverifikasi pembayaranmu di kasir.",
            ),
        );
        return card;
    }
    try {
        const { data: sesi } = await api(`/subscriptions/${s.id}/payment-session`, { method: "POST" });
        const hitung = el("p", "t-h3");
        const tombol = el("button", "btn btn-primary", "Lanjutkan Pembayaran");
        tombol.type = "button";
        tombol.onclick = () => bayarSnap(sesi, { onSelesai: muatUlang });
        card.append(hitung, tombol);
        tutupHitung = hitungMundur(hitung, sesi.expiresAt, () => {
            tombol.disabled = true;
            setTimeout(muatUlang, 3000);
        });
    } catch (error) {
        card.append(
            el(
                "p",
                "",
                error instanceof ApiError && error.status === 422
                    ? "Sesi pembayaran sudah habis. Pesanan akan batal otomatis; buat pesanan baru."
                    : errorMessage(error),
            ),
        );
    }
    return card;
}
