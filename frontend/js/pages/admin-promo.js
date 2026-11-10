import "../layout/boot.js";
import { api, ApiError } from "../core/api.js";
import { $, el } from "../ui/dom.js";
import { formatTanggal, rp, tanggalInput } from "../ui/format.js";
import { pesanForm, tampilGalat, tampilPesan, tandaiField } from "../ui/forms.js";
import { buatKodeAcak } from "../ui/kode-acak.js";
import { renderPager } from "../ui/pager.js";
import { peringatan } from "../ui/peringatan.js";
import { toast } from "../ui/toast.js";

const tanggalISO = (tanggal, jam) => new Date(`${tanggal}T${jam}+07:00`).toISOString();
let dipilih = null;
let halaman = 1;

const FIELD_FORM = {
    code: "kode",
    discountType: "jenis",
    discountValue: "nilai",
    minPurchase: "minimal",
    quota: "kuota",
    validUntil: "sampai",
};
const KONFLIK_FORM = { "promo code is already used": "kode" };

function pesanIsianForm(error) {
    const teks = pesanForm($("#form"), error, FIELD_FORM);
    const id = error instanceof ApiError && error.code === "CONFLICT" && KONFLIK_FORM[error.message];
    if (id) {
        tandaiField($(`#${id}`), teks);
        $(`#${id}`).focus();
    }
    return teks;
}

function status(promo) {
    if (!promo.isActive) return ["badge badge--expire", "Nonaktif"];
    if (new Date(promo.validUntil) < new Date()) return ["badge badge--expire", "Kedaluwarsa"];
    if (promo.quota === 0) return ["badge badge--cancel", "Tidak bisa dipakai"];
    if (promo.usedCount >= promo.quota) return ["badge badge--cancel", "Kuota habis"];
    return ["badge badge--success", "Aktif"];
}

function bukaForm(promo) {
    dipilih = promo;
    $("#judulForm").textContent = promo ? "Ubah kode promo" : "Tambah kode promo";
    $("#kode").value = promo ? promo.code : "";
    $("#kode").disabled = Boolean(promo);
    $("#acak").disabled = Boolean(promo);
    $("#jenis").value = promo ? promo.discountType : "Persen";
    $("#nilai").value = promo ? promo.discountValue : "";
    $("#minimal").value = promo ? promo.minPurchase : 0;
    $("#kuota").value = promo ? promo.quota : 100;
    $("#sampai").value = promo && promo.validUntil ? tanggalInput(promo.validUntil) : "";
    $("#gabung").checked = promo ? promo.allowStackWithTier : true;
    $("#aktif").checked = promo ? promo.isActive : true;
    tampilPesan($("#errForm"), "");
    $("#form").hidden = false;
    $("#form").scrollIntoView();
}

function barisPromo(promo) {
    const baris = el("div", "invoice");
    const kiri = el("div");
    const diskon = promo.discountType === "Persen" ? `${promo.discountValue}%` : rp(promo.discountValue);
    const kuota = `${promo.usedCount} dari ${promo.quota} terpakai${promo.quota === 0 ? " · tidak bisa dipakai" : ""}`;
    const info = [
        `Diskon ${diskon}`,
        kuota,
        promo.validUntil ? `sampai ${formatTanggal(promo.validUntil)}` : "",
        promo.minPurchase > 0 ? `min. ${rp(promo.minPurchase)}` : "",
        promo.allowStackWithTier ? "bisa digabung tier" : "tidak digabung tier",
    ].filter(Boolean);
    kiri.append(el("p", "t-h3", promo.code), el("p", "t-small t-muted", info.join(" · ")));

    const kanan = el("div", "row");
    const [kelas, teks] = status(promo);
    kanan.append(el("span", kelas, teks));
    const ubah = el("button", "btn btn-secondary btn-sm", "Ubah");
    ubah.type = "button";
    ubah.onclick = () => bukaForm(promo);
    const saklar = el("button", "btn btn-secondary btn-sm", promo.isActive ? "Nonaktifkan" : "Aktifkan");
    saklar.type = "button";
    saklar.onclick = async () => {
        if (promo.isActive) {
            const ok = await peringatan({
                judul: `Nonaktifkan kode ${promo.code}?`,
                akibat: [
                    "Pelanggan tidak bisa memakai kode ini lagi saat checkout.",
                    "Pesanan yang sudah memakai kode ini tidak berubah.",
                ],
                tombol: "Ya, nonaktifkan",
            });
            if (!ok) return;
        }
        kirim(`/admin/promo-codes/${promo.id}`, "PATCH", { isActive: !promo.isActive });
    };
    const hapus = el("button", "btn btn-danger btn-sm", "Hapus");
    hapus.type = "button";
    hapus.onclick = async () => {
        const ok = await peringatan({
            judul: `Hapus kode ${promo.code}?`,
            akibat: [
                "Kode yang dihapus tidak bisa dikembalikan.",
                "Kode yang masih dipakai pesanan Pending tidak bisa dihapus.",
            ],
            tombol: "Ya, hapus",
            bahaya: true,
        });
        if (ok) kirim(`/admin/promo-codes/${promo.id}`, "DELETE");
    };
    kanan.append(ubah, saklar, hapus);
    baris.append(kiri, kanan);
    return baris;
}

async function kirim(path, method, body) {
    tampilGalat($("#galat"), "");
    try {
        await api(path, { method, body });
        await muat();
    } catch (error) {
        tampilGalat($("#galat"), error);
    }
}

async function muat() {
    try {
        const { data, meta } = await api(`/admin/promo-codes?page=${halaman}&limit=20`);
        $("#daftar").replaceChildren(
            ...(data.length ? data.map(barisPromo) : [el("p", "empty", "Belum ada kode promo.")]),
        );
        renderPager($("#pager"), meta, page => {
            halaman = page;
            muat();
        });
    } catch (error) {
        $("#daftar").replaceChildren();
        tampilGalat($("#galat"), error);
    } finally {
        $("#daftar").removeAttribute("aria-busy");
    }
}

$("#tambah").onclick = () => bukaForm(null);
$("#acak").onclick = () => {
    const kode = $("#kode");
    kode.value = buatKodeAcak();
    kode.setAttribute("aria-invalid", "false");
    $("#fKode").classList.remove("is-error");
    $("#fKode")
        .querySelectorAll(".error-msg")
        .forEach(p => p.remove());
    kode.focus();
};
$("#batal").onclick = () => {
    $("#form").hidden = true;
};

$("#form").addEventListener("submit", async event => {
    event.preventDefault();
    const tombol = event.target.querySelector("button[type=submit]");
    const nilai = Number($("#nilai").value);
    const kuota = Number($("#kuota").value);
    if (!(nilai > 0) || ($("#jenis").value === "Persen" && nilai > 100)) {
        tampilPesan($("#errForm"), "Nilai diskon harus lebih dari 0, dan paling besar 100 untuk diskon persen.");
        return;
    }
    if ($("#kuota").value === "" || !Number.isInteger(kuota) || kuota < 0) {
        tampilPesan($("#errForm"), "Isi kuota pemakaian dengan bilangan bulat 0 atau lebih.");
        return;
    }
    const body = {
        discountType: $("#jenis").value,
        discountValue: nilai,
        minPurchase: Number($("#minimal").value) || 0,
        quota: kuota,
        allowStackWithTier: $("#gabung").checked,
        isActive: $("#aktif").checked,
    };
    if ($("#sampai").value) body.validUntil = tanggalISO($("#sampai").value, "23:59:59");
    if (!dipilih && $("#kode").value.trim()) body.code = $("#kode").value.trim().toUpperCase();
    tombol.disabled = true;
    tampilPesan($("#errForm"), "");
    try {
        const { data } = await api(dipilih ? `/admin/promo-codes/${dipilih.id}` : "/admin/promo-codes", {
            method: dipilih ? "PATCH" : "POST",
            body,
        });
        if (!dipilih) toast(`Kode ${data.code} dibuat.`, "success");
        $("#form").hidden = true;
        await muat();
    } catch (error) {
        tampilPesan($("#errForm"), pesanIsianForm(error));
    } finally {
        tombol.disabled = false;
    }
});

muat();
