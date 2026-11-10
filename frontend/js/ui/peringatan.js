import { el } from "./dom.js";

let nomor = 0;

export function peringatan({ judul, akibat = [], tombol = "Lanjutkan", bahaya = false }) {
    return new Promise(selesai => {
        const id = `peringatan-${++nomor}`;
        const pemicu = document.activeElement;
        const dialog = el("dialog", "modal peringatan");
        dialog.setAttribute("aria-labelledby", `${id}-judul`);
        dialog.setAttribute("aria-describedby", `${id}-akibat`);
        const kotak = el("div", "modal-box");
        const kepala = el("h2", "t-h2", judul);
        kepala.id = `${id}-judul`;
        const daftar = el("ul", `alert ${bahaya ? "alert--error" : "alert--warning"} peringatan-akibat`);
        daftar.id = `${id}-akibat`;
        daftar.append(...akibat.filter(Boolean).map(teks => el("li", "", teks)));
        const batal = el("button", "btn btn-ghost", "Batal");
        batal.type = "button";
        const ya = el("button", `btn ${bahaya ? "btn-danger" : "btn-primary"}`, tombol);
        ya.type = "button";
        const baris = el("div", "row peringatan-aksi");
        baris.append(batal, ya);
        kotak.append(kepala, ...(daftar.children.length ? [daftar] : []), baris);
        dialog.append(kotak);

        let jawaban = false;
        batal.onclick = () => dialog.close();
        ya.onclick = () => {
            jawaban = true;
            dialog.close();
        };
        dialog.addEventListener("click", event => {
            if (event.target === dialog) dialog.close();
        });
        dialog.addEventListener("close", () => {
            document.body.classList.remove("modal-open");
            dialog.remove();
            if (pemicu && pemicu.isConnected && typeof pemicu.focus === "function") pemicu.focus();
            selesai(jawaban);
        });

        document.body.append(dialog);
        document.body.classList.add("modal-open");
        dialog.showModal();
        (bahaya ? batal : ya).focus();
    });
}
