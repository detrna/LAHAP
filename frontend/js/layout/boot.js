import { keLogin } from "../core/api.js";
import { IS_LOCAL } from "../core/config.js";
import { HOME, ROLE_KEY, currentUser } from "../core/session.js";
import { pasangAdmin, pasangDapur } from "./admin-shell.js";
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
            location.replace(tujuan && tujuan !== sekarang ? tujuan : "landing.html");
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

    const brand = document.querySelector(".brand");
    if (brand) {
        const logo = document.createElement("img");
        logo.className = "brand-logo";
        logo.src = "img/logo-lahap.png";
        logo.alt = "LAHAP";
        logo.onerror = () => logo.replaceWith(document.createTextNode("LAHAP"));
        brand.replaceChildren(logo);
    }
    if (!document.querySelector('link[rel="icon"]')) {
        const ikon = document.createElement("link");
        ikon.rel = "icon";
        ikon.type = "image/png";
        ikon.href = "img/logo-lahap.png";
        document.head.append(ikon);
    }

    const nav = document.querySelector(".nav");
    if (!nav) return true;
    const page = location.pathname.split("/").pop().toLowerCase() || "index.html";
    if (key === "admin") pasangAdmin(nav, page);
    else if (key === "dapur") pasangDapur(nav, page);
    else pasangNav(nav, key, page, user);
    return true;
}

if (!bukaHalaman()) await new Promise(() => {});

if (IS_LOCAL) import("../dev/agentation.js").catch(error => console.warn("agentation tidak dapat dimuat", error));
