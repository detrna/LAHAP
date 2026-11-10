import { ApiError, api, store } from "../core/api.js";
import { pesanForm, tampilGalat, tandaiField } from "../ui/forms.js";
import { pasangPeta, pastikanLeaflet } from "./peta.js";

const FIELD_LANJUT = {
    name: "nama",
    email: "email",
    address: "alamat",
    latitude: "peta",
    longitude: "peta",
    allergyIds: "alergi",
    allergyNote: "catAlergi",
};

export function buatFormLanjut(prefix = "") {
    const form = document.createElement("form");
    form.className = "stack";
    form.noValidate = true;
    form.innerHTML = `
        <div class="alert alert--error" id="${prefix}err" role="alert" hidden><span class="alert-title">Gagal menyimpan</span><span class="msg"></span></div>
        <div class="field">
            <label for="${prefix}nama">Nama</label>
            <input class="input" id="${prefix}nama" autocomplete="name" maxlength="100" />
            <p class="hint">Dipakai sebagai nama penerima saat memesan.</p>
        </div>
        <div class="field" id="${prefix}fEmail">
            <label for="${prefix}email">Email</label>
            <input class="input" id="${prefix}email" type="email" autocomplete="email" maxlength="100" />
            <p class="error-msg" hidden>Format email tidak valid.</p>
            <p class="hint">Bisa dipakai untuk masuk selain nomor HP.</p>
        </div>
        <div class="field">
            <label for="${prefix}alamat">Alamat</label>
            <textarea class="textarea" id="${prefix}alamat" autocomplete="street-address"></textarea>
        </div>
        <div class="field">
            <span class="field-label">Titik lokasi</span>
            <div id="${prefix}peta"></div>
            <p class="hint">Alamat dan titik ini hanya mengisi otomatis form pesanan. Tiap pesanan tetap bisa memakai alamat lain.</p>
        </div>
        <div class="field" id="${prefix}fAlergi" hidden>
            <span class="field-label">Alergi</span>
            <div class="chip-group" id="${prefix}alergi"></div>
            <p class="hint">Dipakai untuk peringatan menu yang mengandung alergenmu.</p>
        </div>
        <div class="field">
            <label for="${prefix}catAlergi">Catatan alergi lain</label>
            <input class="input" id="${prefix}catAlergi" maxlength="500" placeholder="Mis. alergi kemiri" />
            <p class="hint">Untuk alergi yang tidak ada di daftar. Dapur akan memeriksa pesananmu secara khusus.</p>
        </div>
        <div class="row-between">
            <button class="btn btn-ghost" type="button" id="${prefix}lewati">Lewati</button>
            <button class="btn btn-primary" type="submit" id="${prefix}simpan">Simpan dan Lanjut</button>
        </div>`;
    return form;
}

export async function pasangFormLanjut(form, { prefix = "", selesai }) {
    const ambil = nama => form.querySelector(`#${prefix}${nama}`);
    const fields = Object.fromEntries(Object.entries(FIELD_LANJUT).map(([kunci, id]) => [kunci, `${prefix}${id}`]));

    await pastikanLeaflet();
    const peta = pasangPeta(ambil("peta"), { label: "Peta lokasi rumah. Ketuk untuk menaruh pin." });

    api("/allergies", { auth: false })
        .then(({ data }) => {
            if (!data.length) return;
            ambil("alergi").replaceChildren(
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
            ambil("fAlergi").hidden = false;
        })
        .catch(() => {});

    ambil("lewati").onclick = () => selesai();

    form.addEventListener("submit", async event => {
        event.preventDefault();
        const email = ambil("email").value.trim();
        const emailValid = email === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        ambil("fEmail").classList.toggle("is-error", !emailValid);
        ambil("fEmail").querySelector(".error-msg").hidden = emailValid;
        ambil("email").setAttribute("aria-invalid", String(!emailValid));
        if (!emailValid) return ambil("email").focus();

        const body = {};
        if (ambil("nama").value.trim()) body.name = ambil("nama").value.trim();
        if (email) body.email = email;
        if (ambil("alamat").value.trim()) body.address = ambil("alamat").value.trim();
        const titik = peta.ambilTitik();
        if (titik) {
            body.latitude = titik.lat;
            body.longitude = titik.lng;
        }
        const alergi = [...ambil("alergi").querySelectorAll("input:checked")].map(input => input.value);
        if (alergi.length) body.allergyIds = alergi;
        if (ambil("catAlergi").value.trim()) body.allergyNote = ambil("catAlergi").value.trim();
        if (!Object.keys(body).length) return selesai();

        const tombol = ambil("simpan");
        tombol.disabled = true;
        ambil("lewati").disabled = true;
        tampilGalat(ambil("err"), "");
        try {
            const { data } = await api("/me", { method: "PATCH", body });
            store.user = data;
            selesai();
        } catch (error) {
            tampilGalat(ambil("err"), pesanForm(form, error, fields));
            if (
                error instanceof ApiError &&
                error.code === "CONFLICT" &&
                error.message === "email is already registered"
            ) {
                tandaiField(ambil("email"), "Email ini sudah dipakai akun lain.");
                ambil("email").focus();
            }
            tombol.disabled = false;
            ambil("lewati").disabled = false;
        }
    });
}
