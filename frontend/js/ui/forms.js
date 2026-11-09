import { ApiError } from "../core/api.js";
import { errorMessage, issuesText, pesanIssue } from "../core/errors.js";

export function tampilPesan(box, message) {
    box.hidden = !message;
    box.querySelector(".msg").textContent = message || "";
}

export function tampilGalat(box, isi, teks) {
    box.hidden = !isi;
    if (!isi) return;
    box.querySelector(".msg").textContent = teks || (typeof isi === "string" ? isi : errorMessage(isi));
    box.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

export function periksa(daftar) {
    let pertama = null;
    daftar.forEach(([input, valid, field = input.closest(".field")]) => {
        field.classList.toggle("is-error", !valid);
        const pesan = field.querySelector(".error-msg:not([data-server])");
        if (pesan) pesan.hidden = valid;
        input.setAttribute("aria-invalid", String(!valid));
        if (!valid && !pertama) pertama = input;
    });
    if (pertama) pertama.focus();
    return !pertama;
}

export function tandaiField(input, teks) {
    const field = input.closest(".field") || input.parentElement;
    field.classList.add("is-error");
    input.setAttribute("aria-invalid", "true");
    const pesan = document.createElement("p");
    pesan.className = "error-msg";
    pesan.dataset.server = "1";
    pesan.textContent = teks;
    field.append(pesan);
}

export function showIssues(form, error, fields) {
    form.querySelectorAll(".is-error").forEach(f => f.classList.remove("is-error"));
    form.querySelectorAll("[aria-invalid=true]").forEach(i => i.setAttribute("aria-invalid", "false"));
    form.querySelectorAll(".error-msg[data-server]").forEach(p => p.remove());
    if (!(error instanceof ApiError) || error.code !== "VALIDATION_ERROR") return false;
    const sisa = [];
    let pertama = null;
    error.issues.forEach(issue => {
        const id = fields[issue.path];
        const input = id && form.querySelector(`#${id}`);
        if (!input) return sisa.push(issue);
        tandaiField(input, pesanIssue(issue));
        if (!pertama) pertama = input;
    });
    if (pertama) pertama.focus();
    return sisa;
}

export function pesanGantiPassword(form, error) {
    const teks = pesanForm(form, error, { currentPassword: "pl", newPassword: "pb" });
    if (error instanceof ApiError && error.message === "current password is incorrect") {
        const input = form.querySelector("#pl");
        tandaiField(input, "Password lama salah.");
        input.focus();
    }
    return teks;
}

export function pesanForm(form, error, fields) {
    const sisa = showIssues(form, error, fields);
    if (sisa === false) return errorMessage(error);
    return sisa.length ? issuesText(sisa) : "Periksa lagi isian yang ditandai.";
}

export function needsChangeReason(error) {
    return error instanceof ApiError && error.issues.some(i => i.code === "change_reason_required");
}

export function askChangeReason(container, onSubmit) {
    container.hidden = false;
    container.className = "alert alert--warning stack";
    const judul = document.createElement("span");
    judul.className = "alert-title";
    judul.textContent = "Perubahan ini mengenai pesanan yang sudah lunas";
    const teks = document.createElement("p");
    teks.textContent = "Tulis alasan perubahan. Alasan ini dikirim ke pelanggan sebagai pengumuman.";
    const isi = document.createElement("textarea");
    isi.className = "textarea";
    isi.maxLength = 500;
    isi.setAttribute("aria-label", "Alasan perubahan");
    const baris = document.createElement("div");
    baris.className = "row";
    const kirim = document.createElement("button");
    kirim.type = "button";
    kirim.className = "btn btn-primary btn-sm";
    kirim.textContent = "Kirim dengan Alasan";
    const batal = document.createElement("button");
    batal.type = "button";
    batal.className = "btn btn-ghost btn-sm";
    batal.textContent = "Batal";
    batal.onclick = () => (container.hidden = true);
    kirim.onclick = async () => {
        const alasan = isi.value.trim();
        if (!alasan) return isi.focus();
        kirim.disabled = true;
        try {
            await onSubmit(alasan);
            container.hidden = true;
        } catch {
            isi.focus();
        } finally {
            kirim.disabled = false;
        }
    };
    baris.append(kirim, batal);
    container.replaceChildren(judul, teks, isi, baris);
    isi.focus();
}
