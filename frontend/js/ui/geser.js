const gerakHalus = () => !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function langkah(rel) {
    const kartu = rel.firstElementChild;
    if (!kartu) return rel.clientWidth;
    const jarak = parseFloat(getComputedStyle(rel).columnGap) || 0;
    return kartu.getBoundingClientRect().width + jarak;
}

export function pasangGeser(wadah, rel, kiri, kanan) {
    const perbarui = () => {
        const sisa = rel.scrollWidth - rel.clientWidth;
        wadah.dataset.luber = String(sisa > 1);
        kiri.setAttribute("aria-disabled", String(rel.scrollLeft <= 1));
        kanan.setAttribute("aria-disabled", String(rel.scrollLeft >= sisa - 1));
    };
    const geser = arah => () => {
        if ((arah < 0 ? kiri : kanan).getAttribute("aria-disabled") === "true") return;
        rel.scrollBy({ left: arah * langkah(rel), behavior: gerakHalus() ? "smooth" : "auto" });
    };
    kiri.addEventListener("click", geser(-1));
    kanan.addEventListener("click", geser(1));
    rel.addEventListener("scroll", perbarui, { passive: true });
    new ResizeObserver(perbarui).observe(rel);
    new MutationObserver(perbarui).observe(rel, { childList: true });
    perbarui();
}
