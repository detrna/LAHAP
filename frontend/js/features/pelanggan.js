import { MIDTRANS_CLIENT_KEY, MIDTRANS_SNAP_URL } from "../core/config.js";
import { el } from "../ui/dom.js";
import { hariIni } from "../ui/format.js";
import { ALUR_AMBIL, ALUR_ANTAR } from "../ui/status.js";
import { toast } from "../ui/toast.js";

export function bisaBatal(s) {
    return (s.status === "Pending" || s.status === "Success") && hariIni() < s.startDate;
}

export const bisaSkip = o => o.status === "Terjadwal" || o.status === "Disiapkan";

export function langkahSlot(o) {
    const langkah = o.isDelivery ? ALUR_ANTAR : ALUR_AMBIL;
    const sekarang = langkah.indexOf(o.status);
    const daftar = el("ol", "steps");
    langkah.forEach((nama, i) => {
        const li = el("li", `step${i < sekarang ? " is-done" : i === sekarang ? " is-current" : ""}`, nama);
        if (i === sekarang) li.setAttribute("aria-current", "step");
        daftar.append(li);
    });
    return daftar;
}

export function hitungMundur(elemen, expiresAt, onHabis) {
    const akhir = new Date(expiresAt).getTime();
    let timer = null;
    const tampil = () => {
        const sisa = Math.max(0, Math.round((akhir - Date.now()) / 1000));
        elemen.textContent = `Bayar dalam ${String(Math.floor(sisa / 60)).padStart(2, "0")}:${String(sisa % 60).padStart(2, "0")}`;
        if (sisa === 0) {
            clearInterval(timer);
            if (onHabis) onHabis();
        }
    };
    tampil();
    timer = setInterval(tampil, 1000);
    return () => clearInterval(timer);
}

let snapSiap = null;
function muatSnap() {
    if (window.snap) return Promise.resolve();
    if (snapSiap) return snapSiap;
    snapSiap = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = MIDTRANS_SNAP_URL;
        script.dataset.clientKey = MIDTRANS_CLIENT_KEY;
        script.onload = () => resolve();
        script.onerror = () => {
            snapSiap = null;
            script.remove();
            reject(new Error("snap gagal dimuat"));
        };
        document.head.append(script);
    });
    return snapSiap;
}

export async function bayarSnap(sesi, { onSelesai } = {}) {
    const selesai = () => {
        if (onSelesai) onSelesai();
    };
    if (!MIDTRANS_CLIENT_KEY) {
        location.href = sesi.redirectUrl;
        return;
    }
    try {
        await muatSnap();
    } catch {
        location.href = sesi.redirectUrl;
        return;
    }
    window.snap.pay(sesi.snapToken, {
        onSuccess: () => {
            toast("Pembayaran diterima. Status pesanan diperbarui sebentar lagi.");
            selesai();
        },
        onPending: () => {
            toast("Selesaikan pembayaran sesuai instruksi Midtrans.");
            selesai();
        },
        onError: () => {
            toast("Pembayaran gagal. Coba lagi.", "error");
            selesai();
        },
        onClose: () => {
            toast("Pembayaran belum selesai. Kamu bisa melanjutkannya dari halaman pesanan.");
            selesai();
        },
    });
}
