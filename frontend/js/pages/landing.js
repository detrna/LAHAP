import "../layout/boot.js";
import { api } from "../core/api.js";
import { currentUser, homeFor, redirectAman } from "../core/session.js";
import { bukaMasuk } from "../features/auth-modal.js";
import { kartuPaket, muatPaket, pasangFooter } from "../features/katalog.js";
import { fotoTier, teksDiskon } from "../features/tier.js";
import { $, el } from "../ui/dom.js";

const BATAS_PAKET = 3;

async function muat() {
    $("#galatMuat").hidden = true;
    $("#kosongPaket").hidden = true;
    $("#boxPaket").hidden = false;
    $("#paket").setAttribute("aria-busy", "true");
    let hasil;
    try {
        hasil = await muatPaket(BATAS_PAKET);
    } catch {
        $("#paket").replaceChildren();
        $("#paket").removeAttribute("aria-busy");
        $("#boxPaket").hidden = true;
        $("#galatMuat").hidden = false;
        return;
    }
    const { daftar, total } = hasil;
    $("#paket").removeAttribute("aria-busy");
    $("#paket").replaceChildren(...daftar.map(kartuPaket));
    $("#semuaPaket").hidden = total <= daftar.length;
    $("#boxPaket").hidden = daftar.length === 0;
    $("#kosongPaket").hidden = daftar.length > 0;
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
const params = new URLSearchParams(location.search);
const redirect = redirectAman(params.get("redirect"));
if (user) {
    $("#masuk").href = homeFor(user);
    $("#masuk").textContent = "Buka Dashboard";
    if (params.has("masuk")) location.replace(redirect || homeFor(user));
} else {
    $("#masuk").addEventListener("click", event => {
        event.preventDefault();
        bukaMasuk({ redirect, pemicu: $("#masuk") });
    });
    if (params.has("masuk")) bukaMasuk({ redirect });
}
$("#ulang").onclick = muat;
pasangFooter($("#footer"));
muatTier();
muat();
