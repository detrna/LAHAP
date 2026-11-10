import { api } from "../core/api.js";
import { currentUser } from "../core/session.js";
import { el, isiFoto, tautan, tautanLuar } from "../ui/dom.js";
import { formatTanggal, hariIni, labelWaktu, rp, tambahHari } from "../ui/format.js";
import { muatBisnis } from "./bisnis.js";

function menuUtama(jadwal) {
    const entri = (jadwal.menus || []).find(m => m.isPrimary);
    return entri ? entri.menu : null;
}

export function alergiSaya() {
    const user = currentUser();
    if (!user || user.role !== "CUSTOMER") return new Set();
    return new Set((user.allergies || []).map(a => a.id));
}

function alergiBentrok(menu, alergiUser) {
    return (menu.allergies || []).filter(a => alergiUser.has(a.id));
}

function teksAlergen(menu) {
    const alergen = (menu.allergies || []).map(a => a.name.toLowerCase());
    return alergen.length ? `Mengandung: ${alergen.join(", ")}` : "Tidak ada alergen terdaftar";
}

function hrefPaket(paket) {
    return `paket.html?id=${encodeURIComponent(paket.id)}`;
}

function bisaPesan() {
    const user = currentUser();
    return !user || user.role === "CUSTOMER";
}

export function tombolPesan(paket, label = "Pesan Paket", kelas = "btn btn-primary") {
    if (bisaPesan()) return tautan(`checkout.html?paket=${encodeURIComponent(paket.id)}`, kelas, label);
    const tombol = el("button", kelas, "Masuk sebagai pelanggan untuk memesan");
    tombol.type = "button";
    tombol.disabled = true;
    return tombol;
}

function formatWhatsapp(nomor) {
    const sisa = nomor.slice(2);
    const kelompok = [sisa.slice(0, 3), ...(sisa.slice(3).match(/.{1,4}/g) || [])];
    return `+${nomor.slice(0, 2)} ${kelompok.join("-")}`;
}

function hrefLokasi(bisnis) {
    const { latitude: lat, longitude: lng } = bisnis;
    return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`;
}

export async function pasangFooter(footer) {
    const bisnis = await muatBisnis();
    if (!bisnis) return;
    const judul = el("p");
    judul.append(el("strong", "", bisnis.name), " · Katering langganan harian, mingguan, dan bulanan.");
    const alamat = el("p");
    alamat.append(`Ambil pesanan di ${bisnis.address} · `, tautanLuar(hrefLokasi(bisnis), "Lihat lokasi"));
    const kontak = el("p");
    kontak.append(
        `Butuh bantuan pesanan? WhatsApp ${formatWhatsapp(bisnis.whatsappNumber)} · `,
        tautanLuar(`https://wa.me/${bisnis.whatsappNumber}`, "Chat sekarang"),
    );
    footer.replaceChildren(judul, alamat, kontak);
}

export async function muatPaket(batas) {
    const { data, meta } = await api(`/packages?limit=${batas}`, { auth: false });
    return { daftar: data, total: meta.total };
}

export async function muatMenu(daftarPaket, rentang) {
    const dari = tambahHari(hariIni(), rentang.dariHari);
    const sampai = tambahHari(hariIni(), rentang.sampaiHari);
    const hasil = await Promise.allSettled(
        daftarPaket.map(async paket => {
            const { data } = await api(
                `/packages/${encodeURIComponent(paket.id)}/schedules?from=${dari}&to=${sampai}`,
                { auth: false },
            );
            return data.filter(menuUtama).map(jadwal => ({ paket, jadwal }));
        }),
    );
    const daftar = hasil
        .flatMap(h => (h.status === "fulfilled" ? h.value : []))
        .sort(
            (a, b) =>
                a.jadwal.date.localeCompare(b.jadwal.date) ||
                (a.jadwal.deliveryTime?.time || "").localeCompare(b.jadwal.deliveryTime?.time || "") ||
                a.paket.name.localeCompare(b.paket.name, "id"),
        );
    return { daftar, gagal: hasil.some(h => h.status === "rejected") };
}

export function kartuPaket(paket) {
    const card = el("article", "card card-flush pkg-card");
    const foto = tautan(hrefPaket(paket), "pkg-photo");
    foto.setAttribute("aria-label", `Lihat detail ${paket.name}`);
    isiFoto(foto, paket.photoUrl, paket.name, "Foto paket");
    const body = el("div", "pkg-body stack");
    const judul = el("h3", "t-h3");
    judul.append(tautan(hrefPaket(paket), "", paket.name));
    const harga = el("p");
    harga.append(el("span", "price-big", rp(paket.basePrice)), el("span", "t-small t-muted", " per porsi"));
    body.append(judul);
    if (paket.description) body.append(el("p", "t-muted clamp-2", paket.description));
    body.append(harga);
    const aksi = el("div", "row pkg-aksi");
    aksi.append(tombolPesan(paket), tautan(hrefPaket(paket), "btn btn-secondary", "Lihat Paket"));
    body.append(aksi);
    card.append(foto, body);
    return card;
}

function kartuMenu(item, alergiUser) {
    const utama = menuUtama(item.jadwal);
    const card = el("article", "card card-flush menu-mini");
    const foto = el("div", "pkg-photo");
    isiFoto(foto, utama.photoUrl, utama.name, "Foto menu");
    const info = el("div", "pkg-body stack");
    const waktu = labelWaktu(item.jadwal.deliveryTime);
    if (waktu) info.append(el("p", "label", waktu));
    info.append(el("h3", "t-h3", utama.name));
    if (utama.description) info.append(el("p", "t-muted clamp-3", utama.description));
    if ((utama.tags || []).length) {
        const tags = el("div", "row");
        tags.append(...utama.tags.map(tag => el("span", "badge badge--expire", tag)));
        info.append(tags);
    }
    info.append(el("p", "t-small t-muted", teksAlergen(utama)));
    const bentrok = alergiBentrok(utama, alergiUser).map(a => a.name.toLowerCase());
    if (bentrok.length) {
        const peringatan = el("div", "alert alert--warning t-small");
        peringatan.append(el("span", "alert-title", "Cek alergimu"), `Ada ${bentrok.join(", ")} dari daftar alergimu.`);
        info.append(peringatan);
    }
    card.append(foto, info);
    return card;
}

export function pasangMenu({ box, tabs, isi }, daftar, alergiUser) {
    const semuaTanggal = [...new Set(daftar.map(item => item.jadwal.date))].sort();
    const tampil = tanggal => {
        isi.replaceChildren(
            ...daftar.filter(item => item.jadwal.date === tanggal).map(item => kartuMenu(item, alergiUser)),
        );
        isi.scrollLeft = 0;
        isi.setAttribute("aria-label", `Menu ${formatTanggal(tanggal, "hari")}`);
        tabs.querySelectorAll(".tab").forEach(tab =>
            tab.setAttribute("aria-pressed", String(tab.dataset.tanggal === tanggal)),
        );
    };
    tabs.replaceChildren(
        ...semuaTanggal.map(tanggal => {
            const tab = el("button", "tab");
            tab.type = "button";
            tab.dataset.tanggal = tanggal;
            tab.setAttribute("aria-label", formatTanggal(tanggal, "hari"));
            tab.append(
                el("span", "t-small", formatTanggal(tanggal, { weekday: "short" })),
                el("strong", "t-h3", formatTanggal(tanggal, { day: "numeric" })),
            );
            tab.onclick = () => tampil(tanggal);
            return tab;
        }),
    );
    if (semuaTanggal.length) tampil(semuaTanggal[0]);
    box.hidden = semuaTanggal.length === 0;
    return semuaTanggal.length;
}
