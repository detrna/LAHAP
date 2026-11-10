import "../layout/boot.js";
import { api } from "../core/api.js";
import { currentUser, homeFor } from "../core/session.js";
import {
    alergiSaya,
    kartuPaket,
    menuUtama,
    muatMenu,
    muatPaket,
    pasangFooter,
    pasangMenu,
} from "../features/katalog.js";
import { fotoTier, teksDiskon } from "../features/tier.js";
import { $, el, isiFoto } from "../ui/dom.js";

async function muat() {
    $("#galatMuat").hidden = true;
    $("#kosongPaket").hidden = true;
    $("#boxPaket").hidden = false;
    $("#paket").setAttribute("aria-busy", "true");
    let tersedia;
    try {
        tersedia = await muatPaket();
    } catch {
        $("#paket").replaceChildren();
        $("#paket").removeAttribute("aria-busy");
        $("#boxPaket").hidden = true;
        $("#boxMenu").hidden = true;
        $("#galatMuat").hidden = false;
        return;
    }
    $("#paket").removeAttribute("aria-busy");
    $("#paket").replaceChildren(...tersedia.map(kartuPaket));
    $("#boxPaket").hidden = tersedia.length === 0;
    $("#kosongPaket").hidden = tersedia.length > 0;
    const { daftar, gagal } = await muatMenu(tersedia);
    if (gagal) $("#galatMuat").hidden = false;
    const berfoto = daftar.map(item => menuUtama(item.jadwal)).find(menu => menu.photoUrl);
    if (berfoto) isiFoto($("#heroFoto"), berfoto.photoUrl, berfoto.name, "Foto menu");
    pasangMenu({ box: $("#boxMenu"), tabs: $("#tabs"), isi: $("#isiMenu") }, daftar, alergiSaya());
}

function kartuTier(tier) {
    const card = el("article", "card row");
    const info = el("div", "flex-1");
    info.append(el("h3", "t-h3", tier.name), el("p", "t-muted", teksDiskon(tier)));
    card.append(fotoTier(tier, "tier-foto tier-foto--kecil"), info);
    return card;
}

async function muatTier() {
    try {
        const { data } = await api("/tiers", { auth: false });
        $("#tier").replaceChildren(...data.map(kartuTier));
        $("#boxTier").hidden = data.length === 0;
    } catch {
        $("#boxTier").hidden = true;
    }
}

const user = currentUser();
if (user) {
    $("#masuk").href = homeFor(user);
    $("#masuk").textContent = "Buka Dashboard";
}
$("#ulang").onclick = muat;
pasangFooter($("#footer"));
muatTier();
muat();
