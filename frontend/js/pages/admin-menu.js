import "../layout/boot.js";
import { api, fetchAll, upload } from "../core/api.js";
import { errorMessage, issuesText } from "../core/errors.js";
import { $, el, gantiThumb, opsi, thumb } from "../ui/dom.js";
import { kosongkanBerkas, pilihBerkas } from "../ui/berkas.js";
import { askChangeReason, needsChangeReason, periksa, showIssues, tampilGalat, tampilPesan } from "../ui/forms.js";
import { renderPager } from "../ui/pager.js";
import { peringatan } from "../ui/peringatan.js";
import { toast } from "../ui/toast.js";

const galat = (isi, teks) => tampilGalat($("#err"), isi, teks);
const galatForm = teks => tampilPesan($("#errForm"), teks);

let bahan = [],
    koki = [],
    sedangUbah = null,
    halaman = 1,
    nomor = 0;

function barisResep(line) {
    const id = ++nomor;
    const row = el("div", "row");
    row.dataset.id = id;
    const pilih = el("select", "select input pilih-bahan");
    pilih.id = `rb-${id}`;
    pilih.setAttribute("aria-label", "Bahan");
    pilih.append(...bahan.map(b => opsi(b.id, `${b.name} (${b.unit})`)));
    const jumlah = el("input", "input w-num");
    Object.assign(jumlah, { id: `rq-${id}`, type: "number", min: "0", step: "0.01", placeholder: "Jumlah" });
    jumlah.setAttribute("aria-label", "Jumlah per porsi");
    if (line) {
        pilih.value = line.ingredientId;
        jumlah.value = line.quantityPerPortion;
    }
    const foto = thumb(null, "");
    const gantiFoto = () => {
        const b = bahan.find(x => x.id === pilih.value);
        gantiThumb(foto, b ? b.photoUrl : null, b ? b.name : "");
    };
    pilih.addEventListener("change", gantiFoto);
    gantiFoto();
    const hapus = el("button", "btn btn-ghost btn-sm", "Hapus");
    hapus.type = "button";
    hapus.setAttribute("aria-label", "Hapus bahan dari resep");
    hapus.onclick = () => row.remove();
    const f = el("div", "field flex-1");
    const r = el("div", "row");
    r.append(foto, pilih, jumlah, hapus);
    f.append(r);
    row.append(f);
    $("#resep").append(row);
}

function barisKomponen(c) {
    const id = ++nomor;
    const row = el("div", "row");
    row.dataset.id = id;
    const nama = el("input", "input flex-1");
    Object.assign(nama, { id: `kn-${id}`, maxLength: 100, placeholder: "Nama komponen" });
    nama.setAttribute("aria-label", "Nama komponen");
    const pilih = el("select", "select input w-auto");
    pilih.id = `kc-${id}`;
    pilih.setAttribute("aria-label", "Koki");
    pilih.append(opsi("", "Belum ada koki"), ...koki.map(k => opsi(k.id, k.name)));
    if (c) {
        nama.value = c.name;
        pilih.value = c.cook ? c.cook.id : "";
        if (c.cook && !pilih.value) {
            pilih.append(opsi(c.cook.id, `${c.cook.name} (nonaktif)`));
            pilih.value = c.cook.id;
        }
    }
    const hapus = el("button", "btn btn-ghost btn-sm", "Hapus");
    hapus.type = "button";
    hapus.setAttribute("aria-label", "Hapus komponen");
    hapus.onclick = () => row.remove();
    const f = el("div", "field flex-1");
    const r = el("div", "row");
    r.append(nama, pilih, hapus);
    f.append(r);
    row.append(f);
    $("#komponen").append(row);
}

function barisMenu(m) {
    const baris = el("div", "invoice");
    const kiri = el("div", "row");
    const foto = thumb(m.photoUrl, m.name);
    const teks = el("div", "flex-1");
    const judul = el("p", "t-h3", m.name);
    if (m.isAlternative) judul.append(" ", el("span", "badge badge--ready", "Alternatif"));
    teks.append(judul);
    const info = [`${(m.ingredients || []).length} bahan`];
    if (m.tags.length) info.push(m.tags.join(", "));
    if ((m.allergies || []).length) info.push(`alergen: ${m.allergies.map(a => a.name).join(", ")}`);
    teks.append(el("p", "t-small t-muted", info.join(" · ")));
    if (m.components.length)
        teks.append(
            el(
                "p",
                "t-small t-muted",
                m.components.map(c => `${c.name}${c.cook ? ` (${c.cook.name})` : ""}`).join(" · "),
            ),
        );
    kiri.append(foto, teks);
    const kanan = el("div", "row");
    const ubah = el("button", "btn btn-secondary btn-sm", "Ubah");
    ubah.type = "button";
    ubah.setAttribute("aria-label", `Ubah ${m.name}`);
    ubah.onclick = () => bukaForm(m);
    const hapus = el("button", "btn btn-danger btn-sm", "Hapus");
    hapus.type = "button";
    hapus.setAttribute("aria-label", `Hapus ${m.name}`);
    hapus.onclick = async () => {
        const ok = await peringatan({
            judul: `Hapus menu "${m.name}"?`,
            akibat: [
                "Menu yang dihapus tidak bisa dikembalikan.",
                "Menu yang masih dipakai jadwal tidak bisa dihapus.",
            ],
            tombol: "Ya, hapus",
            bahaya: true,
        });
        if (!ok) return;
        hapus.disabled = true;
        galat(null);
        try {
            await api(`/admin/menus/${m.id}`, { method: "DELETE" });
            toast("Menu dihapus.");
            muat();
        } catch (error) {
            hapus.disabled = false;
            galat(error);
        }
    };
    kanan.append(ubah, hapus);
    baris.append(kiri, kanan);
    return baris;
}

let ke = 0;
async function muat() {
    const ini = ++ke;
    const q = new URLSearchParams({ page: halaman, limit: 20 });
    if ($("#cari").value.trim()) q.set("search", $("#cari").value.trim());
    if ($("#jenis").value) q.set("isAlternative", $("#jenis").value);
    try {
        const { data, meta } = await api(`/admin/menus?${q}`);
        if (ini !== ke) return;
        $("#list").removeAttribute("aria-busy");
        $("#list").replaceChildren(...data.map(barisMenu));
        $("#kosong").hidden = data.length > 0;
        renderPager($("#pager"), meta, p => {
            halaman = p;
            muat();
        });
        galat(null);
    } catch (error) {
        if (ini !== ke) return;
        $("#list").removeAttribute("aria-busy");
        $("#list").replaceChildren();
        galat(error);
    }
}

function bukaForm(m) {
    sedangUbah = m || null;
    $("#judulForm").textContent = m ? `Ubah ${m.name}` : "Tambah menu";
    $("#n").value = m ? m.name : "";
    $("#d").value = m ? m.description : "";
    $("#tg").value = m ? m.tags.join(", ") : "";
    $("#alt").checked = m ? m.isAlternative : false;
    kosongkanBerkas($("#foto"));
    fotoTerunggah = null;
    $("#hintFoto").textContent = m
        ? "Kosongkan jika foto tidak diganti."
        : "Wajib untuk menu baru. JPEG, PNG, atau WebP.";
    $("#resep").replaceChildren();
    $("#komponen").replaceChildren();
    if (m && m.ingredients && m.ingredients.length) m.ingredients.forEach(barisResep);
    else barisResep();
    if (m) m.components.forEach(barisKomponen);
    $("#alasan").hidden = true;
    galatForm("");
    showIssues($("#form"), null, {});
    $("#form").hidden = false;
    $("#form").scrollIntoView();
    $("#n").focus();
}

function isiForm() {
    const fields = { name: "n", description: "d", tags: "tg", photoKey: "foto" };
    const ingredients = [...$("resep").children].map((r, i) => {
        const n = r.dataset.id;
        fields[`ingredients.${i}.ingredientId`] = `rb-${n}`;
        fields[`ingredients.${i}.quantityPerPortion`] = `rq-${n}`;
        return { ingredientId: $(`#rb-${n}`).value, quantityPerPortion: Number($(`#rq-${n}`).value) };
    });
    const components = [...$("komponen").children]
        .map((r, i) => {
            const n = r.dataset.id;
            fields[`components.${i}.name`] = `kn-${n}`;
            fields[`components.${i}.cookId`] = `kc-${n}`;
            return { name: $(`#kn-${n}`).value.trim(), cookId: $(`#kc-${n}`).value || null };
        })
        .filter(c => c.name);
    return { fields, ingredients, components };
}

async function kirim(changeReason) {
    const { fields, ingredients, components } = isiForm();
    const body = {
        name: $("#n").value.trim(),
        description: $("#d").value.trim(),
        isAlternative: $("#alt").checked,
        tags: $("#tg")
            .value.split(",")
            .map(t => t.trim())
            .filter(Boolean),
        ingredients,
        components,
    };
    if (changeReason) body.changeReason = changeReason;
    galatForm("");
    try {
        const foto = $("#foto").files[0];
        if (foto && !fotoTerunggah) fotoTerunggah = (await upload("menus", foto)).key;
        if (fotoTerunggah) body.photoKey = fotoTerunggah;
        if (sedangUbah) await api(`/admin/menus/${sedangUbah.id}`, { method: "PATCH", body });
        else await api("/admin/menus", { method: "POST", body });
        fotoTerunggah = null;
        toast(changeReason ? "Menu disimpan. Pelanggan diberi tahu." : "Menu disimpan.");
        $("#form").hidden = true;
        muat();
    } catch (error) {
        if (needsChangeReason(error) && !changeReason) return askChangeReason($("#alasan"), kirim);
        const sisa = showIssues($("#form"), error, fields);
        if (sisa === false) galatForm(errorMessage(error));
        else if (sisa.length) galatForm(issuesText(sisa));
        if (changeReason) throw error;
    }
}
let fotoTerunggah = null;
pilihBerkas($("#foto"));
$("#foto").addEventListener("change", () => {
    fotoTerunggah = null;
});

$("#form").onsubmit = async event => {
    event.preventDefault();
    showIssues($("#form"), null, {});
    const { ingredients, components } = isiForm();
    const namaKomponen = components.map(c => c.name.toLowerCase());
    if (new Set(namaKomponen).size !== namaKomponen.length)
        return galatForm("Nama komponen tidak boleh sama dalam satu menu.");
    if (new Set(ingredients.map(l => l.ingredientId)).size !== ingredients.length)
        return galatForm("Satu bahan hanya boleh muncul sekali di resep.");
    const resepValid = ingredients.length > 0 && ingredients.every(l => l.ingredientId && l.quantityPerPortion > 0);
    if (
        !periksa([
            [$("#n"), $("#n").value.trim() !== ""],
            [$("#d"), $("#d").value.trim() !== ""],
            [$("#foto"), Boolean(sedangUbah || $("#foto").files[0])],
        ])
    )
        return;
    if (!resepValid) return galatForm("Isi minimal satu bahan resep, dengan jumlah per porsi lebih dari 0.");
    $("#simpan").disabled = true;
    try {
        await kirim();
    } finally {
        $("#simpan").disabled = false;
    }
};
$("#tambah").onclick = () => bukaForm(null);
$("#batal").onclick = () => {
    $("#form").hidden = true;
};
$("#tambahResep").onclick = () => barisResep();
$("#tambahKomponen").onclick = () => barisKomponen();
let tunda;
$("#cari").addEventListener("input", () => {
    clearTimeout(tunda);
    tunda = setTimeout(() => {
        halaman = 1;
        muat();
    }, 350);
});
$("#jenis").addEventListener("change", () => {
    halaman = 1;
    muat();
});

(async () => {
    try {
        const [b, k] = await Promise.all([
            fetchAll("/admin/ingredients"),
            fetchAll("/admin/users?role=KITCHEN&isActive=true"),
        ]);
        bahan = b.sort((x, y) => x.name.localeCompare(y.name));
        koki = k;
    } catch (error) {
        galat(error);
    }
    muat();
})();
