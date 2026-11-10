import "../layout/boot.js";
import { api, store } from "../core/api.js";
import { errorMessage } from "../core/errors.js";
import { pasangGantiPassword } from "../features/akun.js";
import { pilihAlergi } from "../features/alergi.js";
import { pasangPeta } from "../features/peta.js";
import { $ } from "../ui/dom.js";
import { pesanForm, tampilPesan, tandaiField } from "../ui/forms.js";

const FIELD_PROFIL = {
    name: "nama",
    phone: "hp",
    email: "email",
    address: "alamat",
    allergyIds: "alergi",
    allergyNote: "catAlergi",
    latitude: "peta",
    longitude: "peta",
};
let petaProfil = null;
let pinProfil = null;
const alergiProfil = pilihAlergi($("#alergi"));

function isiForm(user) {
    $("#nama").value = user.name || "";
    $("#hp").value = user.phone || "";
    $("#email").value = user.email || "";
    $("#alamat").value = user.address || "";
    $("#catAlergi").value = user.allergyNote || "";
}

async function muat() {
    try {
        const [profil, alergi] = await Promise.all([api("/me"), api("/allergies", { auth: false })]);
        isiForm(profil.data);
        const lat = profil.data.latitude;
        const lng = profil.data.longitude;
        const titik = lat != null && lng != null ? { lat: Number(lat), lng: Number(lng) } : null;
        if (!petaProfil) {
            petaProfil = pasangPeta($("#peta"), {
                titik,
                label: "Peta titik lokasi tersimpan. Ketuk untuk menaruh pin.",
                onPilih: baru => {
                    pinProfil = baru;
                },
            });
        } else petaProfil.setTitik(titik);
        pinProfil = petaProfil.ambilTitik();
        alergiProfil.setNilai((profil.data.allergies || []).map(item => item.id));
        alergiProfil.setAlergi(alergi.data);
        $("#simpanProfil").disabled = false;
    } catch (error) {
        tampilPesan($("#errMuat"), `${errorMessage(error)} Muat ulang halaman untuk mencoba lagi.`);
    }
}

$("#fProfil").addEventListener("submit", async event => {
    event.preventDefault();
    const tombol = event.target.querySelector("button[type=submit]");
    tampilPesan($("#errProfil"), "");
    tampilPesan($("#okProfil"), "");
    event.target.querySelectorAll(".is-error").forEach(f => f.classList.remove("is-error"));
    event.target.querySelectorAll(".error-msg[data-server]").forEach(p => p.remove());
    const kosong = [
        ["#nama", "Nama wajib diisi."],
        ["#hp", "Nomor HP wajib diisi."],
    ].filter(([selector]) => !$(selector).value.trim());
    if (kosong.length) {
        kosong.forEach(([selector, teks]) => tandaiField($(selector), teks));
        return $(kosong[0][0]).focus();
    }
    const atauNull = selector => $(selector).value.trim() || null;
    const body = {
        name: $("#nama").value.trim(),
        phone: $("#hp").value.trim(),
        email: atauNull("#email"),
        address: atauNull("#alamat"),
        allergyNote: atauNull("#catAlergi"),
        allergyIds: alergiProfil.nilai(),
        latitude: pinProfil ? pinProfil.lat : null,
        longitude: pinProfil ? pinProfil.lng : null,
    };
    tombol.disabled = true;
    try {
        const { data } = await api("/me", { method: "PATCH", body });
        store.user = data;
        isiForm(data);
        pinProfil = petaProfil.ambilTitik();
        tampilPesan($("#okProfil"), "Perubahan profil sudah disimpan.");
        scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
        tampilPesan($("#errProfil"), pesanForm(event.target, error, FIELD_PROFIL));
    } finally {
        tombol.disabled = false;
    }
});

$("#hapusTitik").addEventListener("click", () => {
    if (petaProfil) petaProfil.setTitik(null);
    pinProfil = null;
});

pasangGantiPassword($("#fPw"));

muat();
