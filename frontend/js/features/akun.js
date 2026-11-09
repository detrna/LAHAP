import { api, clearSession } from "../core/api.js";
import { periksa, pesanGantiPassword, tampilGalat } from "../ui/forms.js";
import { toast } from "../ui/toast.js";

export function pasangGantiPassword(form) {
    const $ = selector => form.querySelector(selector);
    const galat = $("#errPw") || document.querySelector("#errPw");
    form.addEventListener("submit", async event => {
        event.preventDefault();
        const tombol = form.querySelector("button[type=submit]");
        const baru = $("#pb").value;
        tampilGalat(galat, "");
        const valid = periksa([
            [$("#pl"), $("#pl").value !== ""],
            [$("#pb"), baru.length >= 8 && baru.length <= 72 && new TextEncoder().encode(baru).length <= 72],
            [$("#pu"), baru === $("#pu").value],
        ]);
        if (!valid) return;
        tombol.disabled = true;
        try {
            await api("/me/password", { method: "PUT", body: { currentPassword: $("#pl").value, newPassword: baru } });
            clearSession();
            toast("Password diganti. Silakan masuk lagi.");
            setTimeout(() => location.replace("login.html"), 1200);
        } catch (error) {
            tampilGalat(galat, pesanGantiPassword(form, error));
            tombol.disabled = false;
        }
    });
}
