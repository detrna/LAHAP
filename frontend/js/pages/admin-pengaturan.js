import "../layout/boot.js";
import { api } from "../core/api.js";
import { issuesText } from "../core/errors.js";
import { pasangPeta } from "../features/peta.js";
import { $ } from "../ui/dom.js";
import { formatTanggal } from "../ui/format.js";
import { periksa, showIssues, tampilGalat } from "../ui/forms.js";
import { toast } from "../ui/toast.js";

const galat = (isi, teks) => tampilGalat($("#err"), isi, teks);
const warna = nama => getComputedStyle(document.documentElement).getPropertyValue(nama).trim();
const peta = pasangPeta($("#peta"), {
    label: "Peta lokasi dapur. Ketuk untuk memindahkan pin.",
    petunjuk: "Ketuk peta, cari alamat, atau pakai lokasi Anda untuk menaruh pin dapur.",
    masukan: { lat: $("#lat"), lng: $("#lng") },
});

function aturRadius() {
    const km = id => (ada(id) && Number($(`#${id}`).value) >= 0 ? Math.floor(Number($(`#${id}`).value)) : 0);
    const daftar = [
        { km: km("r2"), warna: warna("--orange-700"), teks: "batas antar" },
        { km: km("r1"), warna: warna("--success-text"), teks: "gratis ongkir" },
    ].filter(c => c.km > 0);
    peta.aturLingkaran(daftar);
    $("#legenda").hidden = !daftar.length;
    $("#legenda").replaceChildren(
        ...daftar.map(c => {
            const li = document.createElement("li");
            const swatch = document.createElement("span");
            swatch.className = "swatch";
            swatch.style.color = c.warna;
            li.append(swatch, `${c.teks[0].toUpperCase()}${c.teks.slice(1)} sampai ${c.km} km`);
            return li;
        }),
        Object.assign(document.createElement("li"), {
            textContent: "Jarak garis lurus, dibulatkan ke atas per km seperti saat checkout.",
        }),
    );
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
