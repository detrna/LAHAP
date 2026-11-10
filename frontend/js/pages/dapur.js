import "../layout/boot.js";
import { api, ApiError } from "../core/api.js";
import { errorMessage } from "../core/errors.js";
import { onRealtime, onRealtimeReconnect } from "../core/realtime.js";
import { currentUser } from "../core/session.js";
import { $, el } from "../ui/dom.js";
import { angka, formatTanggal, hariIni, tambahHari } from "../ui/format.js";
import { tampilGalat } from "../ui/forms.js";
import { peringatan } from "../ui/peringatan.js";
import { toast } from "../ui/toast.js";

const jamMakan = t => `${t.range} · ${t.time}`;
const ALASAN = { ALLERGY_CLASH: "Bentrok alergi", ALLERGY_NOTE: "Catatan alergi", NOTE: "Catatan pesanan" };
const BELUM_DISIAPKAN =
    "Belum ada porsi berstatus Disiapkan. Porsi otomatis jadi Disiapkan 3 jam sebelum waktu makan, atau semuanya sudah ditandai siap.";

class PesanHalaman extends Error {}

function pesanGalat(error) {
    if (error instanceof PesanHalaman) return error.message;
    if (error instanceof ApiError && error.code === "ORDER_NOT_FOUND")
        return "Pesanan tidak ditemukan atau belum lunas. Muat ulang halaman.";
    return errorMessage(error);
}
function galat(error) {
    tampilGalat($("#err"), error, error && pesanGalat(error));
}

const adalahAdmin = () => (currentUser() || {}).role === "ADMIN";
let cacheJadwal = new Map();
async function jadwalPaket(packageId, tanggal) {
    const kunci = `${packageId}|${tanggal}`;
    if (!cacheJadwal.has(kunci)) {
        let jadwal = [];
        if (adalahAdmin()) {
            jadwal = (await api(`/admin/menu-schedules?packageId=${packageId}&from=${tanggal}&to=${tanggal}&limit=100`))
                .data;
        } else {
            try {
                jadwal = (await api(`/packages/${packageId}/schedules?from=${tanggal}&to=${tanggal}`, { auth: false }))
                    .data;
            } catch (error) {
                if (!(error instanceof ApiError) || error.status !== 404) throw error;
            }
        }
        cacheJadwal.set(kunci, jadwal);
    }
    return cacheJadwal.get(kunci);
}
async function idJadwal(m, tanggal) {
    const jadwal = await jadwalPaket(m.packageId, tanggal);
    const cocok = jadwal.find(j => j.date === tanggal && j.deliveryTime.time === m.deliveryTime.time);
    if (!cocok)
        throw new PesanHalaman(
            `Jadwal "${m.packageName}" ${jamMakan(m.deliveryTime)} tidak ditemukan karena paketnya sudah tidak dijual. Minta admin menandai siap dari halaman ini.`,
        );
    return cocok.id;
}

let sibuk = false;
async function jalankan(aksi, tombol) {
    if (sibuk) return;
    sibuk = true;
    if (tombol) tombol.disabled = true;
    galat(null);
    try {
        const pesan = await aksi();
        if (pesan) toast(pesan);
        await muat();
    } catch (error) {
        galat(error);
    } finally {
        sibuk = false;
        if (tombol) tombol.disabled = false;
    }
}

async function tandaiSiap(body) {
    const { data } = await api("/kitchen/food-ready", { method: "POST", body });
    return data.updatedCount ? `${data.updatedCount} porsi ditandai siap.` : BELUM_DISIAPKAN;
}

function daftarKomponen(components) {
    if (!components.length) return null;
    const ul = el("ul", "t-small t-muted");
    components.forEach(c => ul.append(el("li", "", `${c.name} · ${c.cook ? c.cook.name : "belum ditugaskan"}`)));
    return ul;
}

function barisMenu(tanggal, m) {
    const row = el("div", "invoice");
    const kiri = el("div", "stack");
    const judul = el("p", "row");
    judul.append(el("span", "t-h3", m.name));
    if (m.isAlternative) judul.append(el("span", "badge badge--prepared", "Menu alternatif"));
    kiri.append(el("p", "label", m.packageName), judul);
    const komponen = daftarKomponen(m.components || []);
    if (komponen) kiri.append(komponen);
    const kanan = el("div", "row");
    kanan.append(el("span", "t-h3", `${m.portions} porsi`));
    const siap = el("button", "btn btn-primary btn-sm", "Makanan Siap");
    siap.type = "button";
    siap.onclick = async () => {
        const ok = await peringatan({
            judul: `Tandai ${m.portions} porsi "${m.name}" siap?`,
            akibat: [
                jamMakan(m.deliveryTime),
                "Porsi antar masuk daftar kurir, porsi ambil sendiri jadi Siap Diambil.",
                "Status tidak bisa dikembalikan.",
            ],
            tombol: "Ya, makanan siap",
        });
        if (!ok) return;
        jalankan(
            async () =>
                tandaiSiap({ menuScheduleId: await idJadwal(m, tanggal), usesAlternativeMenu: m.isAlternative }),
            siap,
        );
    };
    kanan.append(siap);
    row.append(kiri, kanan);
    return row;
}

function kartuKhusus(s, menus) {
    const box = el("div", "alert alert--warning stack");
    const bagian = [s.recipientName, s.isDelivery ? "Diantar" : "Ambil sendiri"];
    if (s.packageName) bagian.push(s.packageName);
    box.append(el("span", "alert-title", bagian.join(" · ")));
    box.append(el("p", "t-small", s.reasons.map(r => ALASAN[r] || r).join(", ")));
    const menuId = s.usesAlternativeMenu ? s.alternativeMenuId : s.primaryMenuId;
    const menu = menus.find(m => m.menuId === menuId);
    const baris = el("p", "row");
    baris.append(el("span", "", `Menu: ${menu ? menu.name : "-"}`));
    if (s.usesAlternativeMenu) baris.append(el("span", "badge badge--prepared", "Menu alternatif"));
    box.append(baris);
    if ((s.conflictingAllergies || []).length)
        box.append(el("p", "", `Alergi bentrok: ${s.conflictingAllergies.map(a => a.name).join(", ")}`));
    if (s.allergyNote) box.append(el("p", "", `Catatan alergi: ${s.allergyNote}`));
    if (s.note) box.append(el("p", "", `Catatan pesanan: ${s.note}`));
    const aksi = el("div", "task-actions");
    if (s.reasons.includes("ALLERGY_CLASH")) {
        if (!s.alternativeMenuId) aksi.append(el("p", "t-small", "Jadwal ini belum punya menu alternatif."));
        else {
            const alt = el(
                "button",
                "btn btn-secondary btn-sm",
                s.usesAlternativeMenu ? "Kembali ke Menu Utama" : "Pakai Menu Alternatif",
            );
            alt.type = "button";
            alt.onclick = () =>
                jalankan(async () => {
                    await api(`/kitchen/orders/${s.orderId}/alternative-menu`, {
                        method: s.usesAlternativeMenu ? "DELETE" : "POST",
                    });
                    return s.usesAlternativeMenu ? "Kembali ke menu utama." : "Menu alternatif dipakai.";
                }, alt);
            aksi.append(alt);
        }
    }
    const siap = el("button", "btn btn-primary btn-sm", "Siap");
    siap.type = "button";
    siap.onclick = () => jalankan(() => tandaiSiap({ orderIds: [s.orderId] }), siap);
    aksi.append(siap);
    box.append(aksi);
    return box;
}

function kartuLaporan(r) {
    const card = el("section", "card stack");
    card.append(el("h2", "t-h2", formatTanggal(r.date, "hari")));
    if (!r.menus.length && !r.specialCategory.length) {
        card.append(el("p", "t-muted", "Tidak ada yang perlu dimasak pada tanggal ini."));
        return card;
    }
    if (r.ingredients.length) {
        card.append(
            el("h3", "t-h3", "Bahan yang dibutuhkan hari ini"),
            el("p", "t-muted", r.ingredients.map(i => `${i.name} ${angka(i.totalQuantity)} ${i.unit}`).join(" · ")),
        );
    }
    const waktu = new Map();
    const ambil = t => {
        if (!waktu.has(t.time)) waktu.set(t.time, { deliveryTime: t, menus: [], khusus: [] });
        return waktu.get(t.time);
    };
    r.menus.forEach(m => ambil(m.deliveryTime).menus.push(m));
    r.specialCategory.forEach(s => ambil(s.deliveryTime).khusus.push(s));
    [...waktu.values()]
        .sort((a, b) => a.deliveryTime.time.localeCompare(b.deliveryTime.time))
        .forEach(g => {
            const blok = el("div", "stack");
            blok.append(el("p", "label", jamMakan(g.deliveryTime)));
            g.menus.forEach(m => blok.append(barisMenu(r.date, m)));
            if (g.khusus.length) {
                blok.append(el("h3", "t-h3", "Perlu perhatian khusus"));
                g.khusus.forEach(s => blok.append(kartuKhusus(s, g.menus)));
            }
            card.append(blok);
        });
    return card;
}

let ke = 0;
async function muat() {
    const ini = ++ke;
    const dari = $("#tgl").value || hariIni();
    const sampai = tambahHari(dari, Number($("#rentang").value) - 1);
    cacheJadwal = new Map();
    try {
        const { data } = await api(`/kitchen/to-cook?from=${dari}&to=${sampai}`);
        if (ini !== ke) return;
        $("#daftar").replaceChildren(...data.map(kartuLaporan));
        galat(null);
    } catch (error) {
        if (ini !== ke) return;
        $("#daftar").replaceChildren();
        galat(error);
    } finally {
        $("#daftar").removeAttribute("aria-busy");
    }
}

let tunda;
const muatTertunda = () => {
    clearTimeout(tunda);
    tunda = setTimeout(muat, 300);
};
$("#tgl").value = hariIni();
$("#tgl").addEventListener("change", muat);
$("#rentang").addEventListener("change", muat);

["slot.status", "slot.menu"].forEach(n => onRealtime(n, muatTertunda));
onRealtimeReconnect(muatTertunda);
document.addEventListener("visibilitychange", () => {
    if (!document.hidden) muatTertunda();
});
muat();
