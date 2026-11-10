import { logout } from "../core/session.js";
import { pasangLonceng } from "./bell.js";

const ADMIN_MENU = [
    { group: "", links: [["Dashboard", "admin.html", "dashboard"]] },
    {
        group: "Operasional",
        links: [
            ["Pesanan", "admin-pesanan.html", "pesanan"],
            ["Langganan", "admin-langganan.html", "langganan"],
            ["Pembayaran", "admin-pembayaran.html", "pembayaran"],
        ],
    },
    {
        group: "Katalog",
        links: [
            ["Paket", "admin-paket.html", "paket"],
            ["Menu", "admin-menu.html", "menu"],
            ["Jadwal", "admin-jadwal.html", "jadwal"],
            ["Bahan", "admin-bahan.html", "bahan"],
        ],
    },
    {
        group: "Pelanggan",
        links: [
            ["Pelanggan", "admin-pelanggan.html", "pelanggan"],
            ["Promo", "admin-promo.html", "promo"],
            ["Tier", "admin-tier.html", "tier"],
            ["Kirim Notifikasi", "admin-notifikasi.html", "kirim"],
        ],
    },
    {
        group: "Sistem",
        links: [
            ["Pengguna", "admin-pengguna.html", "pengguna"],
            ["Pengaturan", "admin-pengaturan.html", "pengaturan"],
        ],
    },
];
const DAPUR_MENU = [
    {
        group: "",
        links: [
            ["To-do Dapur", "dapur.html", "pesanan"],
            ["Stok Bahan", "dapur-stok.html", "bahan"],
            ["Hitung Stok AI", "dapur-foto.html", "foto"],
        ],
    },
];
const ADMIN_ICONS = {
    foto: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/><circle cx="12" cy="13" r="3"/>',
    dashboard:
        '<rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>',
    pesanan:
        '<rect width="8" height="4" x="8" y="2" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4M12 16h4M8 11h.01M8 16h.01"/>',
    langganan:
        '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
    pembayaran: '<rect width="20" height="14" x="2" y="5" rx="2"/><path d="M2 10h20"/>',
    paket: '<path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"/><path d="M12 22V12"/><path d="m3.3 7 8.7 5 8.7-5"/>',
    menu: '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>',
    jadwal: '<path d="M8 2v4M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"/>',
    bahan: '<path d="m15 11-1 9"/><path d="m19 11-4-7"/><path d="M2 11h20"/><path d="m3.5 11 1.6 7.4a2 2 0 0 0 2 1.6h9.8a2 2 0 0 0 2-1.6l1.7-7.4"/><path d="m5 11 4-7"/><path d="m9 11 1 9"/>',
    pelanggan:
        '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    promo: '<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/>',
    tier: '<path d="m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526"/><circle cx="12" cy="8" r="6"/>',
    kirim: '<path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/><path d="m21.854 2.147-10.94 10.939"/>',
    pengguna: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    pengaturan: '<path d="M10 5H3M12 19H3M14 3v4M16 17v4M21 12h-9M21 19h-5M21 5h-7M8 10v4M8 12H3"/>',
};
const iconSvg = nama =>
    `<svg class="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ADMIN_ICONS[nama] || ""}</svg>`;
const BELL_ICON =
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>';

export function pasangAdmin(nav, page) {
    pasangSidebar(nav, page, { menu: ADMIN_MENU, label: "admin", home: "admin.html", lonceng: "admin" });
}

export function pasangDapur(nav, page) {
    pasangSidebar(nav, page, { menu: DAPUR_MENU, label: "dapur", home: "dapur.html", lonceng: "dapur" });
}

function pasangSidebar(nav, page, { menu, label: peran, home, lonceng }) {
    const ada = menu.flatMap(g => g.links).find(([, href]) => href === page);
    const judul = ada ? ada[0] : page === "notifikasi.html" ? "Kotak Masuk" : "";
    const lanjut = (label, href) => `<a href="${href}"${href === page ? ' aria-current="page"' : ""}>${label}</a>`;
    const itemSidebar = ([label, href, icon]) =>
        `<a href="${href}"${href === page ? ' aria-current="page"' : ""}>${iconSvg(icon)}<span>${label}</span></a>`;

    const sidebar = document.createElement("aside");
    sidebar.className = "sidebar";
    sidebar.id = `sidebar-${peran}`;
    sidebar.innerHTML =
        `<nav aria-label="Menu ${peran}">` +
        menu.map(
            g =>
                `<div class="sidebar-group">${g.group ? `<p class="label">${g.group}</p>` : ""}${g.links.map(itemSidebar).join("")}</div>`,
        ).join("") +
        "</nav>";
    const backdrop = document.createElement("div");
    backdrop.className = "sidebar-backdrop";
    backdrop.hidden = true;

    const container = nav.parentElement;
    const tombol = document.createElement("button");
    tombol.type = "button";
    tombol.className = "sidebar-toggle";
    tombol.setAttribute("aria-label", `Buka menu ${peran}`);
    tombol.setAttribute("aria-controls", sidebar.id);
    tombol.setAttribute("aria-expanded", "false");
    tombol.innerHTML =
        '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>';
    const brand = container.querySelector(".brand");
    brand.href = home;
    const kiri = document.createElement("div");
    kiri.className = "header-left";
    kiri.append(tombol, brand);
    if (judul) {
        const t = document.createElement("span");
        t.className = "header-title";
        t.textContent = judul;
        kiri.append(t);
    }
    container.prepend(kiri);

    nav.setAttribute("aria-label", "Menu akun");
    nav.innerHTML =
        `<a href="notifikasi.html" id="lonceng"${page === "notifikasi.html" ? ' aria-current="page"' : ""} aria-label="Kotak Masuk">${BELL_ICON}</a>` +
        lanjut("Akun", "akun.html") +
        '<a href="#" id="keluar">Keluar</a>';
    document.body.append(sidebar, backdrop);
    document.body.classList.add("has-sidebar");

    const buka = terbuka => {
        sidebar.classList.toggle("is-open", terbuka);
        backdrop.hidden = !terbuka;
        tombol.setAttribute("aria-expanded", String(terbuka));
        tombol.setAttribute("aria-label", terbuka ? `Tutup menu ${peran}` : `Buka menu ${peran}`);
    };
    tombol.addEventListener("click", () => buka(!sidebar.classList.contains("is-open")));
    backdrop.addEventListener("click", () => buka(false));
    sidebar.addEventListener("click", event => {
        if (event.target.closest("a")) buka(false);
    });
    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && sidebar.classList.contains("is-open")) {
            buka(false);
            tombol.focus();
        }
    });
    document.getElementById("keluar").addEventListener("click", event => {
        event.preventDefault();
        logout();
    });
    pasangLonceng(document.getElementById("lonceng"), lonceng);
}
