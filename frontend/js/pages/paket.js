import "../layout/boot.js";
import { api, ApiError } from "../core/api.js";
import { errorMessage } from "../core/errors.js";
import { muatBisnis } from "../features/bisnis.js";
import { alergiSaya, muatMenu, pasangFooter, pasangMenu, tombolPesan } from "../features/katalog.js";
import { $, el, isiFoto } from "../ui/dom.js";
import { formatTanggal, labelWaktu, rp } from "../ui/format.js";

const idPaket = new URLSearchParams(location.search).get("id");
const RENTANG_DETAIL = { dariHari: 1, sampaiHari: 14 };

function tidakAda() {
    $("#muatan").hidden = true;
    $("#tidakAda").hidden = false;
    document.title = "Paket tidak ditemukan · LAHAP";
}

function tampilPaket(paket) {
    document.title = `${paket.name} · LAHAP`;
    isiFoto($("#foto"), paket.photoUrl, paket.name, "Foto paket");
    $("#nama").textContent = paket.name;
    $("#deskripsi").textContent = paket.description || "";
    $("#deskripsi").hidden = !paket.description;
    $("#harga").textContent = rp(paket.basePrice);
    $("#periode").replaceChildren(...(paket.periods || []).map(p => el("span", "chip chip-static", p)));
    $("#waktu").replaceChildren(...(paket.deliveryTimes || []).map(t => el("span", "chip chip-static", labelWaktu(t))));
    $("#masaJual").hidden = !paket.endAt;
    if (paket.endAt) $("#masaJual").textContent = `Bisa dipesan sampai ${formatTanggal(paket.endAt, "panjang")}`;
    $("#aksi").replaceChildren(tombolPesan(paket, "Pesan Paket Ini"));
    $("#muatan").hidden = true;
    $("#detail").hidden = false;
    $("#info").hidden = false;
}

async function tampilAlamat() {
    const bisnis = await muatBisnis();
    if (bisnis)
        $("#teksAntar").textContent =
            `Pesanan bisa diantar ke alamatmu atau diambil sendiri di ${bisnis.address}. Ongkir dihitung dari jarak titik antar dan tampil sebelum kamu membayar.`;
}

async function muat() {
    $("#err").hidden = true;
    $("#muatan").hidden = false;
    if (!idPaket) return tidakAda();
    let paket;
    try {
        ({ data: paket } = await api(`/packages/${encodeURIComponent(idPaket)}`, { auth: false }));
    } catch (error) {
        if (error instanceof ApiError && (error.status === 404 || error.status === 400)) return tidakAda();
        $("#muatan").hidden = true;
        $("#err .msg").textContent = errorMessage(error);
        $("#err").hidden = false;
        return;
    }
    tampilPaket(paket);
    tampilAlamat();
    const { daftar, gagal } = await muatMenu([paket], RENTANG_DETAIL);
    $("#galatMenu").hidden = !gagal;
    const jumlah = pasangMenu({ box: $("#boxMenu"), tabs: $("#tabs"), isi: $("#isiMenu") }, daftar, alergiSaya(), {
        tampilPaket: false,
        tampilAksi: false,
        rinci: true,
    });
    $("#kosongMenu").hidden = gagal || jumlah > 0;
}

$("#ulang").onclick = muat;
pasangFooter($("#footer"));
muat();
