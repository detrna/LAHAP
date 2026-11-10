import { ApiError } from "../core/api.js";
import { errorMessage } from "../core/errors.js";
import { homeFor, login, redirectAman, register } from "../core/session.js";
import { periksa, pesanForm, tampilPesan, tandaiField } from "../ui/forms.js";
import { buatFormLanjut, pasangFormLanjut } from "./profil-lanjut.js";

const FIELD_DAFTAR = { phone: "m-dHp", password: "m-dPw", confirmPassword: "m-dUlang" };

const HTML = `
<div class="modal-box">
    <div class="modal-head">
        <h2 class="t-h2" id="m-judul">Masuk ke LAHAP</h2>
        <button type="button" class="modal-tutup" aria-label="Tutup">&times;</button>
    </div>
    <form id="m-formMasuk" class="stack" novalidate>
        <div class="alert alert--error" id="m-errMasuk" role="alert" hidden>
            <span class="alert-title">Gagal masuk</span><span class="msg"></span>
        </div>
        <div class="field">
            <label for="m-id">Nomor HP atau email</label>
            <input class="input" id="m-id" autocomplete="username" autocapitalize="none" spellcheck="false" />
            <p class="error-msg" hidden>Isi nomor HP atau email.</p>
        </div>
        <div class="field">
            <label for="m-pw">Password</label>
            <input class="input" id="m-pw" type="password" autocomplete="current-password" />
            <p class="error-msg" hidden>Isi password.</p>
        </div>
        <label class="row t-small"><input type="checkbox" class="lihat-pw" /> Tampilkan password</label>
        <button class="btn btn-primary btn-block" type="submit">Masuk</button>
        <button class="btn btn-ghost btn-block" type="button" id="m-keDaftar">Belum punya akun? Daftar</button>
    </form>
    <form id="m-formDaftar" class="stack" novalidate hidden>
        <p class="label">Langkah 1 dari 2 · Data wajib</p>
        <div class="alert alert--error" id="m-errDaftar" role="alert" hidden>
            <span class="alert-title">Gagal mendaftar</span><span class="msg"></span>
        </div>
        <div class="field">
            <label for="m-dHp">Nomor HP</label>
            <input class="input" id="m-dHp" inputmode="tel" autocomplete="tel" placeholder="081234567890" />
            <p class="error-msg" hidden>Nomor HP tidak valid. Contoh: 081234567890</p>
        </div>
        <div class="field">
            <label for="m-dPw">Password</label>
            <input class="input" id="m-dPw" type="password" autocomplete="new-password" />
            <p class="error-msg" hidden>Password harus 8 sampai 72 karakter.</p>
        </div>
        <div class="field">
            <label for="m-dUlang">Ulangi password</label>
            <input class="input" id="m-dUlang" type="password" autocomplete="new-password" />
            <p class="error-msg" hidden>Password tidak sama.</p>
        </div>
        <label class="row t-small"><input type="checkbox" class="lihat-pw" /> Tampilkan password</label>
        <button class="btn btn-primary btn-block" type="submit">Daftar dan Lanjut</button>
        <button class="btn btn-ghost btn-block" type="button" id="m-keMasuk">Sudah punya akun? Masuk</button>
    </form>
    <div id="m-lanjut" hidden>
        <p class="label">Langkah 2 dari 2 · Data opsional</p>
        <p class="t-muted">Akunmu sudah jadi. Semua isian di bawah boleh dilewati dan bisa diubah nanti di halaman Profil.</p>
    </div>
</div>`;

let terbuka = null;

export function bukaMasuk({ mode = "masuk", redirect = null, pemicu = null } = {}) {
    if (terbuka) return;
    const aman = redirectAman(redirect);
    const dialog = document.createElement("dialog");
    dialog.className = "modal";
    dialog.setAttribute("aria-labelledby", "m-judul");
    dialog.innerHTML = HTML;
    terbuka = dialog;
    let selesai = null;

    const ambil = id => dialog.querySelector(`#m-${id}`);

    function tampil(pane) {
        ambil("formMasuk").hidden = pane !== "masuk";
        ambil("formDaftar").hidden = pane !== "daftar";
        ambil("lanjut").hidden = pane !== "lanjut";
        ambil("judul").textContent = {
            masuk: "Masuk ke LAHAP",
            daftar: "Daftar akun pelanggan",
            lanjut: "Lengkapi profilmu",
        }[pane];
        if (pane === "masuk") ambil("id").focus();
        if (pane === "daftar") ambil("dHp").focus();
    }

    function selesaikan(user) {
        selesai = user;
        dialog.close();
    }

    async function kirim(form, aksi, box, fields, sukses) {
        const tombol = form.querySelector("button[type=submit]");
        tombol.disabled = true;
        tampilPesan(box, "");
        try {
            sukses(await aksi());
        } catch (error) {
            if (!fields) {
                tampilPesan(box, errorMessage(error));
                return;
            }
            tampilPesan(box, pesanForm(form, error, fields));
            if (
                error instanceof ApiError &&
                error.code === "CONFLICT" &&
                error.message === "phone is already registered"
            ) {
                const input = ambil("dHp");
                tandaiField(input, "Nomor HP ini sudah terdaftar. Silakan masuk.");
                input.focus();
            }
        } finally {
            tombol.disabled = false;
        }
    }

    dialog.querySelectorAll(".lihat-pw").forEach(box => {
        box.addEventListener("change", () => {
            box.closest("form")
                .querySelectorAll("input[autocomplete$=password]")
                .forEach(input => {
                    input.type = box.checked ? "text" : "password";
                });
        });
    });

    ambil("keDaftar").onclick = () => tampil("daftar");
    ambil("keMasuk").onclick = () => tampil("masuk");
    dialog.querySelector(".modal-tutup").onclick = () => dialog.close();
    dialog.addEventListener("click", event => {
        if (event.target === dialog) dialog.close();
    });

    ambil("formMasuk").addEventListener("submit", event => {
        event.preventDefault();
        const identifier = ambil("id").value.trim();
        const password = ambil("pw").value;
        if (
            !periksa([
                [ambil("id"), identifier !== ""],
                [ambil("pw"), password !== ""],
            ])
        )
            return;
        kirim(event.target, () => login(identifier, password), ambil("errMasuk"), null, selesaikan);
    });

    ambil("formDaftar").addEventListener("submit", event => {
        event.preventDefault();
        const phone = ambil("dHp").value.trim();
        const password = ambil("dPw").value;
        const valid = periksa([
            [ambil("dHp"), /^(\+?62|0)8\d{8,12}$/.test(phone.replace(/[\s-]/g, ""))],
            [ambil("dPw"), password.length >= 8 && password.length <= 72],
            [ambil("dUlang"), password === ambil("dUlang").value],
        ]);
        if (!valid) return;
        const fields = { phone, password, confirmPassword: ambil("dUlang").value };
        kirim(
            event.target,
            () => register(fields),
            ambil("errDaftar"),
            FIELD_DAFTAR,
            async user => {
                selesai = user;
                const form = buatFormLanjut("m-");
                ambil("lanjut").append(form);
                tampil("lanjut");
                await pasangFormLanjut(form, { prefix: "m-", selesai: () => dialog.close() });
                ambil("nama").focus();
            },
        );
    });

    dialog.addEventListener("close", () => {
        document.body.classList.remove("modal-open");
        dialog.remove();
        terbuka = null;
        if (pemicu && pemicu.isConnected) pemicu.focus();
        if (!selesai) return;
        const tujuan =
            aman ||
            (selesai.role !== "CUSTOMER" || new URLSearchParams(location.search).has("masuk")
                ? homeFor(selesai)
                : null);
        if (tujuan) location.href = tujuan;
        else location.reload();
    });

    document.body.append(dialog);
    document.body.classList.add("modal-open");
    dialog.showModal();
    tampil(mode === "daftar" ? "daftar" : "masuk");
}
