export function renderPager(container, meta, onPage) {
    const halaman = Math.max(1, Math.ceil(meta.total / meta.limit));
    container.hidden = halaman <= 1;
    const tombol = (label, ke, aktif) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "btn btn-ghost btn-sm";
        b.textContent = label;
        b.disabled = !aktif;
        b.onclick = () => onPage(ke);
        return b;
    };
    const info = document.createElement("span");
    info.className = "t-small t-muted";
    info.textContent = `Halaman ${meta.page} dari ${halaman}`;
    container.className = "row-between";
    container.replaceChildren(
        tombol("Sebelumnya", meta.page - 1, meta.page > 1),
        info,
        tombol("Berikutnya", meta.page + 1, meta.page < halaman),
    );
}
