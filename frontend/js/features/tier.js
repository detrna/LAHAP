import { el, isiFoto } from "../ui/dom.js";
import { formatTanggal } from "../ui/format.js";

export function teksDiskon(tier) {
    return tier.discountPercent > 0 ? `Diskon ${tier.discountPercent.toLocaleString("id-ID")}%` : "Tanpa diskon";
}

export function teksSyarat(tier) {
    const berlaku =
        tier.discountPercent > 0 ? ` Berlaku ${tier.durationDays} hari sejak pesanan terakhir dibayar.` : "";
    const dapat =
        tier.requiredSubscriptionDays > 0
            ? `Dapat setelah ${tier.requiredSubscriptionDays} hari langganan.`
            : "Didapat setelah pesanan pertama dibayar.";
    return dapat + berlaku;
}

export function fotoTier(tier, className = "tier-foto") {
    const foto = el("div", className);
    isiFoto(foto, tier.photoUrl, `Medali tier ${tier.name}`, tier.name);
    return foto;
}

export function tampilTierSaya(box, m) {
    const tier = m.membership && m.membership.tier;
    const kepala = el("div", "row-between");
    kepala.append(el("span", "t-h3", tier ? `Tier ${tier.name}` : "Belum punya tier"));
    if (tier) kepala.append(el("span", "badge badge--ready", `Diskon ${tier.discountPercent}%`));
    const info = el("p", "t-small t-muted", `${m.subscriptionDays} hari langganan terbayar.`);
    box.replaceChildren(kepala, info);
    if (m.nextTier && m.daysToNextTier != null) {
        const total = m.subscriptionDays + m.daysToNextTier;
        const bar = el("div", "progress");
        bar.style.margin = "8px 0";
        const isi = el("span");
        isi.style.width = `${total ? Math.min(100, (m.subscriptionDays / total) * 100) : 0}%`;
        bar.append(isi);
        box.append(bar, el("p", "t-small t-muted", `${m.daysToNextTier} hari lagi menuju ${m.nextTier.name}.`));
    }
    if (m.membership && m.membership.expiresAt)
        box.append(el("p", "t-small t-muted", `Tier berlaku sampai ${formatTanggal(m.membership.expiresAt)}.`));
}
