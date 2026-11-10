import "../layout/boot.js";
import { api } from "../core/api.js";
import { issuesText } from "../core/errors.js";
import { gambarJangkauan } from "../features/jangkauan.js";
import { pasangPeta } from "../features/peta.js";
import { $ } from "../ui/dom.js";
import { angka, formatTanggal, formatWhatsapp, rp } from "../ui/format.js";
import { periksa, showIssues, tampilGalat } from "../ui/forms.js";
import { peringatan } from "../ui/peringatan.js";
import { toast } from "../ui/toast.js";

const galat = (isi, teks) => tampilGalat($("#err"), isi, teks);
let tersimpan = null;
const peta = pasangPeta($("#peta"), {
    label: "Peta lokasi dapur. Ketuk untuk memindahkan pin.",
    petunjuk: "Ketuk peta, cari alamat, atau pakai lokasi Anda untuk menaruh pin dapur.",
    masukan: { lat: $("#lat"), lng: $("#lng") },
});

function aturRadius() {
    const km = id => (ada(id) && Number($(`#${id}`).value) >= 0 ? Math.floor(Number($(`#${id}`).value)) : 0);
    gambarJangkauan(peta, {
        bebasKm: km("r1"),
        maksKm: km("r2"),
        legenda: $("#legenda"),
        catatan: "Jarak garis lurus, dibulatkan ke atas per km seperti saat checkout.",
    });
}
["r1", "r2"].forEach(id => $(`#${id}`).addEventListener("input", aturRadius));

const FIELDS = {
    name: "nama",
    whatsappNumber: "wa",
    address: "alamat",
    latitude: "lat",
    longitude: "lng",
    deliveryFreeRadius: "r1",
    deliveryMaxDistance: "r2",
    deliveryPricePerKm: "r3",
    paymentTimeoutMinutes: "batas",
};

function isi(s) {
    tersimpan = s;
    $("#nama").value = s.name;
    $("#wa").value = s.whatsappNumber;
    $("#alamat").value = s.address;
    $("#lat").value = s.latitude;
    $("#lng").value = s.longitude;
    $("#r1").value = s.deliveryFreeRadius;
    $("#r2").value = s.deliveryMaxDistance;
    $("#r3").value = s.deliveryPricePerKm;
    $("#batas").value = s.paymentTimeoutMinutes;
    $("#diubah").textContent = s.updatedAt ? `Terakhir diubah ${formatTanggal(s.updatedAt, "waktu")}.` : "";
    peta.setTitik({ lat: Number(s.latitude), lng: Number(s.longitude) });
    aturRadius();
    peta.tampilkanSemua();
}

async function muat() {
    try {
        isi((await api("/admin/settings")).data);
        galat(null);
    } catch (error) {
        galat(error);
    } finally {
        $("#form").removeAttribute("aria-busy");
    }
}

const nomorWa = hp => {
    const digit = hp.replace(/\D/g, "");
    if (digit.startsWith("62")) return digit;
    if (digit.startsWith("0")) return `62${digit.slice(1)}`;
    return `62${digit}`;
};

function akibatPengaturan(lama, baru) {
    const beda = key => Number(lama[key]) !== Number(baru[key]);
    const akibat = [];
    if (lama.name !== baru.name)
        akibat.push(
            `Nama usaha berubah dari "${lama.name}" ke "${baru.name}" dan langsung terlihat oleh semua pelanggan.`,
        );
    const wa = nomorWa(baru.whatsappNumber);
    if (lama.whatsappNumber !== wa)
        akibat.push(
            `Nomor WhatsApp bantuan yang dilihat pelanggan berganti ke ${formatWhatsapp(wa)}. Pastikan nomornya benar.`,
        );
    if (lama.address !== baru.address || beda("latitude") || beda("longitude"))
        akibat.push(
            "Lokasi ambil berubah untuk semua pesanan, termasuk yang sudah dibayar. Pelanggan ambil sendiri akan diarahkan ke alamat baru, dan ongkir pesanan baru dihitung dari lokasi baru.",
        );
    const tarif = [];
    if (beda("deliveryFreeRadius")) tarif.push(`gratis ongkir ${angka(baru.deliveryFreeRadius)} km`);
    if (beda("deliveryMaxDistance")) tarif.push(`jarak maksimal ${angka(baru.deliveryMaxDistance)} km`);
    if (beda("deliveryPricePerKm")) tarif.push(`${rp(baru.deliveryPricePerKm)} per km`);
    if (tarif.length) {
        akibat.push(
            `Tarif antar baru (${tarif.join(", ")}) hanya berlaku untuk pesanan baru. Pesanan lama tetap memakai ongkir saat checkout.`,
        );
        if (Number(baru.deliveryMaxDistance) < Number(lama.deliveryMaxDistance))
            akibat.push("Pelanggan di luar jarak maksimal yang baru tidak bisa memilih diantar lagi.");
    }
    if (beda("paymentTimeoutMinutes")) {
        akibat.push(
            `Batas bayar menjadi ${baru.paymentTimeoutMinutes} menit dan langsung berlaku untuk pesanan yang masih Pending.`,
        );
        if (Number(baru.paymentTimeoutMinutes) < Number(lama.paymentTimeoutMinutes))
            akibat.push("Pesanan Pending yang sudah lewat batas baru akan kedaluwarsa dalam satu menit.");
    }
    return akibat;
}

function setujuiPengaturan(baru) {
    if (!tersimpan) return true;
    const akibat = akibatPengaturan(tersimpan, baru);
    if (!akibat.length) return true;
    return peringatan({ judul: "Simpan perubahan usaha?", akibat, tombol: "Ya, simpan" });
}

const ada = id => $(`#${id}`).value.trim() !== "";
$("#form").onsubmit = async event => {
    event.preventDefault();
    showIssues($("#form"), null, {});
    const lat = Number($("#lat").value),
        lng = Number($("#lng").value),
        r1 = Number($("#r1").value),
        r2 = Number($("#r2").value),
        batas = Number($("#batas").value);
    const hp = $("#wa").value.replace(/[\s-]/g, "");
    if (
        !periksa([
            [$("#nama"), ada("nama")],
            [$("#wa"), /^(\+?62|0)?8\d{8,12}$/.test(hp)],
            [$("#alamat"), ada("alamat")],
            [$("#lat"), ada("lat") && lat >= -90 && lat <= 90],
            [$("#lng"), ada("lng") && lng >= -180 && lng <= 180],
            [$("#r1"), ada("r1") && r1 >= 0 && (!ada("r2") || r1 <= r2)],
            [$("#r2"), ada("r2") && r2 >= 0],
            [$("#r3"), ada("r3") && Number($("#r3").value) >= 0],
            [$("#batas"), Number.isInteger(batas) && batas >= 1 && batas <= 1440],
        ])
    )
        return;
    const body = {
        name: $("#nama").value.trim(),
        whatsappNumber: hp,
        address: $("#alamat").value.trim(),
        latitude: lat,
        longitude: lng,
        deliveryFreeRadius: r1,
        deliveryMaxDistance: r2,
        deliveryPricePerKm: Number($("#r3").value),
        paymentTimeoutMinutes: batas,
    };
    if (!(await setujuiPengaturan(body))) return;
    $("#simpan").disabled = true;
    galat(null);
    try {
        isi((await api("/admin/settings", { method: "PUT", body })).data);
        toast("Pengaturan disimpan.");
    } catch (error) {
        const sisa = showIssues($("#form"), error, FIELDS);
        if (sisa === false) galat(error);
        else if (sisa.length) galat(error, issuesText(sisa));
    } finally {
        $("#simpan").disabled = false;
    }
};
muat();
