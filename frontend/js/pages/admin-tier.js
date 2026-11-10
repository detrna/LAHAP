import "../layout/boot.js";
import { api, ApiError, upload } from "../core/api.js";
import { kosongkanBerkas, pilihBerkas } from "../ui/berkas.js";
import { $, el } from "../ui/dom.js";
import { rp } from "../ui/format.js";
import { pesanForm, tampilGalat, tampilPesan, tandaiField } from "../ui/forms.js";
import { peringatan } from "../ui/peringatan.js";

let dipilih = null;
let fotoKey = null;

const FIELD_FORM = {
    name: "nama",
    requiredSubscriptionDays: "syarat",
    durationDays: "durasi",
    discountPercent: "diskon",
    description: "deskripsi",
    photoKey: "berkas",
};
const KONFLIK_FORM = {
    "tier name is already used": "nama",
    "required subscription days is already used by another tier": "syarat",
};

function pesanIsianForm(error) {
    const teks = pesanForm($("#form"), error, FIELD_FORM);
    const id = error instanceof ApiError && error.code === "CONFLICT" && KONFLIK_FORM[error.message];
    if (id) {
        tandaiField($(`#${id}`), teks);
        $(`#${id}`).focus();
    }
    return teks;
}

function pratinjau(url) {
    $("#pratinjau").hidden = !url;
    $("#hapusFoto").hidden = !url;
    if (url) $("#gambar").src = url;
}

function bukaForm(tier) {
    dipilih = tier;
    $("#judulForm").textContent = tier ? "Ubah tier" : "Tambah tier";
    $("#nama").value = tier ? tier.name : "";
    $("#deskripsi").value = tier && tier.description ? tier.description : "";
    $("#syarat").value = tier ? tier.requiredSubscriptionDays : "";
    $("#durasi").value = tier ? tier.durationDays : 30;
    $("#diskon").value = tier ? tier.discountPercent : 0;
    fotoKey = tier ? tier.photoKey : null;
    kosongkanBerkas($("#berkas"));
    pratinjau(tier ? tier.photoUrl : null);
    tampilPesan($("#errForm"), "");
    $("#form").hidden = false;
    $("#form").scrollIntoView();
}

function barisTier(tier) {
    const baris = el("div", "invoice");
    const kiri = el("div", "row");
    if (tier.photoUrl) {
        const foto = document.createElement("img");
        foto.src = tier.photoUrl;
        foto.alt = `Foto tier ${tier.name}`;
        foto.style.cssText = "width:64px;height:64px;object-fit:cover;border-radius:8px";
        kiri.append(foto);
    } else {
        kiri.append(el("div", "avatar", tier.name.charAt(0).toUpperCase()));
    }
    const teks = el("div");
    teks.append(
        el("p", "t-h3", tier.name),
        el(
            "p",
            "t-small t-muted",
            `Mulai ${tier.requiredSubscriptionDays} hari layanan · diskon ${tier.discountPercent}% · berlaku ${tier.durationDays} hari`,
        ),
        el("p", "t-small t-muted", `${tier.memberCount} anggota · total diskon ${rp(tier.totalDiscountGiven)}`),
    );
    kiri.append(teks);

    const kanan = el("div", "row");
    const ubah = el("button", "btn btn-secondary btn-sm", "Ubah");
    ubah.type = "button";
    ubah.onclick = () => bukaForm(tier);
    const hapus = el("button", "btn btn-danger btn-sm", "Hapus");
    hapus.type = "button";
    hapus.onclick = async () => {
        const ok = await peringatan({
            judul: `Hapus tier ${tier.name}?`,
            akibat: [
                tier.memberCount
                    ? `${tier.memberCount} anggotanya dipindah ke tier di bawahnya dengan masa berlaku yang sama, atau kehilangan keanggotaan jika tidak ada tier di bawahnya.`
                    : "Tier ini belum punya anggota.",
                "Tier yang dihapus tidak bisa dikembalikan.",
            ],
            tombol: "Ya, hapus",
            bahaya: true,
        });
        if (!ok) return;
        tampilGalat($("#galat"), "");
        try {
            await api(`/admin/tiers/${tier.id}`, { method: "DELETE" });
            await muat();
        } catch (error) {
            tampilGalat($("#galat"), error);
        }
    };
    kanan.append(ubah, hapus);
    baris.append(kiri, kanan);
    return baris;
}

function setujuiUbahTier(tier, { syarat, durasi, diskon }) {
    const akibat = [];
    if (syarat !== tier.requiredSubscriptionDays)
        akibat.push(
            `Syarat berubah dari ${tier.requiredSubscriptionDays} ke ${syarat} hari. Anggota sekarang tetap di tier ini sampai pesanan berbayar berikutnya.`,
        );
    if (diskon !== Number(tier.discountPercent))
        akibat.push(
            `Diskon berubah dari ${Number(tier.discountPercent)}% ke ${diskon}% untuk pesanan baru. Pesanan yang sudah dibayar tidak berubah.`,
        );
    if (durasi !== tier.durationDays)
        akibat.push(`Masa berlaku ${durasi} hari baru dipakai saat keanggotaan diperpanjang.`);
    if (!akibat.length) return true;
    if (tier.memberCount) akibat.push(`Tier ini punya ${tier.memberCount} anggota aktif.`);
    return peringatan({ judul: `Ubah aturan tier ${tier.name}?`, akibat, tombol: "Ya, simpan" });
}

async function muat() {
    try {
        const { data } = await api("/admin/tiers");
        const urut = [...data].sort((a, b) => a.requiredSubscriptionDays - b.requiredSubscriptionDays);
        $("#daftar").replaceChildren(...(urut.length ? urut.map(barisTier) : [el("p", "empty", "Belum ada tier.")]));
    } catch (error) {
        $("#daftar").replaceChildren();
        tampilGalat($("#galat"), error);
    } finally {
        $("#daftar").removeAttribute("aria-busy");
    }
}

$("#tambah").onclick = () => bukaForm(null);
$("#batal").onclick = () => {
    $("#form").hidden = true;
};
$("#hapusFoto").onclick = () => {
    fotoKey = null;
    kosongkanBerkas($("#berkas"));
    pratinjau(null);
};
pilihBerkas($("#berkas"));
$("#berkas").addEventListener("change", event => {
    const berkas = event.target.files[0];
    if (berkas) pratinjau(URL.createObjectURL(berkas));
    else pratinjau(dipilih && fotoKey && fotoKey === dipilih.photoKey ? dipilih.photoUrl : null);
});

$("#form").addEventListener("submit", async event => {
    event.preventDefault();
    const tombol = event.target.querySelector("button[type=submit]");
    const syarat = Number($("#syarat").value);
    const durasi = Number($("#durasi").value);
    const diskon = Number($("#diskon").value);
    const valid =
        $("#nama").value.trim() &&
        $("#syarat").value !== "" &&
        Number.isInteger(syarat) &&
        syarat >= 0 &&
        Number.isInteger(durasi) &&
        durasi >= 1 &&
        durasi <= 3650 &&
        diskon >= 0 &&
        diskon <= 100;
    if (!valid) {
        tampilPesan(
            $("#errForm"),
            "Isi nama, syarat hari (0 atau lebih), masa berlaku 1 sampai 3650 hari, dan diskon 0 sampai 100 persen.",
        );
        return;
    }
    if (dipilih && !(await setujuiUbahTier(dipilih, { syarat, durasi, diskon }))) return;
    tombol.disabled = true;
    tampilPesan($("#errForm"), "");
    try {
        const berkas = $("#berkas").files[0];
        if (berkas) fotoKey = (await upload("tiers", berkas)).key;
        const body = {
            name: $("#nama").value.trim(),
            requiredSubscriptionDays: syarat,
            durationDays: durasi,
            discountPercent: diskon,
        };
        if ($("#deskripsi").value.trim()) body.description = $("#deskripsi").value.trim();
        else if (dipilih && dipilih.description) body.description = null;
        if (fotoKey) body.photoKey = fotoKey;
        else if (dipilih && dipilih.photoKey) body.photoKey = null;
        await api(dipilih ? `/admin/tiers/${dipilih.id}` : "/admin/tiers", {
            method: dipilih ? "PATCH" : "POST",
            body,
        });
        $("#form").hidden = true;
        await muat();
    } catch (error) {
        tampilPesan($("#errForm"), pesanIsianForm(error));
    } finally {
        tombol.disabled = false;
    }
});

muat();
