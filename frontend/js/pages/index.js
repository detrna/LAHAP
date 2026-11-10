import "../layout/boot.js";
import { api } from "../core/api.js";
import { errorMessage } from "../core/errors.js";
import { alergiSaya, barisPaket, muatMenu, pasangFooter } from "../features/katalog.js";
import { $ } from "../ui/dom.js";
import { renderPager } from "../ui/pager.js";

const BATAS = 12;
const RENTANG_MENU = { dariHari: 1, sampaiHari: 14 };
let halaman = 1;
let urutan = 0;

async function muat() {
    const nomor = ++urutan;
    $("#err").hidden = true;
    $("#kosongPaket").hidden = true;
    $("#paket").setAttribute("aria-busy", "true");
    const query = new URLSearchParams({ page: String(halaman), limit: String(BATAS) });
    let hasil;
    try {
        hasil = await api(`/packages?${query}`, { auth: false });
    } catch (error) {
        if (nomor !== urutan) return;
        $("#paket").replaceChildren();
        $("#paket").removeAttribute("aria-busy");
        $("#pager").hidden = true;
        $("#err .msg").textContent = errorMessage(error);
        $("#err").hidden = false;
        return;
    }
    if (nomor !== urutan) return;
    const { data: daftar, meta } = hasil;
    const { daftar: menu } = await muatMenu(daftar, RENTANG_MENU);
    if (nomor !== urutan) return;
    const alergi = alergiSaya();
    $("#paket").removeAttribute("aria-busy");
    $("#paket").replaceChildren(
        ...daftar.map(paket =>
            barisPaket(paket, menu.filter(item => item.paket.id === paket.id), alergi),
        ),
    );
    $("#kosongPaket").hidden = daftar.length > 0;
    renderPager($("#pager"), meta, ke => {
        halaman = ke;
        muat();
        $("#paket").scrollIntoView({ block: "start", behavior: "smooth" });
    });
}

$("#ulang").onclick = muat;
pasangFooter($("#footer"));
muat();
