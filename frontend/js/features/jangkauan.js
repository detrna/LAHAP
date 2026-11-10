const warna = nama => getComputedStyle(document.documentElement).getPropertyValue(nama).trim();

const angka = nilai => (nilai == null || nilai === "" || !Number.isFinite(Number(nilai)) ? null : Number(nilai));

const sudahDisesuaikan = new WeakSet();

export function radiusJangkauan(bisnis, paket = null) {
    return {
        bebasKm: angka(paket && paket.deliveryFreeRadius) ?? angka(bisnis && bisnis.deliveryFreeRadius),
        maksKm: angka(paket && paket.deliveryMaxDistance) ?? angka(bisnis && bisnis.deliveryMaxDistance),
    };
}

export function titikDapur(bisnis) {
    if (!bisnis || bisnis.latitude == null || bisnis.longitude == null) return null;
    return { lat: Number(bisnis.latitude), lng: Number(bisnis.longitude) };
}

export function penandaDapur(bisnis) {
    const dapur = titikDapur(bisnis);
    if (!dapur) return null;
    const nama = bisnis.name || "LAHAP";
    return { ...dapur, judul: nama.startsWith("Dapur") ? nama : `Dapur ${nama}` };
}

export function gambarJangkauan(
    peta,
    {
        pusat = null,
        bebasKm = null,
        maksKm = null,
        legenda = null,
        teksMaks = "batas antar",
        catatan = null,
        sesuaikan = false,
    },
) {
    if (!peta) return;
    const daftar = [
        {
            km: maksKm,
            warna: warna("--danger") || "#991B1B",
            dashArray: "6, 6",
            fillColor: "#EF4444",
            fillOpacity: 0.04,
            teks: teksMaks,
            putus: true,
        },
        {
            km: bebasKm,
            warna: warna("--success-text") || "#166534",
            fillColor: "#22C55E",
            fillOpacity: 0.08,
            teks: "gratis ongkir",
            putus: false,
        },
    ].filter(c => c.km > 0);
    peta.aturLingkaran(daftar, pusat);
    if (legenda) {
        legenda.hidden = !daftar.length;
        const baris = daftar.map(c => {
            const li = document.createElement("li");
            const swatch = document.createElement("span");
            swatch.className = c.putus ? "swatch swatch--dashed" : "swatch";
            swatch.style.color = c.warna;
            li.append(swatch, `${c.teks[0].toUpperCase()}${c.teks.slice(1)} sampai ${c.km} km`);
            return li;
        });
        if (catatan) baris.push(Object.assign(document.createElement("li"), { textContent: catatan }));
        legenda.replaceChildren(...baris);
    }
    if (sesuaikan && daftar.length && !sudahDisesuaikan.has(peta)) {
        sudahDisesuaikan.add(peta);
        peta.tampilkanSemua();
    }
}
