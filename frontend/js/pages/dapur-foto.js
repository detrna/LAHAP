import "../layout/boot.js";
import { api } from "../core/api.js";
import { $, el, opsi, thumb } from "../ui/dom.js";
import { angka } from "../ui/format.js";
import { kosongkanBerkas, pilihBerkas } from "../ui/berkas.js";
import { tampilGalat } from "../ui/forms.js";
import { toast } from "../ui/toast.js";

const galat = isi => tampilGalat($("#err"), isi);

let bahan = [];
let jumlahWadah = null;
let urlPratinjau = null;

const terpilih = () => bahan.find(b => b.id === $("#bahan").value) || null;

function isiPerWadah() {
    const nilai = parseFloat($("#isi").value);
    return Number.isFinite(nilai) && nilai > 0 ? nilai : null;
}

async function muatBahan() {
    const semua = [];
    for (let page = 1; ; page++) {
        const { data, meta } = await api(`/kitchen/ingredients?page=${page}&limit=100`);
        semua.push(...data);
        if (!meta.hasNextPage) return semua;
    }
}

function tampilBahan() {
    const b = terpilih();
    const info = $("#infoBahan");
    $("#labelIsi").textContent = b ? `Isi per wadah (${b.unit})` : "Isi per wadah";
    $("#labelStok").textContent = b ? `Stok baru (${b.unit})` : "Stok baru";
    info.hidden = !b;
    if (!b) return info.replaceChildren();
    const teks = el("div", "flex-1");
    teks.append(
        el("p", "t-h3", b.name),
        el(
            "p",
            "t-small t-muted",
            `Stok ${angka(b.stock)} ${b.unit} · batas minimum ${angka(b.minimumThreshold)} ${b.unit}`,
        ),
    );
    const badge = el(
        "span",
        `badge ${b.isLowStock ? "badge--pending" : "badge--success"}`,
        b.isLowStock ? "Menipis" : "Cukup",
    );
    info.replaceChildren(thumb(b.photoUrl, b.name), teks, badge);
}

function hapusHasil() {
    jumlahWadah = null;
    $("#hasil").hidden = true;
}

function tulisSelisih() {
    const b = terpilih();
    const nilai = parseFloat($("#stokBaru").value);
    if (!b || !Number.isFinite(nilai)) {
        $("#selisih").textContent = "";
        return;
    }
    const beda = Math.round((nilai - b.stock) * 100) / 100;
    $("#selisih").textContent =
        `Stok sekarang ${angka(b.stock)} ${b.unit}, selisih ${beda > 0 ? "+" : ""}${angka(beda)} ${b.unit}.`;
}

function tulisHasil() {
    const b = terpilih();
    if (jumlahWadah === null || !b) return;
    const per = isiPerWadah();
    if (per === null) {
        $("#rincian").textContent = `Terlihat ${angka(jumlahWadah)} wadah. Isi per wadah dulu untuk menghitung stok.`;
    } else {
        const total = Math.round(jumlahWadah * per * 100) / 100;
        $("#rincian").textContent =
            `Terlihat ${angka(jumlahWadah)} wadah × ${angka(per)} ${b.unit} = ${angka(total)} ${b.unit}.`;
        $("#stokBaru").value = total;
    }
    tulisSelisih();
    $("#hasil").hidden = false;
}

function tampilPratinjau(file) {
    if (urlPratinjau) URL.revokeObjectURL(urlPratinjau);
    urlPratinjau = file ? URL.createObjectURL(file) : null;
    $("#pratinjau").hidden = !urlPratinjau;
    if (urlPratinjau) $("#gambarPratinjau").src = urlPratinjau;
    else $("#gambarPratinjau").removeAttribute("src");
}

$("#bahan").addEventListener("change", () => {
    hapusHasil();
    $("#isi").value = "";
    tampilBahan();
    galat(null);
});
document.querySelectorAll("[data-tambah]").forEach(tombol =>
    tombol.addEventListener("click", () => {
        const sekarang = isiPerWadah() ?? 0;
        $("#isi").value = Math.round((sekarang + Number(tombol.dataset.tambah)) * 100) / 100;
        tulisHasil();
    }),
);
$("#hapusIsi").addEventListener("click", () => {
    $("#isi").value = "";
    $("#isi").focus();
    tulisHasil();
});
pilihBerkas($("#foto"), { teks: "Pilih atau ambil foto" });
$("#foto").addEventListener("change", () => {
    hapusHasil();
    tampilPratinjau($("#foto").files[0]);
    galat(null);
});
$("#isi").addEventListener("input", tulisHasil);
$("#stokBaru").addEventListener("input", () => {
    $("#stokBaru").removeAttribute("aria-invalid");
    tulisSelisih();
});

$("#form").addEventListener("submit", async event => {
    event.preventDefault();
    const b = terpilih();
    const file = $("#foto").files[0];
    if (!b) {
        $("#bahan").focus();
        return toast("Pilih bahan dulu.", "error");
    }
    if (!file) {
        $("#foto").focus();
        return toast("Pilih foto dulu.", "error");
    }
    if (isiPerWadah() === null) {
        $("#isi").focus();
        return toast("Isi per wadah harus lebih dari 0.", "error");
    }
    const tombol = $("#perkirakan");
    tombol.disabled = true;
    tombol.textContent = "Memperkirakan...";
    galat(null);
    try {
        const body = new FormData();
        body.append("image", file);
        const { data } = await api(`/kitchen/ingredients/${b.id}/photo-estimate`, {
            method: "POST",
            body,
            timeout: 60000,
        });
        if (terpilih() !== b || $("#foto").files[0] !== file) return;
        jumlahWadah = data.estimatedQuantity;
        tulisHasil();
        $("#hasil").scrollIntoView({ block: "nearest", behavior: "smooth" });
    } catch (error) {
        galat(error);
    } finally {
        tombol.disabled = false;
        tombol.textContent = "Perkirakan";
    }
});

$("#simpan").addEventListener("click", async () => {
    const b = terpilih();
    if (!b) return;
    const input = $("#stokBaru");
    const nilai = parseFloat(input.value);
    if (!Number.isFinite(nilai) || nilai < 0) {
        input.setAttribute("aria-invalid", "true");
        input.focus();
        return toast("Isi stok dengan angka 0 atau lebih.", "error");
    }
    const tombol = $("#simpan");
    tombol.disabled = true;
    galat(null);
    try {
        const { data } = await api(`/kitchen/ingredients/${b.id}/stock`, { method: "PUT", body: { stock: nilai } });
        Object.assign(b, data);
        toast(`Stok ${b.name.toLowerCase()} disimpan.`);
        kosongkanBerkas($("#foto"));
        tampilPratinjau(null);
        hapusHasil();
        tampilBahan();
    } catch (error) {
        galat(error);
    } finally {
        tombol.disabled = false;
    }
});

try {
    bahan = await muatBahan();
    $("#bahan").replaceChildren(opsi("", "Pilih bahan"), ...bahan.map(b => opsi(b.id, b.name)));
    $("#bahan").disabled = false;
} catch (error) {
    $("#bahan").replaceChildren(opsi("", "Bahan gagal dimuat"));
    galat(error);
}
