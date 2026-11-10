import "../layout/boot.js";
import { api } from "../core/api.js";
import { $, el, thumb } from "../ui/dom.js";
import { angka, formatTanggal } from "../ui/format.js";
import { tampilGalat } from "../ui/forms.js";
import { renderPager } from "../ui/pager.js";
import { toast } from "../ui/toast.js";

const galat = isi => tampilGalat($("#err"), isi);

const BATAS = 20;
let bahan = [];
let halaman = 1;
let riwayatAktif = null;

async function riwayat(b, page = 1) {
    try {
        const { data, meta } = await api(`/kitchen/ingredients/${b.id}/stock-history?page=${page}&limit=10`);
        riwayatAktif = b.id;
        $("#judulRiwayat").textContent = `Riwayat stok ${b.name}`;
        $("#isiRiwayat").replaceChildren(
            ...(data.length
                ? data.map(h => {
                      const slot = el("div", "slot");
                      const kiri = el("div");
                      kiri.append(
                          el("p", "t-h3", `${angka(h.previousStock)} ${b.unit} menjadi ${angka(h.newStock)} ${b.unit}`),
                          el(
                              "p",
                              "t-small t-muted",
                              `Selisih ${h.delta > 0 ? "+" : ""}${angka(h.delta)} · ${h.changedBy ? h.changedBy.name : "-"} · ${formatTanggal(h.changedAt, "waktu")}`,
                          ),
                      );
                      slot.append(kiri);
                      return slot;
                  })
                : [el("p", "t-muted", "Belum ada riwayat.")]),
        );
        renderPager($("#pagerRiwayat"), meta, ke => riwayat(b, ke));
        $("#riwayat").hidden = false;
        if (page === 1) $("#riwayat").scrollIntoView({ block: "nearest", behavior: "smooth" });
    } catch (error) {
        galat(error);
    }
}

function baris(b) {
    const row = el("div", "invoice");
    const kiri = el("div", "row");
    const teks = el("div", "flex-1");
    teks.append(
        el("p", "t-h3", b.name),
        el(
            "p",
            "t-small t-muted",
            `Stok ${angka(b.stock)} ${b.unit} · batas minimum ${angka(b.minimumThreshold)} ${b.unit}`,
        ),
    );
    kiri.append(thumb(b.photoUrl, b.name), teks);
    const kanan = el("div", "row");
    const badge = el(
        "span",
        `badge ${b.isLowStock ? "badge--pending" : "badge--success"}`,
        b.isLowStock ? "Menipis" : "Cukup",
    );
    const input = el("input", "input w-num");
    Object.assign(input, { type: "number", min: "0", step: "any", value: b.stock });
    input.id = `stok-${b.id}`;
    input.setAttribute("aria-label", `Stok ${b.name} (${b.unit})`);
    input.inputMode = "decimal";
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
            const { data } = await api(`/kitchen/ingredients/${b.id}/stock`, { method: "PUT", body: { stock: nilai } });
            Object.assign(b, data);
            toast(`Stok ${b.name.toLowerCase()} disimpan.`);
            gambar();
            if (riwayatAktif === b.id) riwayat(b);
        } catch (error) {
            galat(error);
            simpan.disabled = false;
        }
    };
    const lihat = el("button", "btn btn-ghost btn-sm", "Riwayat");
    lihat.type = "button";
    lihat.onclick = () => riwayat(b);
    kanan.append(badge, input, simpan, lihat);
    row.append(kiri, kanan);
    return row;
}

function gambar() {
    $("#daftar").replaceChildren(...bahan.map(baris));
    $("#daftar").hidden = bahan.length === 0;
    $("#kosong").hidden = bahan.length > 0;
}

let ke = 0;
async function muat(page = halaman) {
    const ini = ++ke;
    const query = new URLSearchParams({ page: String(page), limit: String(BATAS) });
    const kata = $("#cari").value.trim();
    if (kata) query.set("search", kata);
    if ($("#menipis").checked) query.set("lowStock", "true");
    $("#daftar").setAttribute("aria-busy", "true");
    try {
        const { data, meta } = await api(`/kitchen/ingredients?${query}`);
        if (ini !== ke) return;
        bahan = data;
        halaman = meta.page;
        gambar();
        renderPager($("#pager"), meta, muat);
        galat(null);
    } catch (error) {
        if (ini !== ke) return;
        $("#daftar").replaceChildren();
        $("#pager").hidden = true;
        galat(error);
    } finally {
        if (ini === ke) $("#daftar").removeAttribute("aria-busy");
    }
}

let tunda;
$("#cari").addEventListener("input", () => {
    clearTimeout(tunda);
    tunda = setTimeout(() => muat(1), 300);
});
$("#menipis").addEventListener("change", () => muat(1));
muat(1);
