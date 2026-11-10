import { el } from "./dom.js";

let nomor = 0;

export function pilihBanyak(
    wadah,
    { placeholder = "Pilih", cari = "Cari", kosong = "Tidak ditemukan.", tanpaOpsi = "Belum ada pilihan." } = {},
) {
    const id = wadah.id || `pilih-banyak-${++nomor}`;
    wadah.removeAttribute("id");
    wadah.removeAttribute("aria-busy");
    wadah.className = "pilih-banyak";

    const label = wadah.closest(".field")?.querySelector(".field-label");
    if (label && !label.id) label.id = `${id}-label`;

    const ringkas = el("span", "pilih-banyak-ringkas", placeholder);
    ringkas.id = `${id}-ringkas`;
    const tombol = el("button", "select input pilih-banyak-tombol");
    tombol.type = "button";
    tombol.id = id;
    tombol.disabled = true;
    tombol.setAttribute("aria-expanded", "false");
    tombol.setAttribute("aria-controls", `${id}-panel`);
    tombol.setAttribute("aria-labelledby", [label?.id, ringkas.id].filter(Boolean).join(" "));
    tombol.append(ringkas);

    const panel = el("div", "pilih-banyak-panel");
    panel.id = `${id}-panel`;
    panel.hidden = true;
    const kotakCari = el("input", "input pilih-banyak-cari");
    kotakCari.type = "search";
    kotakCari.placeholder = cari;
    kotakCari.autocomplete = "off";
    kotakCari.setAttribute("aria-label", cari);
    const daftar = el("div", "pilih-banyak-daftar");
    daftar.setAttribute("role", "group");
    if (label) daftar.setAttribute("aria-labelledby", label.id);
    const pesanKosong = el("p", "pilih-banyak-kosong", kosong);
    pesanKosong.hidden = true;
    pesanKosong.setAttribute("aria-live", "polite");
    panel.append(kotakCari, daftar, pesanKosong);
    wadah.replaceChildren(tombol, panel);

    let opsi = [];
    let dipilih = new Set();
    let dimuat = false;

    function nilai() {
        if (!opsi.length) return [...dipilih];
        return opsi.filter(o => dipilih.has(o.value)).map(o => o.value);
    }

    function segarkanRingkas() {
        const nama = opsi.filter(o => dipilih.has(o.value)).map(o => o.label);
        const teks = nama.length >= 3 ? `${nama.length} dipilih: ${nama.join(", ")}` : nama.join(", ");
        ringkas.textContent = teks || (dimuat && !opsi.length ? tanpaOpsi : placeholder);
        tombol.classList.toggle("is-kosong", !teks);
        tombol.title = teks;
    }

    function saring() {
        const kata = kotakCari.value.trim().toLowerCase();
        let tampil = 0;
        daftar.querySelectorAll(".pilih-banyak-opsi").forEach(baris => {
            const cocok = !kata || baris.dataset.cari.includes(kata);
            baris.hidden = !cocok;
            if (cocok) tampil += 1;
        });
        pesanKosong.hidden = tampil > 0;
    }

    function render() {
        daftar.replaceChildren(
            ...opsi.map(o => {
                const baris = el("label", "pilih-banyak-opsi");
                baris.dataset.cari = o.label.toLowerCase();
                const kotak = el("input");
                kotak.type = "checkbox";
                kotak.value = o.value;
                kotak.checked = dipilih.has(o.value);
                baris.append(kotak, el("span", "", o.label));
                return baris;
            }),
        );
        tombol.disabled = !opsi.length;
        if (!opsi.length) tutup();
        segarkanRingkas();
        saring();
    }

    function diLuar(event) {
        if (!wadah.contains(event.target)) tutup();
    }

    function buka() {
        if (tombol.disabled) return;
        panel.hidden = false;
        tombol.setAttribute("aria-expanded", "true");
        document.addEventListener("pointerdown", diLuar);
        kotakCari.focus();
    }

    function tutup({ fokus = false } = {}) {
        if (panel.hidden) return;
        panel.hidden = true;
        tombol.setAttribute("aria-expanded", "false");
        document.removeEventListener("pointerdown", diLuar);
        kotakCari.value = "";
        saring();
        if (fokus) tombol.focus();
    }

    tombol.addEventListener("click", () => (panel.hidden ? buka() : tutup()));
    kotakCari.addEventListener("input", saring);
    kotakCari.addEventListener("keydown", event => {
        if (event.key === "Enter") event.preventDefault();
    });
    daftar.addEventListener("change", event => {
        const kotak = event.target;
        if (kotak.checked) dipilih.add(kotak.value);
        else dipilih.delete(kotak.value);
        segarkanRingkas();
    });
    wadah.addEventListener("keydown", event => {
        if (event.key !== "Escape" || panel.hidden) return;
        event.preventDefault();
        event.stopPropagation();
        tutup({ fokus: true });
    });
    wadah.addEventListener("focusout", event => {
        if (event.relatedTarget && !wadah.contains(event.relatedTarget)) tutup();
    });

    segarkanRingkas();

    return {
        tombol,
        nilai,
        setOpsi(daftarBaru) {
            dimuat = true;
            opsi = daftarBaru.map(o => ({ value: String(o.value), label: String(o.label) }));
            const ada = new Set(opsi.map(o => o.value));
            dipilih = new Set([...dipilih].filter(v => ada.has(v)));
            render();
        },
        setNilai(nilaiBaru) {
            dipilih = new Set((nilaiBaru || []).map(String));
            daftar.querySelectorAll("input").forEach(kotak => (kotak.checked = dipilih.has(kotak.value)));
            segarkanRingkas();
        },
        tutup,
    };
}
