import { logout } from "../core/session.js";
import { pasangLonceng } from "./bell.js";

const MENU = {
    tamu: [
        ["Paket", "index.html"],
        ["Tier Pelanggan", "tier.html"],
    ],
    pelanggan: [
        ["Paket", "index.html"],
        ["Beranda", "langganan.html"],
        ["Tier Pelanggan", "tier.html"],
        ["Notifikasi", "notifikasi.html"],
        ["Profil", "profil.html"],
    ],
    admin: [],
    dapur: [],
    kurir: [
        ["To-do Kurir", "kurir.html"],
        ["Kotak Masuk", "notifikasi.html"],
        ["Akun", "akun.html"],
    ],
};

export function pasangNav(nav, key, page, user) {
    nav.setAttribute("aria-label", "Menu utama");
    const links = MENU[key || "tamu"].map(
        ([label, href]) => `<a href="${href}"${href === page ? ' aria-current="page"' : ""}>${label}</a>`,
    );
    links.push(user ? '<a href="#" id="keluar">Keluar</a>' : '<a href="landing.html?masuk=1" id="masuk-nav">Masuk</a>');
    nav.innerHTML = links.join("");
    const masuk = document.getElementById("masuk-nav");
    if (masuk) {
        masuk.addEventListener("click", async event => {
            event.preventDefault();
            const { bukaMasuk } = await import("../features/auth-modal.js");
            bukaMasuk({ pemicu: masuk });
        });
    }
    const keluar = document.getElementById("keluar");
    if (keluar) {
        keluar.addEventListener("click", event => {
            event.preventDefault();
            logout();
        });
    }
    if (key === "pelanggan" || key === "kurir") pasangLonceng(nav.querySelector('a[href="notifikasi.html"]'), key);
}