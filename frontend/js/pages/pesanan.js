import "../layout/boot.js";
import { api, ApiError } from "../core/api.js";
import { onRealtime, onRealtimeReconnect } from "../core/realtime.js";
import { $, el } from "../ui/dom.js";
import { hentikanHitung, kartuTunggu } from "./pesanan/bayar.js";
import { aturMuatUlang, galat } from "./pesanan/halaman.js";
import { kartuBatal, kartuBayar, kartuHarga, kartuKalender, kartuRingkasan } from "./pesanan/kartu.js";
import { adaSlotBisaUbah, kartuRiwayatUbah, kartuUbah, ubahSedangDiisi } from "./pesanan/ubah-metode.js";

const idPesanan = new URLSearchParams(location.search).get("id");

let muatKe = 0;
async function muat() {
    const ke = ++muatKe;
    if (!idPesanan) {
        $("#isi").removeAttribute("aria-busy");
        $("#isi").replaceChildren(el("p", "t-muted", "Pesanan tidak ditemukan."));
        return;
    }
    try {
        const { data } = await api(`/subscriptions/${encodeURIComponent(idPesanan)}`);
        if (ke !== muatKe) return;
        hentikanHitung();
        document.title = `Pesanan ${data.id.slice(0, 8).toUpperCase()} · LAHAP`;
        const tunggu = await kartuTunggu(data);
        const ubah = data.status === "Success" && adaSlotBisaUbah(data) ? await kartuUbah(data) : null;
        if (ke !== muatKe) return;
        const bagian = [
            kartuRingkasan(data),
            tunggu,
            kartuHarga(data),
            kartuKalender(data),
            kartuBayar(data),
            ubah,
            kartuRiwayatUbah(data),
            kartuBatal(data),
        ].filter(Boolean);
        $("#isi").removeAttribute("aria-busy");
        $("#isi").replaceChildren(...bagian);
    } catch (error) {
        if (ke !== muatKe) return;
        $("#isi").removeAttribute("aria-busy");
        if (error instanceof ApiError && (error.status === 404 || error.status === 400)) {
            const kosong = el("div", "stack");
            const kembali = el("a", "btn btn-secondary", "Kembali ke Langganan Saya");
            kembali.href = "langganan.html";
            kosong.append(el("p", "t-muted", "Pesanan tidak ditemukan."), kembali);
            $("#isi").replaceChildren(kosong);
        } else {
            $("#isi").replaceChildren();
            galat(error);
        }
    }
}

let tundaMuat;
const muatTertunda = () => {
    if (ubahSedangDiisi()) return;
    clearTimeout(tundaMuat);
    tundaMuat = setTimeout(muat, 300);
};
["slot.status", "slot.menu", "slot.obstacle", "notification"].forEach(nama => onRealtime(nama, muatTertunda));
onRealtimeReconnect(muatTertunda);

aturMuatUlang(muat);
muat();
