import { logout } from "../core/session.js";
import { pasangLonceng } from "./bell.js";

const MENU = {
    tamu: [
        ["Paket", "index.html"],
        ["Tier Pelanggan", "tier.html"],
    ],
    pelanggan: [
        ["Paket", "index.html"],
        ["Langganan Saya", "langganan.html"],
        ["Tier Pelanggan", "tier.html"],
        ["Notifikasi", "notifikasi.html"],
        ["Profil", "profil.html"],
    ],
    admin: [],
    dapur: [
        ["To-do Dapur", "dapur.html"],
        ["Stok Bahan", "dapur-stok.html"],
        ["Hitung Stok AI", "dapur-foto.html"],
        ["Kotak Masuk", "notifikasi.html"],
        ["Akun", "akun.html"],
    ],
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
    links.push(user ? '<a href="#" id="keluar">Keluar</a>' : '<a href="login.html">Masuk</a>');
    nav.innerHTML = links.join("");
    const keluar = document.getElementById("keluar");
    if (keluar) {
        keluar.addEventListener("click", event => {
            event.preventDefault();
            logout();
        });
    }
    if (key === "pelanggan" || key === "kurir" || key === "dapur") pasangLonceng(nav.querySelector('a[href="notifikasi.html"]'), key);
}