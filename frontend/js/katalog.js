const WIB = { timeZone: "Asia/Jakarta" };
const RENTANG_MENU = { dariHari: 1, sampaiHari: 7 };

const rp = n => "Rp" + Math.round(n).toLocaleString("id-ID");

function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

function tautan(href, className, text) {
    const a = el("a", className, text);
    a.href = href;
    return a;
}

function isiFoto(wadah, url, alt, teksKosong) {
    wadah.textContent = teksKosong;
    if (!url) return;
    const img = el("img");
    img.alt = alt;
    img.onload = () => wadah.replaceChildren(img);
    img.onerror = () => (wadah.textContent = teksKosong);
    img.src = url;
}

function tanggalWib(selisihHari = 0) {
    const hariIni = new Intl.DateTimeFormat("en-CA", WIB).format(new Date());
    const tanggal = new Date(`${hariIni}T00:00:00Z`);
    tanggal.setUTCDate(tanggal.getUTCDate() + selisihHari);
    return tanggal.toISOString().slice(0, 10);
}

function formatTanggal(tanggal, opsi) {
    return new Date(`${tanggal.slice(0, 10)}T12:00:00+07:00`).toLocaleDateString("id-ID", { ...WIB, ...opsi });
}

function labelWaktu(waktu) {
    return waktu ? `${waktu.range} ${waktu.time}` : "";
}

function menuUtama(jadwal) {
    const entri = (jadwal.menus || []).find(m => m.isPrimary);
    return entri ? entri.menu : null;
}

function menuAlternatif(jadwal) {
    const entri = (jadwal.menus || []).find(m => !m.isPrimary);
    return entri ? entri.menu : null;
}

function alergiSaya() {
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

function tombolPesan(paket, label = "Pesan Paket", kelas = "btn btn-primary") {
    if (bisaPesan()) return tautan(`checkout.html?paket=${encodeURIComponent(paket.id)}`, kelas, label);
    const tombol = el("button", kelas, "Masuk sebagai pelanggan untuk memesan");
    tombol.type = "button";
    tombol.disabled = true;
    return tombol;
}

let bisnisDimuat = null;

function muatBisnis() {
    if (!bisnisDimuat)
        bisnisDimuat = api("/business", { auth: false })
            .then(({ data }) => data)
            .catch(() => null);
    return bisnisDimuat;
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

function tautanLuar(href, text) {
    const a = tautan(href, "", text);
    a.target = "_blank";
    a.rel = "noopener";
    return a;
}

async function pasangFooter(footer) {
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

async function muatPaket() {
    const { data } = await api("/packages?limit=100", { auth: false });
    return data;
}

async function muatMenu(daftarPaket, rentang = RENTANG_MENU) {
    const dari = tanggalWib(rentang.dariHari);
    const sampai = tanggalWib(rentang.sampaiHari);
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

function kartuPaket(paket) {
    const card = el("article", "card card-flush");
    const foto = tautan(hrefPaket(paket), "pkg-photo");
    foto.setAttribute("aria-label", `Lihat detail ${paket.name}`);
    isiFoto(foto, paket.photoUrl, paket.name, "Foto paket");
    const body = el("div", "pkg-body stack");
    const judul = el("h3", "t-h3");
    judul.append(tautan(hrefPaket(paket), "", paket.name));
    const harga = el("p");
    harga.append(el("span", "price-big", rp(paket.basePrice)), el("span", "t-small t-muted", " per porsi"));
    const waktu = (paket.deliveryTimes || []).map(labelWaktu).join(" · ");
    body.append(judul);
    if (paket.description) body.append(el("p", "t-muted", paket.description));
    body.append(harga, el("p", "t-small t-muted", `Periode: ${(paket.periods || []).join(", ")}`));
    if (waktu) body.append(el("p", "t-small t-muted", `Waktu makan: ${waktu}`));
    if (paket.endAt)
        body.append(
            el(
                "p",
                "t-small t-muted",
                `Bisa dipesan sampai ${formatTanggal(paket.endAt, { day: "numeric", month: "short", year: "numeric" })}`,
            ),
        );
    const aksi = el("div", "row");
    aksi.append(tombolPesan(paket), tautan(hrefPaket(paket), "btn btn-secondary", "Lihat Menu"));
    body.append(aksi);
    card.append(foto, body);
    return card;
}

function kartuMenu(item, alergiUser, opsi = {}) {
    const { tampilPaket = true, tampilAksi = true, rinci = false } = opsi;
    const utama = menuUtama(item.jadwal);
    const alternatif = menuAlternatif(item.jadwal);
    const card = el("article", "card menu-card");
    const foto = el("div", "menu-foto");
    isiFoto(foto, utama.photoUrl, utama.name, "Foto menu");
    const info = el("div", "menu-info stack");
    const waktu = labelWaktu(item.jadwal.deliveryTime);
    const label = [waktu, tampilPaket ? item.paket.name : ""].filter(Boolean).join(" · ");
    if (label) info.append(el("p", "label", label));
    info.append(el("h3", "t-h2", utama.name));
    if (utama.description) info.append(el("p", "t-muted", utama.description));
    if (rinci && (utama.tags || []).length) {
        const tags = el("div", "row");
        tags.append(...utama.tags.map(tag => el("span", "badge badge--expire", tag)));
        info.append(tags);
    }
    if (rinci && (utama.components || []).length)
        info.append(el("p", "t-small", `Isi: ${utama.components.map(c => c.name).join(", ")}`));
    info.append(el("p", "t-small t-muted", teksAlergen(utama)));
    const bentrok = alergiBentrok(utama, alergiUser).map(a => a.name.toLowerCase());
    if (bentrok.length) {
        const peringatan = el("div", "alert alert--warning");
        let teks = `Menu ini mengandung ${bentrok.join(", ")}, yang ada di daftar alergimu.`;
        if (alternatif && alergiBentrok(alternatif, alergiUser).length === 0)
            teks += ` Menu alternatif (${alternatif.name}) tidak mengandung alergen dari daftarmu.`;
        peringatan.append(el("span", "alert-title", "Cek alergimu"), teks);
        info.append(peringatan);
    }
    if (alternatif)
        info.append(el("p", "t-small t-muted", `Menu alternatif: ${alternatif.name} · ${teksAlergen(alternatif)}`));
    if (tampilAksi) {
        const aksi = el("div", "row");
        aksi.append(tombolPesan(item.paket, `Pesan ${item.paket.name}`));
        info.append(aksi);
    }
    card.append(foto, info);
    return card;
}

function pasangMenu({ box, tabs, isi }, daftar, alergiUser, opsi = {}) {
    const semuaTanggal = [...new Set(daftar.map(item => item.jadwal.date))].sort();
    const tampil = tanggal => {
        isi.replaceChildren(
            ...daftar.filter(item => item.jadwal.date === tanggal).map(item => kartuMenu(item, alergiUser, opsi)),
        );
        tabs.querySelectorAll(".tab").forEach(tab =>
            tab.setAttribute("aria-pressed", String(tab.dataset.tanggal === tanggal)),
        );
    };
    tabs.replaceChildren(
        ...semuaTanggal.map(tanggal => {
            const tab = el("button", "tab");
            tab.type = "button";
            tab.dataset.tanggal = tanggal;
            tab.setAttribute("aria-label", formatTanggal(tanggal, { weekday: "long", day: "numeric", month: "long" }));
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
