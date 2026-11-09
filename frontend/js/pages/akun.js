import "../layout/boot.js";
import { currentUser, homeFor } from "../core/session.js";
import { pasangGantiPassword } from "../features/akun.js";
import { $ } from "../ui/dom.js";

const PERAN = { ADMIN: "Admin", KITCHEN: "Dapur", COURIER: "Kurir" };
const user = currentUser();
if (user) {
    $("#siapa").textContent = `${user.name} · ${PERAN[user.role] || user.role}`;
    $("#beranda").href = homeFor(user);
}
pasangGantiPassword($("#fPw"));
