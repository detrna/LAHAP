import { pilihBanyak } from "../ui/pilih-banyak.js";

export function pilihAlergi(wadah) {
    const pemilih = pilihBanyak(wadah, {
        placeholder: "Pilih alergi",
        cari: "Cari alergi",
        kosong: "Alergi tidak ditemukan.",
        tanpaOpsi: "Belum ada alergi.",
    });
    return {
        ...pemilih,
        setAlergi: daftar => pemilih.setOpsi(daftar.map(item => ({ value: item.id, label: item.name }))),
    };
}
