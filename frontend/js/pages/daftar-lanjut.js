import "../layout/boot.js";
import { api, ApiError, store } from "../core/api.js";
import { currentUser, homeFor } from "../core/session.js";
import { pasangPeta } from "../features/peta.js";
import { $ } from "../ui/dom.js";
import { pesanForm, tampilGalat, tandaiField } from "../ui/forms.js";

const FIELD_LANJUT = {
    name: "nama",
    email: "email",
    address: "alamat",
    latitude: "peta",
    longitude: "peta",
    allergyIds: "alergi",
    allergyNote: "catAlergi",
};

function tujuan() {
    const minta = new URLSearchParams(location.search).get("redirect");
    return minta && /^[\w-]+\.html(\?[\w%=&.-]*)?$/.test(minta) ? minta : homeFor(currentUser());
}

const peta = pasangPeta($("#peta"), { label: "Peta lokasi rumah. Ketuk untuk menaruh pin." });

api("/allergies", { auth: false })
    .then(({ data }) => {
        if (!data.length) return;
        $("#alergi").replaceChildren(
            ...data.map(item => {
                const label = document.createElement("label");
                label.className = "chip";
                const input = document.createElement("input");
                input.type = "checkbox";
                input.value = item.id;
                label.append(input, item.name);
                return label;
            }),
        );
        $("#fAlergi").hidden = false;
    })
    .catch(() => {});

$("#lewati").onclick = () => location.replace(tujuan());

$("#form").addEventListener("submit", async event => {
    event.preventDefault();
    const email = $("#email").value.trim();
    const emailValid = email === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    $("#fEmail").classList.toggle("is-error", !emailValid);
    $("#fEmail .error-msg").hidden = emailValid;
    $("#email").setAttribute("aria-invalid", String(!emailValid));
    if (!emailValid) return $("#email").focus();

    const body = {};
    if ($("#nama").value.trim()) body.name = $("#nama").value.trim();
    if (email) body.email = email;
    if ($("#alamat").value.trim()) body.address = $("#alamat").value.trim();
    const titik = peta.ambilTitik();
    if (titik) {
        body.latitude = titik.lat;
        body.longitude = titik.lng;
    }
    const alergi = [...document.querySelectorAll("#alergi input:checked")].map(input => input.value);
    if (alergi.length) body.allergyIds = alergi;
    if ($("#catAlergi").value.trim()) body.allergyNote = $("#catAlergi").value.trim();
    if (!Object.keys(body).length) return location.replace(tujuan());

    const tombol = $("#simpan");
    tombol.disabled = true;
    $("#lewati").disabled = true;
    tampilGalat($("#err"), "");
    try {
        const { data } = await api("/me", { method: "PATCH", body });
        store.user = data;
        location.replace(tujuan());
    } catch (error) {
        tampilGalat($("#err"), pesanForm(event.target, error, FIELD_LANJUT));
        if (error instanceof ApiError && error.code === "CONFLICT" && error.message === "email is already registered") {
            tandaiField($("#email"), "Email ini sudah dipakai akun lain.");
            $("#email").focus();
        }
        tombol.disabled = false;
        $("#lewati").disabled = false;
    }
});
