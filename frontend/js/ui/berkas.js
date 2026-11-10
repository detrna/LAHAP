import { el } from "./dom.js";
import { toast } from "./toast.js";

const IKON =
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/></svg>';

const penyegar = new WeakMap();

function ukuran(byte) {
    if (byte < 1024 * 1024) return `${Math.max(1, Math.round(byte / 1024)).toLocaleString("id-ID")} KB`;
    return `${(byte / (1024 * 1024)).toLocaleString("id-ID", { maximumFractionDigits: 1 })} MB`;
}

function diterima(file, accept) {
    if (!accept) return true;
    const nama = file.name.toLowerCase();
    return accept.split(",").some(jenis => {
        const t = jenis.trim().toLowerCase();
        if (t.startsWith(".")) return nama.endsWith(t);
        if (t.endsWith("/*")) return file.type.startsWith(t.slice(0, -1));
        return file.type === t;
    });
}

function namaBerkas(nama) {
    const titik = nama.lastIndexOf(".");
    const wadah = el("span", "file-pick-nama");
    wadah.append(el("span", "file-pick-dasar", titik > 0 ? nama.slice(0, titik) : nama));
    if (titik > 0) wadah.append(el("span", "", nama.slice(titik)));
    return wadah;
}

export function pilihBerkas(input, { teks = "Pilih foto", ringkas = false } = {}) {
    if (penyegar.has(input)) return;
    const wadah = el("div", "file-pick");
    if (ringkas) wadah.classList.add("file-pick-inline");
    if (input.classList.contains("flex-1")) wadah.classList.add("flex-1");
    input.classList.remove("input", "flex-1");
    input.classList.add("file-pick-input");
    input.replaceWith(wadah);

    const zona = el("div", "file-pick-zone");
    const ikon = el("span", "file-pick-ikon");
    ikon.innerHTML = IKON;
    const keterangan = el("span", "file-pick-teks");
    keterangan.id = `${input.id}-berkas`;
    keterangan.setAttribute("aria-live", "polite");
    zona.append(ikon, keterangan);

    const hapus = el("button", "btn btn-ghost btn-sm", "Hapus");
    hapus.type = "button";
    hapus.setAttribute("aria-label", "Hapus foto yang dipilih");
    wadah.append(input, zona, hapus);

    const deskripsi = input.getAttribute("aria-describedby");
    input.setAttribute("aria-describedby", [deskripsi, keterangan.id].filter(Boolean).join(" "));

    function segarkan() {
        const file = input.files && input.files[0];
        wadah.classList.toggle("has-file", Boolean(file));
        hapus.hidden = !file;
        zona.title = file ? file.name : "";
        if (file) {
            keterangan.replaceChildren(
                namaBerkas(file.name),
                el("span", "file-pick-sub", `${ukuran(file.size)} · klik untuk ganti`),
            );
        } else {
            keterangan.replaceChildren(
                el("span", "file-pick-judul", teks),
                el("span", "file-pick-sub", "atau seret ke sini"),
            );
        }
    }
    penyegar.set(input, segarkan);

    zona.addEventListener("click", () => {
        if (!input.disabled) input.click();
    });
    input.addEventListener("change", segarkan);
    hapus.addEventListener("click", () => {
        kosongkanBerkas(input);
        input.dispatchEvent(new Event("change", { bubbles: true }));
        input.focus();
    });

    let kedalaman = 0;
    wadah.addEventListener("dragenter", event => {
        event.preventDefault();
        if (input.disabled) return;
        kedalaman += 1;
        wadah.classList.add("is-drag");
    });
    wadah.addEventListener("dragover", event => {
        event.preventDefault();
        if (event.dataTransfer) event.dataTransfer.dropEffect = input.disabled ? "none" : "copy";
    });
    wadah.addEventListener("dragleave", () => {
        kedalaman = Math.max(0, kedalaman - 1);
        if (!kedalaman) wadah.classList.remove("is-drag");
    });
    wadah.addEventListener("drop", event => {
        event.preventDefault();
        kedalaman = 0;
        wadah.classList.remove("is-drag");
        if (input.disabled || !event.dataTransfer) return;
        const file = [...event.dataTransfer.files].find(f => diterima(f, input.accept));
        if (!file) {
            if (event.dataTransfer.files.length) toast("Pilih foto JPEG, PNG, atau WebP.", "error");
            return;
        }
        const transfer = new DataTransfer();
        transfer.items.add(file);
        input.files = transfer.files;
        input.dispatchEvent(new Event("change", { bubbles: true }));
    });

    segarkan();
}

export function kosongkanBerkas(input) {
    input.value = "";
    const segarkan = penyegar.get(input);
    if (segarkan) segarkan();
}
