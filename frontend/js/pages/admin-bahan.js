import "../layout/boot.js";
import { api, fetchAll, upload } from "../core/api.js";
import { errorMessage, issuesText } from "../core/errors.js";
import { $, el, opsi } from "../ui/dom.js";
import { angka, hariIni, tambahHari } from "../ui/format.js";
import { showIssues, tampilGalat } from "../ui/forms.js";
import { renderPager } from "../ui/pager.js";
import { toast } from "../ui/toast.js";

const SATUAN = ["kg", "gram", "liter", "ml", "butir", "ikat"];
const galat = (isi, teks) => tampilGalat($("#err"), isi, teks);

let alergi = [],
    halaman = 1,
    terpilih = new Set(),
    sedangUbah = null,
    nomor = 0;

function chipAlergen(container, prefix, dipilih) {
    container.replaceChildren(
        ...alergi.map(a => {
            const label = el("label", "chip");
            const input = el("input");
            input.type = "checkbox";
            input.value = a.id;
            input.name = prefix;
            input.checked = dipilih.includes(a.id);
            label.append(input, a.name);
            return label;
        }),
    );
    if (!alergi.length) container.append(el("p", "t-small t-muted", "Belum ada alergen."));
}
const alergenTerpilih = container => [...container.querySelectorAll("input:checked")].map(i => i.value);

function barisBahan(b) {
    const row = el("div", "invoice");
    const kiri = el("div", "row");
    const cek = el("input");
    cek.type = "checkbox";
    cek.checked = terpilih.has(b.id);
    cek.setAttribute("aria-label", `Pilih ${b.name}`);
    cek.onchange = () => {
        cek.checked ? terpilih.add(b.id) : terpilih.delete(b.id);
        $("#hapus").disabled = terpilih.size === 0;
    };
    const teks = el("div");
    teks.append(
        el("p", "t-h3", b.name),
        el(
            "p",
            "t-small t-muted",
            `Stok ${angka(b.stock)} ${b.unit} · minimum ${angka(b.minimumThreshold)} ${b.unit}${(b.allergies || []).length ? ` · alergen: ${b.allergies.map(a => a.name).join(", ")}` : ""}`,
        ),
    );
    kiri.append(cek, teks);
    const kanan = el("div", "row");
    const input = el("input", "input w-num");
    Object.assign(input, { type: "number", min: "0", step: "0.1", value: b.stock });
    input.setAttribute("aria-label", `Stok ${b.name} (${b.unit})`);
    const simpan = el("button", "btn btn-secondary btn-sm", "Simpan");
    simpan.type = "button";
    simpan.onclick = async () => {
        const nilai = parseFloat(input.value);
        if (!Number.isFinite(nilai) || nilai < 0) {
            input.setAttribute("aria-invalid", "true");
            input.focus();
            return toast("Isi stok dengan angka 0 atau lebih.", "error");
        }
        input.removeAttribute("aria-invalid");
        simpan.disabled = true;
        galat(null);
        try {
            await api(`/admin/ingredients/${b.id}`, { method: "PATCH", body: { stock: nilai } });
            toast(`Stok ${b.name.toLowerCase()} disimpan.`);
            muatBahan();
            muatBelanja();
        } catch (error) {
            simpan.disabled = false;
            galat(error);
        }
    };
    const ubah = el("button", "btn btn-ghost btn-sm", "Ubah");
    ubah.type = "button";
    ubah.setAttribute("aria-label", `Ubah ${b.name}`);
    ubah.onclick = () => bukaUbah(b);
    kanan.append(
        el("span", `badge ${b.isLowStock ? "badge--pending" : "badge--success"}`, b.isLowStock ? "Menipis" : "Cukup"),
        input,
        simpan,
        ubah,
    );
    row.append(kiri, kanan);
    return row;
}
let ke = 0;
async function muatBahan() {
    const ini = ++ke;
    const q = new URLSearchParams({ page: halaman, limit: 20 });
    if ($("#cari").value.trim()) q.set("search", $("#cari").value.trim());
    try {
        const { data, meta } = await api(`/admin/ingredients?${q}`);
        if (ini !== ke) return;
        $("#stok").removeAttribute("aria-busy");
        $("#stok").replaceChildren(...data.map(barisBahan));
        $("#kosong").hidden = data.length > 0;
        renderPager($("#pager"), meta, p => {
            halaman = p;
            muatBahan();
        });
    } catch (error) {
        if (ini !== ke) return;
        $("#stok").removeAttribute("aria-busy");
        $("#stok").replaceChildren();
        galat(error);
    }
}
async function muatBelanja() {
    try {
        const { data } = await api(
            `/admin/ingredients/shopping-list?from=${tambahHari(hariIni(), 1)}&to=${tambahHari(hariIni(), 7)}`,
        );
        const kurang = data.filter(x => x.shortageQuantity > 0);
        $("#kosongBelanja").hidden = kurang.length > 0;
        $("#belanja").replaceChildren(
            ...kurang.map(x => {
                const r = el("div", "invoice");
                r.append(el("p", "t-h3", x.name), el("p", "t-h3", `${angka(x.shortageQuantity)} ${x.unit}`));
                return r;
            }),
        );
    } catch (error) {
        galat(error);
    }
}

function bukaUbah(b) {
    sedangUbah = b;
    $("#judulUbah").textContent = `Ubah ${b.name}`;
    $("#un").value = b.name;
    $("#uu").value = b.unit;
    $("#um").value = b.minimumThreshold;
    $("#uf").value = "";
    chipAlergen(
        $("#ua"),
        "ua",
        (b.allergies || []).map(a => a.id),
    );
    showIssues($("#formUbah"), null, {});
    $("#formUbah").hidden = false;
    $("#formUbah").scrollIntoView();
    $("#un").focus();
}
$("#batalUbah").onclick = () => {
    $("#formUbah").hidden = true;
};
$("#formUbah").onsubmit = async event => {
    event.preventDefault();
    showIssues($("#formUbah"), null, {});
    const name = $("#un").value.trim(),
        min = Number($("#um").value);
    if (!name) {
        $("#un").closest(".field").classList.add("is-error");
        $("#un").focus();
        return;
    }
    if ($("#um").value === "" || min < 0) {
        $("#um").closest(".field").classList.add("is-error");
        $("#um").focus();
        return;
    }
    const body = { name, unit: $("#uu").value, minimumThreshold: min, allergyIds: alergenTerpilih($("#ua")) };
    $("#simpanUbah").disabled = true;
    galat(null);
    try {
        if ($("#uf").files[0]) body.photoKey = (await upload("ingredients", $("#uf").files[0])).key;
        await api(`/admin/ingredients/${sedangUbah.id}`, { method: "PATCH", body });
        toast("Bahan disimpan.");
        $("#formUbah").hidden = true;
        muatBahan();
        muatBelanja();
    } catch (error) {
        const sisa = showIssues($("#formUbah"), error, {
            name: "un",
            unit: "uu",
            minimumThreshold: "um",
            photoKey: "uf",
        });
        if (sisa === false) galat(error);
        else if (sisa.length) galat(error, issuesText(sisa));
    } finally {
        $("#simpanUbah").disabled = false;
    }
};

$("#hapus").onclick = async () => {
    if (!terpilih.size || !confirm(`Hapus ${terpilih.size} bahan? Bahan yang dipakai resep menu tidak bisa dihapus.`))
        return;
    $("#hapus").disabled = true;
    galat(null);
    try {
        const { data } = await api("/admin/ingredients", { method: "DELETE", body: { ids: [...terpilih] } });
        toast(`${data.deletedCount} bahan dihapus.`);
        terpilih.clear();
        muatBahan();
        muatBelanja();
    } catch (error) {
        $("#hapus").disabled = false;
        galat(error);
    }
};

function barisBaru() {
    const id = ++nomor;
    const box = el("div", "card stack");
    box.dataset.id = id;
    box.innerHTML = `
     <div class="grid grid-2">
      <div class="field"><label for="bn-${id}">Nama bahan</label><input class="input" id="bn-${id}" maxlength="100"></div>
      <div class="field"><label for="bu-${id}">Satuan</label><select class="select input" id="bu-${id}"></select></div>
      <div class="field"><label for="bs-${id}">Stok awal</label><input class="input" id="bs-${id}" type="number" min="0" step="0.1" value="0"></div>
      <div class="field"><label for="bm-${id}">Batas minimum stok</label><input class="input" id="bm-${id}" type="number" min="0" step="0.1" value="0"></div>
     </div>
     <div class="field"><label for="bf-${id}">Foto bahan</label><input class="input" id="bf-${id}" type="file" accept="image/jpeg,image/png,image/webp"><p class="hint">Wajib. JPEG, PNG, atau WebP.</p></div>
     <div class="field"><span class="field-label">Alergen</span><div class="chip-group" id="ba-${id}"></div></div>`;
    box.querySelector(`#bu-${id}`).append(...SATUAN.map(s => opsi(s, s)));
    chipAlergen(box.querySelector(`#ba-${id}`), `ba-${id}`, []);
    const hapus = el("button", "btn btn-ghost btn-sm", "Hapus baris");
    hapus.type = "button";
    hapus.onclick = () => {
        if ($("#barisBahan").children.length > 1) box.remove();
    };
    box.append(hapus);
    $("#barisBahan").append(box);
}
$("#tambahBaris").onclick = barisBaru;
$("#formBahan").onsubmit = async event => {
    event.preventDefault();
    showIssues($("#formBahan"), null, {});
    const rows = [...$("barisBahan").children].map(b => b.dataset.id);
    for (const n of rows) {
        const nama = $(`#bn-${n}`),
            foto = $(`#bf-${n}`);
        if (!nama.value.trim()) {
            nama.closest(".field").classList.add("is-error");
            nama.focus();
            return toast("Nama bahan wajib diisi.", "error");
        }
        if (!foto.files[0]) {
            foto.closest(".field").classList.add("is-error");
            foto.focus();
            return toast("Foto bahan wajib diisi di setiap baris.", "error");
        }
    }
    const fields = {};
    $("#simpanBahan").disabled = true;
    galat(null);
    try {
        const items = [];
        for (const [i, n] of rows.entries()) {
            ["name", "unit", "stock", "minimumThreshold", "photoKey"].forEach(
                (f, k) => (fields[`items.${i}.${f}`] = `${["bn", "bu", "bs", "bm", "bf"][k]}-${n}`),
            );
            const photoKey = (await upload("ingredients", $(`#bf-${n}`).files[0])).key;
            const item = {
                name: $(`#bn-${n}`).value.trim(),
                unit: $(`#bu-${n}`).value,
                stock: Number($(`#bs-${n}`).value) || 0,
                minimumThreshold: Number($(`#bm-${n}`).value) || 0,
                photoKey,
            };
            const ids = alergenTerpilih($(`#ba-${n}`));
            if (ids.length) item.allergyIds = ids;
            items.push(item);
        }
        await api("/admin/ingredients", { method: "POST", body: { items } });
        toast(`${items.length} bahan ditambahkan.`);
        $("#barisBahan").replaceChildren();
        barisBaru();
        muatBahan();
    } catch (error) {
        const sisa = showIssues($("#formBahan"), error, fields);
        if (sisa === false) galat(error);
        else if (sisa.length) galat(error, issuesText(sisa));
    } finally {
        $("#simpanBahan").disabled = false;
    }
};

let hasilStruk = [];
$("#formStruk").onsubmit = async event => {
    event.preventDefault();
    const foto = $("#struk").files[0];
    if (!foto) {
        $("#struk").focus();
        return toast("Pilih foto struk dulu.", "error");
    }
    const body = new FormData();
    body.append("image", foto);
    $("#baca").disabled = true;
    $("#baca").textContent = "Membaca struk…";
    $("#tinjau").hidden = true;
    galat(null);
    try {
        const [{ data }, semua] = await Promise.all([
            api("/admin/ingredients/extract", { method: "POST", body, timeout: 60000 }),
            fetchAll("/admin/ingredients"),
        ]);
        const stokSekarang = new Map(semua.map(b => [b.id, b.stock]));
        hasilStruk = data.items;
        $("#hasilStruk").replaceChildren(
            ...hasilStruk.map(x => {
                const row = el("div", "invoice");
                const kiri = el("label", "row");
                const cek = el("input");
                cek.type = "checkbox";
                cek.checked = true;
                cek.id = `sc-${x.id}`;
                const teks = el("div");
                const lama = stokSekarang.get(x.id);
                teks.append(
                    el("p", "t-h3", x.name),
                    el(
                        "p",
                        "t-small t-muted",
                        `Stok sekarang ${lama === undefined ? "?" : angka(lama)} ${x.unit}${lama === undefined ? "" : ` · bertambah ${angka(x.stock - lama)} ${x.unit}`}`,
                    ),
                );
                kiri.append(cek, teks);
                const input = el("input", "input w-num");
                Object.assign(input, { id: `ss-${x.id}`, type: "number", min: "0", step: "0.01", value: x.stock });
                input.setAttribute("aria-label", `Stok baru ${x.name} (${x.unit})`);
                const kanan = el("div", "row");
                kanan.append(el("span", "t-small t-muted", "Stok baru"), input, el("span", "t-small", x.unit));
                row.append(kiri, kanan);
                return row;
            }),
        );
        $("#tinjau").hidden = false;
    } catch (error) {
        galat(error, error && error.name === "AbortError" ? "Struk terlalu lama dibaca. Coba lagi." : undefined);
    } finally {
        $("#baca").disabled = false;
        $("#baca").textContent = "Baca Struk";
    }
};
$("#batalStruk").onclick = () => {
    $("#tinjau").hidden = true;
    $("#struk").value = "";
};
$("#simpanStruk").onclick = async () => {
    const items = [];
    for (const x of hasilStruk) {
        if (!$(`#sc-${x.id}`).checked) continue;
        const nilai = parseFloat($(`#ss-${x.id}`).value);
        if (!Number.isFinite(nilai) || nilai < 0) {
            $(`#ss-${x.id}`).setAttribute("aria-invalid", "true");
            $(`#ss-${x.id}`).focus();
            return toast("Isi stok baru dengan angka 0 atau lebih.", "error");
        }
        items.push({ id: x.id, stock: nilai });
    }
    if (!items.length) return toast("Centang minimal satu bahan.", "error");
    $("#simpanStruk").disabled = true;
    galat(null);
    try {
        const { data } = await api("/admin/ingredients", { method: "PATCH", body: { items } });
        toast(`Stok ${data.length} bahan diperbarui.`);
        $("#tinjau").hidden = true;
        $("#struk").value = "";
        muatBahan();
        muatBelanja();
    } catch (error) {
        galat(error);
    } finally {
        $("#simpanStruk").disabled = false;
    }
};

function chipNama(a) {
    const chip = el("span", "chip chip-static");
    const nama = el("button", "", a.name);
    nama.type = "button";
    nama.style.cssText = "border:0;padding:0;background:none;font:inherit;color:inherit;cursor:pointer";
    nama.setAttribute("aria-label", `Ganti nama alergen ${a.name}`);
    nama.onclick = () => {
        const input = el("input", "input w-auto");
        Object.assign(input, { value: a.name, maxLength: 50 });
        input.setAttribute("aria-label", `Nama baru untuk ${a.name}`);
        input.style.minHeight = "32px";
        let sibuk = false;
        const simpan = async () => {
            if (sibuk) return;
            sibuk = true;
            const baru = input.value.trim();
            if (!baru || baru === a.name) return muatAlergen();
            try {
                await api(`/admin/allergies/${a.id}`, { method: "PATCH", body: { name: baru } });
                galat(null);
                toast("Nama alergen diganti.");
                muatAlergen();
            } catch (error) {
                sibuk = false;
                galat(error);
            }
        };
        input.onkeydown = event => {
            if (event.key === "Enter") {
                event.preventDefault();
                simpan();
            }
            if (event.key === "Escape") muatAlergen();
        };
        input.onblur = simpan;
        chip.replaceChildren(input);
        input.focus();
        input.select();
    };
    const hapus = el("button", "chip-remove", "×");
    hapus.type = "button";
    hapus.setAttribute("aria-label", `Hapus alergen ${a.name}`);
    hapus.onclick = async () => {
        if (!confirm(`Hapus alergen "${a.name}"?`)) return;
        try {
            await api(`/admin/allergies/${a.id}`, { method: "DELETE" });
            toast("Alergen dihapus.");
            muatAlergen();
        } catch (error) {
            galat(error);
        }
    };
    chip.append(nama, hapus);
    return chip;
}
async function muatAlergen() {
    try {
        alergi = await fetchAll("/admin/allergies");
        $("#alergen").replaceChildren(...alergi.map(chipNama));
        document.querySelectorAll("#barisBahan [id^=ba-]").forEach(c => chipAlergen(c, c.id, alergenTerpilih(c)));
    } catch (error) {
        galat(error);
    }
}
$("#formAl").onsubmit = async event => {
    event.preventDefault();
    const nama = $("#baru").value.trim();
    if (!nama) return $("#baru").focus();
    try {
        await api("/admin/allergies", { method: "POST", body: { name: nama.charAt(0).toUpperCase() + nama.slice(1) } });
        $("#baru").value = "";
        muatAlergen();
    } catch (error) {
        galat(error);
        toast(errorMessage(error), "error");
    }
};
let tunda;
$("#cari").addEventListener("input", () => {
    clearTimeout(tunda);
    tunda = setTimeout(() => {
        halaman = 1;
        muatBahan();
    }, 350);
});
$("#uu").append(...SATUAN.map(s => opsi(s, s)));
(async () => {
    await muatAlergen();
    barisBaru();
})();
muatBahan();
muatBelanja();
