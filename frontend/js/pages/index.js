import "../layout/boot.js";
import { api } from "../core/api.js";
import { errorMessage } from "../core/errors.js";
import { alergiSaya, kartuPaket, muatMenu, pasangFooter, pasangMenu } from "../features/katalog.js";
import { $ } from "../ui/dom.js";
import { renderPager } from "../ui/pager.js";

const BATAS = 12;
let halaman = 1;
let urutan = 0;
let jeda = null;

async function muat() {
    const nomor = ++urutan;
    const cari = $("#cari").value.trim();
    $("#err").hidden = true;
    $("#kosongPaket").hidden = true;
    $("#paket").setAttribute("aria-busy", "true");
    const query = new URLSearchParams({ page: String(halaman), limit: String(BATAS) });
    if (cari) query.set("search", cari);
    let hasil;
    try {
        hasil = await api(`/packages?${query}`, { auth: false });
    } catch (error) {
        if (nomor !== urutan) return;
        $("#paket").replaceChildren();
        $("#paket").removeAttribute("aria-busy");
        $("#pager").hidden = true;
        $("#boxMenu").hidden = true;
        $("#err .msg").textContent = errorMessage(error);
        $("#err").hidden = false;
        return;
    }
    if (nomor !== urutan) return;
    const { data: daftar, meta } = hasil;
    $("#paket").removeAttribute("aria-busy");
    $("#paket").replaceChildren(...daftar.map(kartuPaket));
    $("#kosongPaket").textContent = cari
        ? "Tidak ada paket yang cocok dengan pencarian."
        : "Belum ada paket yang tersedia. Silakan cek lagi nanti.";
    $("#kosongPaket").hidden = daftar.length > 0;
    renderPager($("#pager"), meta, ke => {
        halaman = ke;
        muat();
        $("#paket").scrollIntoView({ block: "start", behavior: "smooth" });
    });
    const { daftar: menu, gagal } = await muatMenu(daftar);
    if (nomor !== urutan) return;
    $("#galatMenu").hidden = !gagal;
    pasangMenu({ box: $("#boxMenu"), tabs: $("#tabs"), isi: $("#isiMenu") }, menu, alergiSaya());
    if (gagal) $("#boxMenu").hidden = false;
}

$("#cari").addEventListener("input", () => {
    clearTimeout(jeda);
    jeda = setTimeout(() => {
        halaman = 1;
        muat();
    }, 300);
});
$("#ulang").onclick = muat;
pasangFooter($("#footer"));
muat();
