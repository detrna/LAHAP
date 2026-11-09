import { keLogin } from "../core/api.js";
import { HOME, ROLE_KEY, currentUser } from "../core/session.js";
import { pasangAdmin } from "./admin-shell.js";
import { pasangNav } from "./nav.js";

function bukaHalaman() {
    const user = currentUser();
    const key = user ? ROLE_KEY[user.role] : null;
    const roles = document.body.getAttribute("data-roles");
    if (roles) {
        if (!user || !key) {
            keLogin();
            return false;
        }
        if (!roles.split(",").includes(key)) {
            const tujuan = HOME[key];
            const sekarang = location.pathname.split("/").pop() || "index.html";
            location.replace(tujuan && tujuan !== sekarang ? tujuan : "login.html");
            return false;
        }
    }

    const main = document.querySelector("main");
    if (main) {
        if (!main.id) main.id = "konten";
        main.tabIndex = -1;
        main.style.outline = "none";
        const skip = document.createElement("a");
        skip.className = "skip-link";
        skip.href = `#${main.id}`;
        skip.textContent = "Lewati ke konten";
        document.body.prepend(skip);
    }

    const nav = document.querySelector(".nav");
    if (!nav) return true;
    const page = location.pathname.split("/").pop().toLowerCase() || "index.html";
    if (key === "admin") pasangAdmin(nav, page);
    else pasangNav(nav, key, page, user);
    return true;
}

if (!bukaHalaman()) await new Promise(() => {});
