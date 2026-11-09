import "../layout/boot.js";
import { ApiError } from "../core/api.js";
import { errorMessage } from "../core/errors.js";
import { currentUser, homeFor, login, register } from "../core/session.js";
import { $ } from "../ui/dom.js";
import { periksa, pesanForm, tampilPesan, tandaiField } from "../ui/forms.js";

// ?redirect= hanya menerima nama halaman .html di situs ini, bukan alamat luar.
function tujuan(user) {
    const minta = new URLSearchParams(location.search).get("redirect");
    return minta && /^[\w-]+\.html(\?[\w%=&.-]*)?$/.test(minta) ? minta : homeFor(user);
}

if (currentUser()) location.href = tujuan(currentUser());

function tampil(daftar) {
    $("#formMasuk").hidden = daftar;
    $("#formDaftar").hidden = !daftar;
    $("#judul").textContent = daftar ? "Daftar akun pelanggan" : "Masuk ke LAHAP";
    document.title = `${daftar ? "Daftar" : "Masuk"} · LAHAP`;
    (daftar ? $("#dHp") : $("#id")).focus();
}

document.querySelectorAll(".lihat-pw").forEach(box => {
    box.addEventListener("change", () => {
        box.closest("form")
            .querySelectorAll("input[autocomplete$=password]")
            .forEach(input => {
                input.type = box.checked ? "text" : "password";
            });
    });
});

const FIELD_DAFTAR = { phone: "dHp", password: "dPw", confirmPassword: "dUlang" };

function tandaiTerdaftar(form, error) {
    if (!(error instanceof ApiError) || error.code !== "CONFLICT" || error.message !== "phone is already registered")
        return;
    const input = form.querySelector("#dHp");
    tandaiField(input, "Nomor HP ini sudah terdaftar. Silakan masuk.");
    input.focus();
}

async function kirim(form, aksi, box, fields, lanjut = tujuan) {
    const tombol = form.querySelector("button[type=submit]");
    tombol.disabled = true;
    tampilPesan(box, "");
    try {
        const user = await aksi();
        location.href = lanjut(user);
    } catch (error) {
        if (!fields) {
            tampilPesan(box, errorMessage(error));
            return;
        }
        tampilPesan(box, pesanForm(form, error, fields));
        tandaiTerdaftar(form, error);
    } finally {
        tombol.disabled = false;
    }
}

$("#keDaftar").onclick = () => tampil(true);
$("#keMasuk").onclick = () => tampil(false);

$("#formMasuk").addEventListener("submit", event => {
    event.preventDefault();
    const identifier = $("#id").value.trim();
    const password = $("#pw").value;
    if (
        !periksa([
            [$("#id"), identifier !== ""],
            [$("#pw"), password !== ""],
        ])
    )
        return;
    kirim(event.target, () => login(identifier, password), $("#errMasuk"));
});

$("#formDaftar").addEventListener("submit", event => {
    event.preventDefault();
    const phone = $("#dHp").value.trim();
    const password = $("#dPw").value;
    const valid = periksa([
        [$("#dHp"), /^(\+?62|0)8\d{8,12}$/.test(phone.replace(/[\s-]/g, ""))],
        [$("#dPw"), password.length >= 8 && password.length <= 72],
        [$("#dUlang"), password === $("#dUlang").value],
    ]);
    if (!valid) return;
    const fields = { phone, password, confirmPassword: $("#dUlang").value };
    const lanjut = user => `daftar-lanjut.html?redirect=${encodeURIComponent(tujuan(user))}`;
    kirim(event.target, () => register(fields), $("#errDaftar"), FIELD_DAFTAR, lanjut);
});
