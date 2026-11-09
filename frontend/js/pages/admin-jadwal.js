import "../layout/boot.js";
import { api, fetchAll } from "../core/api.js";
import { issuesText } from "../core/errors.js";
import { $, el, opsi } from "../ui/dom.js";
import { formatTanggal, hariIni, tambahHari } from "../ui/format.js";
import { askChangeReason, needsChangeReason, showIssues, tampilGalat } from "../ui/forms.js";
import { renderPager } from "../ui/pager.js";
import { setBadge } from "../ui/status.js";
import { toast } from "../ui/toast.js";

const galat = (isi, teks) => tampilGalat($("#err"), isi, teks);

let paket = [],
    menus = [],
    halaman = 1,
    terpilih = new Set(),
    sedangUbah = null,
    nomor = 0;
const namaPaket = id => (paket.find(p => p.id === id) || {}).name || "Paket";
const waktuPaket = id => (paket.find(p => p.id === id) || {}).deliveryTimes || [];
const utamaOpsi = () => menus.filter(m => !m.isAlternative).map(m => opsi(m.id, m.name));
const altOpsi = () => [
    opsi("", "Tanpa menu alternatif"),
    ...menus.filter(m => m.isAlternative).map(m => opsi(m.id, m.name)),
];
const menuDari = (j, utama) => (j.menus || []).find(m => m.isPrimary === utama) || {};

function isiWaktu(select, packageId, pilih) {
    select.replaceChildren(...waktuPaket(packageId).map(t => opsi(t.time, `${t.range} · ${t.time}`)));
    if (pilih) select.value = pilih;
}

function barisBaru() {
    const id = ++nomor;
    const box = el("div", "card stack");
    box.dataset.id = id;
    const grid = el("div", "grid grid-3");
    const field = (label, input) => {
        const f = el("div", "field");
        const l = el("label", "", label);
        l.htmlFor = input.id;
        f.append(l, input);
        return f;
    };
    const pk = el("select", "select input");
    pk.id = `pk-${id}`;
    const tg = el("input", "input");
    tg.id = `tg-${id}`;
    tg.type = "date";
    const wk = el("select", "select input");
    wk.id = `wk-${id}`;
    const mn = el("select", "select input");
    mn.id = `mn-${id}`;
    const alt = el("select", "select input");
    alt.id = `alt-${id}`;
    pk.append(...paket.map(p => opsi(p.id, p.name)));
    mn.append(...utamaOpsi());
    alt.append(...altOpsi());
    const sebelum = $("#baris").lastElementChild;
    if (sebelum) {
        const n = sebelum.dataset.id;
        pk.value = $(`#pk-${n}`).value;
        const t = $(`#tg-${n}`).value;
        if (t) tg.value = tambahHari(t, 1);
    }
    isiWaktu(wk, pk.value);
    pk.onchange = () => isiWaktu(wk, pk.value);
    grid.append(
        field("Paket", pk),
        field("Tanggal", tg),
        field("Waktu makan", wk),
        field("Menu utama", mn),
        field("Menu alternatif", alt),
    );
    const hapus = el("button", "btn btn-ghost btn-sm", "Hapus baris");
    hapus.type = "button";
    hapus.onclick = () => {
        if ($("#baris").children.length > 1) box.remove();
    };
    box.append(grid, hapus);
    $("#baris").append(box);
}

function baris(j) {
    const slot = el("div", "slot");
    const kiri = el("div", "row");
    const cek = el("input");
    cek.type = "checkbox";
    cek.checked = terpilih.has(j.id);
    cek.setAttribute("aria-label", `Pilih jadwal ${formatTanggal(j.date, "hari")} ${j.deliveryTime.range}`);
    cek.onchange = () => {
        cek.checked ? terpilih.add(j.id) : terpilih.delete(j.id);
        $("#hapus").disabled = terpilih.size === 0;
    };
    const teks = el("div");
    const utama = menuDari(j, true),
        alt = menuDari(j, false);
    teks.append(
        el(
            "p",
            "t-h3",
            `${formatTanggal(j.date, "hari")} · ${j.deliveryTime.range} ${j.deliveryTime.time} · ${namaPaket(j.packageId)}`,
        ),
        el(
            "p",
            "t-small t-muted",
            `${utama.menu ? utama.menu.name : "Menu belum diisi"}${alt.menu ? ` · alternatif: ${alt.menu.name}` : ""}`,
        ),
    );
    kiri.append(cek, teks);
    const kanan = el("div", "row");
    const badge = el("span", "");
    setBadge(badge, j.isPublished ? "badge--success" : "badge--pending", j.isPublished ? "Terbit" : "Draft");
    const ubah = el("button", "btn btn-secondary btn-sm", "Ubah");
    ubah.type = "button";
    ubah.onclick = () => bukaUbah(j);
    const tombol = el(
        "button",
        `btn btn-sm ${j.isPublished ? "btn-secondary" : "btn-primary"}`,
        j.isPublished ? "Batalkan Terbit" : "Terbitkan",
    );
    tombol.type = "button";
    tombol.onclick = async () => {
        if (j.isPublished && !confirm("Batalkan terbit jadwal ini? Hanya bisa jika belum ada pesanan.")) return;
        tombol.disabled = true;
        galat(null);
        try {
            await api("/admin/menu-schedules/publish", {
                method: "POST",
                body: { ids: [j.id], publish: !j.isPublished },
            });
            toast(j.isPublished ? "Jadwal dikembalikan ke draft." : "Jadwal diterbitkan.");
            muat();
        } catch (error) {
            tombol.disabled = false;
            galat(error);
        }
    };
    kanan.append(badge, ubah, tombol);
    slot.append(kiri, kanan);
    return slot;
}

let ke = 0;
async function muat() {
    const ini = ++ke;
    const q = new URLSearchParams({ page: halaman, limit: 20 });
    if ($("#fPk").value) q.set("packageId", $("#fPk").value);
    if ($("#fDari").value) q.set("from", $("#fDari").value);
    if ($("#fSampai").value) q.set("to", $("#fSampai").value);
    if ($("#fTerbit").value) q.set("isPublished", $("#fTerbit").value);
    try {
        const { data, meta } = await api(`/admin/menu-schedules?${q}`);
        if (ini !== ke) return;
        data.sort((a, b) => a.date.localeCompare(b.date) || a.deliveryTime.time.localeCompare(b.deliveryTime.time));
        $("#jadwal").removeAttribute("aria-busy");
        $("#jadwal").replaceChildren(...data.map(baris));
        $("#kosong").hidden = data.length > 0;
        renderPager($("#pager"), meta, p => {
            halaman = p;
            muat();
        });
    } catch (error) {
        if (ini !== ke) return;
        $("#jadwal").removeAttribute("aria-busy");
        $("#jadwal").replaceChildren();
        galat(error);
    }
}

async function awal() {
    try {
        const [pk, mn] = await Promise.all([fetchAll("/admin/packages"), fetchAll("/admin/menus")]);
        paket = pk;
        menus = mn;
        $("#fPk").append(...paket.map(p => opsi(p.id, p.name)));
        $("#rPk").replaceChildren(...paket.map(p => opsi(p.id, p.name)));
        barisBaru();
    } catch (error) {
        galat(error);
    }
    muat();
}

async function simpan(terbit) {
    showIssues($("#form"), null, {});
    const rows = [...$("#baris").children].map(b => b.dataset.id);
    const fields = {};
    const items = rows.map((n, i) => {
        ["packageId", "date", "deliveryTime", "primaryMenuId", "alternativeMenuId"].forEach(
            (f, k) => (fields[`items.${i}.${f}`] = `${["pk", "tg", "wk", "mn", "alt"][k]}-${n}`),
        );
        const item = {
            packageId: $(`#pk-${n}`).value,
            date: $(`#tg-${n}`).value,
            deliveryTime: $(`#wk-${n}`).value,
            primaryMenuId: $(`#mn-${n}`).value,
            isPublished: terbit,
        };
        if ($(`#alt-${n}`).value) item.alternativeMenuId = $(`#alt-${n}`).value;
        return item;
    });
    const kosong = rows.find((n, i) => !items[i].date || !items[i].deliveryTime || !items[i].primaryMenuId);
    if (kosong) {
        const input = [`#tg-${kosong}`, `#wk-${kosong}`, `#mn-${kosong}`].map(s => $(s)).find(x => !x.value);
        input.closest(".field").classList.add("is-error");
        input.setAttribute("aria-invalid", "true");
        input.focus();
        return toast("Lengkapi tanggal, waktu makan, dan menu utama di setiap baris.", "error");
    }
    galat(null);
    document.querySelectorAll("#form > .row button").forEach(b => (b.disabled = true));
    try {
        await api("/admin/menu-schedules", { method: "POST", body: { items } });
        toast(`${items.length} jadwal ${terbit ? "disimpan dan diterbitkan" : "disimpan sebagai draft"}.`);
        $("#baris").replaceChildren();
        barisBaru();
        muat();
    } catch (error) {
        const sisa = showIssues($("#form"), error, fields);
        galat(error, sisa && sisa.length ? issuesText(sisa) : undefined);
        if (sisa && !sisa.length) $("#err").hidden = true;
    } finally {
        document.querySelectorAll("#form > .row button").forEach(b => (b.disabled = false));
    }
}

function bukaUbah(j) {
    sedangUbah = j;
    $("#judulUbah").textContent = `Ubah jadwal ${formatTanggal(j.date, "hari")} · ${namaPaket(j.packageId)}`;
    $("#uTg").value = j.date;
    isiWaktu($("#uWk"), j.packageId, j.deliveryTime.time);
    $("#uMn").replaceChildren(...utamaOpsi());
    $("#uAlt").replaceChildren(...altOpsi());
    $("#uMn").value = menuDari(j, true).menuId || "";
    $("#uAlt").value = menuDari(j, false).menuId || "";
    $("#alasanUbah").hidden = true;
    $("#ubah").hidden = false;
    $("#ubah").scrollIntoView();
    $("#uTg").focus();
}

async function kirimUbah(changeReason) {
    const j = sedangUbah;
    const item = { id: j.id };
    if ($("#uTg").value && $("#uTg").value !== j.date) item.date = $("#uTg").value;
    if ($("#uWk").value && $("#uWk").value !== j.deliveryTime.time) item.deliveryTime = $("#uWk").value;
    if ($("#uMn").value && $("#uMn").value !== menuDari(j, true).menuId) item.primaryMenuId = $("#uMn").value;
    if ($("#uAlt").value !== (menuDari(j, false).menuId || "")) item.alternativeMenuId = $("#uAlt").value || null;
    if (Object.keys(item).length === 1) {
        $("#ubah").hidden = true;
        return toast("Tidak ada perubahan.");
    }
    if (changeReason) item.changeReason = changeReason;
    galat(null);
    try {
        await api("/admin/menu-schedules", { method: "PATCH", body: { items: [item] } });
        toast(changeReason ? "Jadwal diubah. Pelanggan diberi tahu." : "Jadwal diubah.");
        $("#ubah").hidden = true;
        muat();
    } catch (error) {
        if (needsChangeReason(error) && !changeReason) return askChangeReason($("#alasanUbah"), kirimUbah);
        galat(error);
        if (changeReason) throw error;
    }
}

$("#tambahBaris").onclick = barisBaru;
$("#form").onsubmit = event => {
    event.preventDefault();
    simpan(false);
};
$("#terbitLangsung").onclick = () => simpan(true);
$("#ubah").onsubmit = async event => {
    event.preventDefault();
    $("#simpanUbah").disabled = true;
    try {
        await kirimUbah();
    } finally {
        $("#simpanUbah").disabled = false;
    }
};
$("#batalUbah").onclick = () => {
    $("#ubah").hidden = true;
};

async function terbitRentang(publish) {
    const ok = $("#rDari").value && $("#rSampai").value && $("#rSampai").value >= $("#rDari").value;
    $("#rSampai").closest(".field").classList.toggle("is-error", !ok);
    $("#rSampai").closest(".field").querySelector(".error-msg").hidden = ok;
    if (!ok) return $("#rDari").focus();
    if (
        !publish &&
        !confirm("Batalkan terbit semua jadwal di rentang ini? Jadwal yang sudah punya pesanan tidak bisa dibatalkan.")
    )
        return;
    galat(null);
    try {
        const { data } = await api("/admin/menu-schedules/publish", {
            method: "POST",
            body: { packageId: $("#rPk").value, from: $("#rDari").value, to: $("#rSampai").value, publish },
        });
        toast(`${data.updatedCount} jadwal ${publish ? "diterbitkan" : "dikembalikan ke draft"}.`);
        muat();
    } catch (error) {
        galat(error);
    }
}
$("#rentang").onsubmit = event => {
    event.preventDefault();
    terbitRentang(true);
};
$("#batalRentang").onclick = () => terbitRentang(false);

$("#hapus").onclick = async () => {
    if (
        !terpilih.size ||
        !confirm(`Hapus ${terpilih.size} jadwal? Jadwal yang sudah punya pesanan tidak bisa dihapus.`)
    )
        return;
    $("#hapus").disabled = true;
    galat(null);
    try {
        const { data } = await api("/admin/menu-schedules", { method: "DELETE", body: { ids: [...terpilih] } });
        toast(`${data.deletedCount} jadwal dihapus.`);
        terpilih.clear();
        muat();
    } catch (error) {
        $("#hapus").disabled = false;
        galat(error);
    }
};

["#fPk", "#fDari", "#fSampai", "#fTerbit"].forEach(s =>
    $(s).addEventListener("change", () => {
        halaman = 1;
        terpilih.clear();
        $("#hapus").disabled = true;
        muat();
    }),
);
$("#fDari").value = hariIni();
$("#rDari").value = hariIni();
awal();
