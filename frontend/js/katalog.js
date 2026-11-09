const WIB = { timeZone: "Asia/Jakarta" };
const RENTANG_MENU = { dariHari: 1, sampaiHari: 7 };

const rp = n => "Rp" + Math.round(n).toLocaleString("id-ID");

function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

function isiFoto(wadah, url, alt, teksKosong) {
    wadah.textContent = teksKosong;
    if (!url) return;
    const img = el("img");
    img.alt = alt;
    img.loading = "lazy";
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

async function muatPaket() {
    const { data } = await api("/packages?limit=100", { auth: false });
    return data.filter(p => p.isAvailable);
}

async function muatMenu(daftarPaket) {
    const dari = tanggalWib(RENTANG_MENU.dariHari);
    const sampai = tanggalWib(RENTANG_MENU.sampaiHari);
    const hasil = await Promise.allSettled(
        daftarPaket.map(async paket => {
            const { data } = await api(
                `/packages/${encodeURIComponent(paket.id)}/schedules?from=${dari}&to=${sampai}`,
                { auth: false },
            );
            return data.filter(jadwal => jadwal.isPublished && menuUtama(jadwal)).map(jadwal => ({ paket, jadwal }));
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
    const foto = el("div", "pkg-photo");
    isiFoto(foto, paket.photoUrl, paket.name, "Foto paket");
    const body = el("div", "pkg-body stack");
    const harga = el("p");
    harga.append(el("span", "price-big", rp(paket.basePrice)), el("span", "t-small t-muted", " per porsi"));
    const waktu = (paket.deliveryTimes || []).map(labelWaktu).join(" · ");
    const aksi = el("a", "btn btn-primary btn-block", "Pilih Paket");
    aksi.href = `checkout.html?paket=${encodeURIComponent(paket.id)}`;
    body.append(el("h3", "t-h3", paket.name));
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
    body.append(aksi);
    card.append(foto, body);
    return card;
}

function kartuMenu(item, alergiUser) {
    const utama = menuUtama(item.jadwal);
    const alternatif = menuAlternatif(item.jadwal);
    const card = el("article", "card menu-card");
    const foto = el("div", "menu-foto");
    isiFoto(foto, utama.photoUrl, utama.name, "Foto menu");
    const info = el("div", "menu-info stack");
    const waktu = labelWaktu(item.jadwal.deliveryTime);
    info.append(
        el("p", "label", waktu ? `${waktu} · ${item.paket.name}` : item.paket.name),
        el("h3", "t-h2", utama.name),
    );
    if (utama.description) info.append(el("p", "t-muted", utama.description));
    const alergen = (utama.allergies || []).map(a => a.name.toLowerCase());
    info.append(
        el(
            "p",
            "t-small t-muted",
            alergen.length ? `Mengandung: ${alergen.join(", ")}` : "Tidak ada alergen terdaftar",
        ),
    );
    const bentrok = alergiBentrok(utama, alergiUser).map(a => a.name.toLowerCase());
    if (bentrok.length) {
        const peringatan = el("div", "alert alert--warning");
        peringatan.append(
            el("span", "alert-title", "Cek alergimu"),
            `Menu ini mengandung ${bentrok.join(", ")}, yang ada di daftar alergimu.`,
        );
        info.append(peringatan);
    }
    if (alternatif) info.append(el("p", "t-small t-muted", `Menu alternatif: ${alternatif.name}`));
    const aksi = el("a", "btn btn-primary", `Pesan ${item.paket.name}`);
    aksi.href = `checkout.html?paket=${encodeURIComponent(item.paket.id)}`;
    info.append(aksi);
    card.append(foto, info);
    return card;
}

function pasangMenu({ box, tabs, isi }, daftar, alergiUser) {
    const semuaTanggal = [...new Set(daftar.map(item => item.jadwal.date))].sort();
    const tampil = tanggal => {
        isi.replaceChildren(
            ...daftar.filter(item => item.jadwal.date === tanggal).map(item => kartuMenu(item, alergiUser)),
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
}
