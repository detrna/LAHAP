import { errorMessage } from "../core/errors.js";
import { el } from "./dom.js";

export function panelKonfirmasi(wadah, { judul, teks, alasan = false, tombol, bahaya = false, onKirim }) {
    const lama = wadah.querySelector(":scope > .panel-konfirmasi");
    if (lama) {
        lama.remove();
        return;
    }
    const panel = el("div", "alert alert--warning panel-konfirmasi stack");
    panel.setAttribute("role", "group");
    panel.setAttribute("aria-label", judul);
    panel.append(el("span", "alert-title", judul), el("span", "", teks));
    let isian = null;
    if (alasan) {
        const field = el("div", "field");
        const label = el("label", "", "Alasan (opsional)");
        isian = el("textarea", "textarea");
        isian.maxLength = 500;
        isian.id = `alasan-${Math.random().toString(36).slice(2, 8)}`;
        label.htmlFor = isian.id;
        field.append(label, isian);
        panel.append(field);
    }
    const galat = el("p", "error-msg");
    galat.hidden = true;
    const baris = el("div", "row");
    const kirim = el("button", `btn ${bahaya ? "btn-danger" : "btn-primary"} btn-sm`, tombol);
    kirim.type = "button";
    const batal = el("button", "btn btn-ghost btn-sm", "Batal");
    batal.type = "button";
    batal.onclick = () => panel.remove();
    kirim.onclick = async () => {
        kirim.disabled = true;
        batal.disabled = true;
        galat.hidden = true;
        try {
            await onKirim(isian ? isian.value.trim() : "");
            panel.remove();
        } catch (error) {
            galat.textContent = errorMessage(error);
            galat.hidden = false;
            kirim.disabled = false;
            batal.disabled = false;
        }
    };
    baris.append(kirim, batal);
    panel.append(galat, baris);
    wadah.append(panel);
    (isian || kirim).focus();
}
