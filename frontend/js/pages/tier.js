import "../layout/boot.js";
import { api, ensureToken } from "../core/api.js";
import { errorMessage } from "../core/errors.js";
import { currentUser } from "../core/session.js";
import { pasangFooter } from "../features/katalog.js";
import { fotoTier, tampilTierSaya, teksDiskon, teksSyarat } from "../features/tier.js";
import { $, el } from "../ui/dom.js";

function kartuTier(tier, punyaSaya) {
    const card = el("article", punyaSaya ? "card row tier-kartu tier-saya" : "card row tier-kartu");
    const info = el("div", "stack flex-1");
    const kepala = el("div", "row-between");
    kepala.append(el("h3", "t-h3", tier.name));
    if (punyaSaya) kepala.append(el("span", "badge badge--ready", "Tier kamu"));
    const diskon = tier.discountPercent > 0 ? `${teksDiskon(tier)} dari harga makanan` : teksDiskon(tier);
    info.append(kepala, el("p", "", diskon), el("p", "t-small t-muted", teksSyarat(tier)));
    if (tier.description) info.append(el("p", "t-small t-muted", tier.description));
    card.append(fotoTier(tier), info);
    return card;
}

async function muatMembership() {
    const user = currentUser();
    if (!user || user.role !== "CUSTOMER" || !(await ensureToken())) return null;
    try {
        const { data } = await api("/me/membership");
        return data;
    } catch {
        return null;
    }
}

async function muat() {
    $("#err").hidden = true;
    $("#boxTier").hidden = false;
    $("#tier").setAttribute("aria-busy", "true");
    const [tiers, member] = await Promise.allSettled([api("/tiers", { auth: false }), muatMembership()]);
    const saya = member.status === "fulfilled" ? member.value : null;
    $("#boxSaya").hidden = !saya;
    if (saya) tampilTierSaya($("#tierSaya"), saya);
    $("#tier").removeAttribute("aria-busy");
    if (tiers.status === "rejected") {
        $("#tier").replaceChildren();
        $("#boxTier").hidden = true;
        $("#err .msg").textContent = errorMessage(tiers.reason);
        $("#err").hidden = false;
        return;
    }
    const daftar = tiers.value.data;
    const aktif = saya && saya.membership && saya.membership.isActive ? saya.membership.tierId : null;
    $("#tier").replaceChildren(...daftar.map(tier => kartuTier(tier, tier.id === aktif)));
    $("#kosong").hidden = daftar.length > 0;
}

$("#ulang").onclick = muat;
pasangFooter($("#footer"));
muat();
