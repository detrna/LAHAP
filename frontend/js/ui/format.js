export const WIB = { timeZone: "Asia/Jakarta" };

const GAYA_TANGGAL = {
    pendek: { day: "numeric", month: "short" },
    sedang: { day: "numeric", month: "short", year: "numeric" },
    panjang: { day: "numeric", month: "long", year: "numeric" },
    hari: { weekday: "long", day: "numeric", month: "short" },
    waktu: { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" },
};

export const rp = n => "Rp" + Math.round(n).toLocaleString("id-ID");

export const angka = n => Number(n).toLocaleString("id-ID", { maximumFractionDigits: 2 });

export const hariIni = () => new Date().toLocaleDateString("sv-SE", WIB);

export function tambahHari(tanggal, n) {
    const d = new Date(`${tanggal}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
}

export const awalMinggu = tanggal => tambahHari(tanggal, -((new Date(`${tanggal}T00:00:00Z`).getUTCDay() + 6) % 7));

export function formatTanggal(nilai, gaya = "sedang") {
    const opsi = typeof gaya === "string" ? GAYA_TANGGAL[gaya] : gaya;
    const waktu = new Date(nilai.length === 10 ? `${nilai}T00:00:00+07:00` : nilai);
    return waktu.toLocaleString("id-ID", { ...WIB, ...opsi });
}

export const jam = nilai => new Date(nilai).toLocaleTimeString("id-ID", { ...WIB, hour: "2-digit", minute: "2-digit" });

export const tanggalInput = nilai => (nilai ? new Date(nilai).toLocaleDateString("sv-SE", WIB) : "");

export const labelWaktu = waktu => (waktu ? `${waktu.range} ${waktu.time}` : "");
