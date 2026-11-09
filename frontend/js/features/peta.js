const PETA_PUSAT_BAWAAN = { lat: -7.9666, lng: 112.6326 };
const PETA_ZOOM_BAWAAN = 13;
const PETA_ZOOM_TITIK = 16;
const PETA_JEDA_CARI_MS = 1100;

function koordinatValid(lat, lng) {
    return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

function bulatkanKoordinat(nilai) {
    return Number(Number(nilai).toFixed(6));
}

export function pasangPeta(wadah, opsi = {}) {
    const {
        titik = null,
        pusat = PETA_PUSAT_BAWAAN,
        label = "Peta lokasi",
        petunjuk = "Ketuk peta untuk menaruh pin, lalu geser bila perlu.",
        masukan = null,
        cari = true,
        lokasiSaya = true,
        onPilih = () => {},
    } = opsi;
    const buat = (tag, kelas, teks) => {
        const n = document.createElement(tag);
        if (kelas) n.className = kelas;
        if (teks !== undefined) n.textContent = teks;
        return n;
    };

    let pin = null;
    let peta = null;
    let marker = null;
    let lingkaran = [];
    let daftarLingkaran = [];
    let terakhirCari = 0;

    const kanvas = buat("div", "map-box map-canvas");
    kanvas.setAttribute("aria-label", label);
    const status = buat("p", "hint map-status", petunjuk);
    status.setAttribute("role", "status");
    const hasil = buat("ul", "map-results");
    hasil.hidden = true;
    const alat = buat("div", "map-tools");
    const kotakCari = buat("input", "input");
    const tombolCari = buat("button", "btn btn-secondary btn-sm", "Cari");
    const tombolLokasi = buat("button", "btn btn-ghost btn-sm", "Lokasi saya");
    tombolCari.type = "button";
    tombolLokasi.type = "button";
    kotakCari.type = "search";
    kotakCari.placeholder = "Cari jalan, kelurahan, atau tempat";
    kotakCari.setAttribute("aria-label", "Cari alamat di peta");
    ["input", "change"].forEach(jenis => kotakCari.addEventListener(jenis, event => event.stopPropagation()));
    if (cari) alat.append(kotakCari, tombolCari);
    if (lokasiSaya && "geolocation" in navigator) alat.append(tombolLokasi);
    wadah.classList.add("map-picker");
    wadah.replaceChildren(...(alat.childElementCount ? [alat] : []), hasil, kanvas, status);

    const teksPin = () => (pin ? `Pin: ${bulatkanKoordinat(pin.lat)}, ${bulatkanKoordinat(pin.lng)}` : petunjuk);

    function gambarLingkaran() {
        lingkaran.forEach(c => c.remove());
        lingkaran = [];
        if (!peta || !pin) return;
        lingkaran = daftarLingkaran.map(c =>
            L.circle([pin.lat, pin.lng], {
                radius: c.km * 1000,
                color: c.warna,
                weight: 2,
                fillOpacity: 0.06,
                interactive: false,
            }).addTo(peta),
        );
    }

    function taruh(baru, { geser = false, kabari = true, tulis = true, zoom = null, pesan = null } = {}) {
        pin = { lat: baru.lat, lng: baru.lng };
        if (peta) {
            if (marker) marker.setLatLng([pin.lat, pin.lng]);
            else {
                marker = L.marker([pin.lat, pin.lng], {
                    draggable: true,
                    title: "Pin lokasi",
                    alt: "Pin lokasi",
                }).addTo(peta);
                marker.on("dragend", () => {
                    const posisi = marker.getLatLng();
                    taruh({ lat: bulatkanKoordinat(posisi.lat), lng: bulatkanKoordinat(posisi.lng) });
                });
            }
            if (geser) peta.setView([pin.lat, pin.lng], zoom ?? Math.max(peta.getZoom(), PETA_ZOOM_TITIK));
            gambarLingkaran();
        }
        if (tulis && masukan) {
            masukan.lat.value = pin.lat;
            masukan.lng.value = pin.lng;
        }
        status.textContent = pesan ? `${pesan} ${teksPin()}` : teksPin();
        if (kabari) onPilih({ ...pin });
    }

    function hapus() {
        pin = null;
        if (marker) marker.remove();
        marker = null;
        gambarLingkaran();
        if (peta) peta.setView([pusat.lat, pusat.lng], PETA_ZOOM_BAWAAN);
        status.textContent = petunjuk;
    }

    function pilihHasil(item, tombol) {
        hasil.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b === tombol)));
        taruh(
            { lat: bulatkanKoordinat(item.lat), lng: bulatkanKoordinat(item.lon) },
            { geser: true, zoom: 17, pesan: "Periksa posisi pin, hasil pencarian bisa meleset." },
        );
    }

    async function cariAlamat() {
        const q = kotakCari.value.trim();
        if (!q) return kotakCari.focus();
        const tunggu = terakhirCari + PETA_JEDA_CARI_MS - Date.now();
        if (tunggu > 0) await new Promise(selesai => setTimeout(selesai, tunggu));
        terakhirCari = Date.now();
        tombolCari.disabled = true;
        status.textContent = "Mencari alamat…";
        const params = new URLSearchParams({
            format: "jsonv2",
            q,
            countrycodes: "id",
            limit: "5",
            "accept-language": "id",
        });
        if (peta) params.set("viewbox", peta.getBounds().pad(2).toBBoxString());
        try {
            const respons = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
                headers: { Accept: "application/json" },
            });
            if (!respons.ok) throw new Error(String(respons.status));
            const daftar = await respons.json();
            hasil.replaceChildren();
            hasil.hidden = daftar.length < 2;
            if (!daftar.length) {
                status.textContent = "Alamat tidak ditemukan. Coba nama jalan atau kelurahan, atau ketuk peta.";
                return;
            }
            const tombolHasil = daftar.map(item => {
                const b = buat("button", "map-result", item.display_name);
                b.type = "button";
                b.onclick = () => pilihHasil(item, b);
                const li = buat("li");
                li.append(b);
                hasil.append(li);
                return b;
            });
            pilihHasil(daftar[0], tombolHasil[0]);
        } catch {
            status.textContent = "Pencarian alamat gagal. Coba lagi atau ketuk peta.";
        } finally {
            tombolCari.disabled = false;
        }
    }

    tombolCari.onclick = cariAlamat;
    kotakCari.addEventListener("keydown", event => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        cariAlamat();
    });
    tombolLokasi.onclick = () => {
        status.textContent = "Mencari lokasi Anda…";
        navigator.geolocation.getCurrentPosition(
            posisi => {
                const akurasi = Math.round(posisi.coords.accuracy);
                taruh(
                    { lat: bulatkanKoordinat(posisi.coords.latitude), lng: bulatkanKoordinat(posisi.coords.longitude) },
                    { geser: true, zoom: 17, pesan: `Lokasi ditemukan (akurasi ±${akurasi} m). Geser pin bila perlu.` },
                );
            },
            galat => {
                status.textContent =
                    galat.code === galat.PERMISSION_DENIED
                        ? "Izin lokasi ditolak. Izinkan di pengaturan browser, atau ketuk peta."
                        : "Lokasi tidak bisa didapat. Coba lagi atau ketuk peta.";
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
        );
    };

    if (masukan) {
        const dariMasukan = () => {
            if (masukan.lat.value.trim() === "" || masukan.lng.value.trim() === "") return;
            const lat = Number(masukan.lat.value);
            const lng = Number(masukan.lng.value);
            if (koordinatValid(lat, lng)) taruh({ lat, lng }, { geser: true, tulis: false });
        };
        masukan.lat.addEventListener("input", dariMasukan);
        masukan.lng.addEventListener("input", dariMasukan);
    }

    if (typeof L === "undefined") {
        kanvas.textContent = masukan
            ? "Peta tidak bisa dimuat. Isi koordinat secara manual di bawah."
            : "Peta tidak bisa dimuat. Periksa koneksi lalu muat ulang halaman.";
    } else {
        peta = L.map(kanvas, { scrollWheelZoom: false }).setView([pusat.lat, pusat.lng], PETA_ZOOM_BAWAAN);
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(peta);
        peta.once("focus click", () => peta.scrollWheelZoom.enable());
        peta.on("click", event =>
            taruh({ lat: bulatkanKoordinat(event.latlng.lat), lng: bulatkanKoordinat(event.latlng.lng) }),
        );
        let lebar = kanvas.clientWidth;
        new ResizeObserver(() => {
            const sebelumnya = lebar;
            lebar = kanvas.clientWidth;
            if (!lebar) return;
            peta.invalidateSize();
            if (!sebelumnya)
                peta.setView(
                    pin ? [pin.lat, pin.lng] : [pusat.lat, pusat.lng],
                    pin ? PETA_ZOOM_TITIK : PETA_ZOOM_BAWAAN,
                );
        }).observe(kanvas);
    }
    if (titik && koordinatValid(titik.lat, titik.lng)) taruh(titik, { geser: true, kabari: false, tulis: false });

    return {
        ambilTitik: () => (pin ? { ...pin } : null),
        setTitik(baru) {
            if (baru && koordinatValid(baru.lat, baru.lng)) taruh(baru, { geser: true, kabari: false, tulis: false });
            else hapus();
            hasil.hidden = true;
        },
        aturLingkaran(daftar) {
            daftarLingkaran = daftar.filter(c => c.km > 0);
            gambarLingkaran();
        },
        tampilkanSemua() {
            if (!peta || !pin) return;
            const terbesar = lingkaran.reduce((a, c) => (!a || c.getRadius() > a.getRadius() ? c : a), null);
            if (terbesar && peta.getSize().x) peta.fitBounds(terbesar.getBounds(), { padding: [16, 16] });
            else peta.setView([pin.lat, pin.lng], PETA_ZOOM_TITIK);
        },
    };
}
