const API_BASE = "https://lahap.bccdev.id/api";
const REQUEST_TIMEOUT_MS = 20000;

const ROLE_KEY = { CUSTOMER: "pelanggan", ADMIN: "admin", KITCHEN: "dapur", COURIER: "kurir" };
const HOME = { pelanggan: "index.html", admin: "admin.html", dapur: "dapur.html", kurir: "kurir.html" };
const MENU = {
    tamu: [["Paket", "index.html"]],
    pelanggan: [
        ["Paket", "index.html"],
        ["Langganan Saya", "langganan.html"],
        ["Notifikasi", "notifikasi.html"],
        ["Profil", "profil.html"],
    ],
    admin: [
        ["Dashboard", "admin.html"],
        ["Pelanggan", "admin-pelanggan.html"],
        ["Menu", "admin-menu.html"],
        ["Paket", "admin-paket.html"],
        ["Promo", "admin-promo.html"],
        ["Tier", "admin-tier.html"],
        ["Pembayaran", "admin-pembayaran.html"],
        ["Bahan", "admin-bahan.html"],
        ["Pesanan", "admin-pesanan.html"],
        ["Notifikasi", "admin-notifikasi.html"],
        ["Pengguna", "admin-pengguna.html"],
    ],
    dapur: [
        ["To-do Dapur", "dapur.html"],
        ["Stok Bahan", "dapur-stok.html"],
    ],
    kurir: [["To-do Kurir", "kurir.html"]],
};

class ApiError extends Error {
    constructor(status, body, retryAfter) {
        const error = (body && body.error) || {};
        super(error.message || "request failed");
        this.status = status;
        this.retryAfter = Number(retryAfter) > 0 ? Number(retryAfter) : null; // detik, dari header Retry-After
        this.code = error.code || "UNKNOWN";
        this.issues = error.issues || [];
    }
}

// Access token hanya disimpan di memori. Setelah pindah halaman, token diambil lagi lewat
// /auth/refresh (cookie httpOnly). Data pengguna (tanpa token) boleh di sessionStorage.
// sessionStorage bisa melempar error (mode privat, storage diblokir), jadi semua akses dibungkus.
let tokenMemori = null;
try {
    sessionStorage.removeItem("lahap_token"); // sisa versi lama yang menyimpan token di storage
} catch {
    /* abaikan */
}
const store = {
    get token() {
        return tokenMemori;
    },
    set token(value) {
        tokenMemori = value || null;
    },
    get user() {
        try {
            return JSON.parse(sessionStorage.getItem("lahap_user"));
        } catch {
            return null;
        }
    },
    set user(value) {
        try {
            if (value) sessionStorage.setItem("lahap_user", JSON.stringify(value));
            else sessionStorage.removeItem("lahap_user");
        } catch {
            /* abaikan */
        }
    },
};

async function rawFetch(path, { method = "GET", body, auth = true } = {}) {
    // Baru pindah halaman: token di memori kosong tapi sesi masih ada, jadi ambil dulu.
    if (auth && !store.token && store.user) await refreshSession();
    const headers = {};
    const form = body instanceof FormData;
    if (body !== undefined && !form) headers["Content-Type"] = "application/json";
    if (auth && store.token) headers.Authorization = `Bearer ${store.token}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
        const response = await fetch(API_BASE + path, {
            method,
            headers,
            credentials: "include",
            signal: controller.signal,
            body: body === undefined || form ? body : JSON.stringify(body),
        });
        const json = await response.json().catch(() => null);
        return { response, json };
    } finally {
        clearTimeout(timer);
    }
}

function saveSession(session) {
    store.token = session.accessToken;
    store.user = session.user;
}

function clearSession() {
    store.token = null;
    store.user = null;
}

// Beberapa request paralel yang sama-sama 401 harus berbagi satu refresh,
// karena refresh token biasanya dirotasi dan pemakaian kedua akan gagal.
let refreshing = null;
function refreshSession() {
    if (!refreshing) {
        refreshing = (async () => {
            try {
                const { response, json } = await rawFetch("/auth/refresh", { method: "POST", body: {}, auth: false });
                if (!response.ok) return false;
                saveSession(json.data);
                return true;
            } catch {
                return false;
            } finally {
                setTimeout(() => (refreshing = null), 0);
            }
        })();
    }
    return refreshing;
}

// Arahkan ke login dan ingat halaman sekarang supaya bisa kembali setelah masuk.
function keLogin() {
    const sekarang = location.pathname.split("/").pop() + location.search;
    location.replace(`login.html?redirect=${encodeURIComponent(sekarang)}`);
}

// Memastikan access token tersedia (mis. sebelum membuka EventSource).
async function ensureToken() {
    if (store.token) return true;
    if (!store.user) return false;
    return refreshSession();
}

async function api(path, options = {}) {
    let { response, json } = await rawFetch(path, options);
    if (response.status === 401 && options.auth !== false) {
        const sudahMasuk = Boolean(store.token || store.user);
        if (await refreshSession()) {
            ({ response, json } = await rawFetch(path, options));
        } else if (sudahMasuk) {
            clearSession();
            keLogin();
            throw new ApiError(401, json);
        }
    }
    if (!response.ok) throw new ApiError(response.status, json, response.headers.get("Retry-After"));
    return json;
}

async function upload(folder, file) {
    const body = new FormData();
    body.append("folder", folder);
    body.append("file", file);
    const { data } = await api("/files", { method: "POST", body });
    return data;
}

async function login(identifier, password) {
    const { data } = await api("/auth/login", { method: "POST", body: { identifier, password }, auth: false });
    saveSession(data);
    return data.user;
}

async function register(fields) {
    const { data } = await api("/auth/register", { method: "POST", body: fields, auth: false });
    saveSession(data);
    return data.user;
}

async function logout() {
    try {
        await api("/auth/logout", { method: "POST", body: {}, auth: false });
    } catch {
        /* tetap keluar di sisi browser */
    }
    clearSession();
    location.replace("login.html");
}

function currentUser() {
    return store.user;
}

function homeFor(user) {
    return (user && HOME[ROLE_KEY[user.role]]) || "index.html";
}

function errorMessage(error) {
    if (!(error instanceof ApiError)) {
        if (error && error.name === "AbortError") return "Server terlalu lama merespons. Coba lagi sebentar.";
        return "Tidak bisa terhubung ke server. Periksa koneksi atau alamat API.";
    }
    if (error.code === "TOO_MANY_REQUESTS" || error.status === 429) {
        const tunggu = error.retryAfter;
        if (!tunggu) return "Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.";
        return tunggu >= 90
            ? `Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil(tunggu / 60)} menit.`
            : `Terlalu banyak percobaan. Coba lagi dalam ${tunggu} detik.`;
    }
    const messages = {
        INVALID_CREDENTIALS: "Nomor HP atau email, atau password salah.",
        CONFLICT: "Nomor HP atau email sudah terdaftar.",
        INVALID_PHONE_NUMBER: "Nomor HP tidak valid.",
    };
    if (messages[error.code]) return messages[error.code];
    if (error.status >= 500) return "Server sedang bermasalah. Coba lagi beberapa saat lagi.";
    if (error.status === 403) return "Kamu tidak punya akses untuk tindakan ini.";
    return error.message === "request failed" ? "Permintaan gagal. Coba lagi." : error.message;
}

// Notifikasi singkat yang tidak memblokir layar (pengganti alert()).
function toast(message, type = "info") {
    let region = document.querySelector(".toast-region");
    if (!region) {
        region = document.createElement("div");
        region.className = "toast-region";
        region.setAttribute("role", "status");
        region.setAttribute("aria-live", "polite");
        document.body.append(region);
    }
    const node = document.createElement("div");
    node.className = `toast${type === "error" ? " toast--error" : ""}`;
    node.textContent = message;
    region.append(node);
    setTimeout(() => node.remove(), 3500);
}

(function () {
    const user = currentUser();
    const key = user ? ROLE_KEY[user.role] : null;
    const roles = document.body.getAttribute("data-roles");
    if (roles) {
        if (!user || !key) {
            keLogin();
            return;
        }
        if (!roles.split(",").includes(key)) {
            // Jangan arahkan ke halaman yang sama (bisa loop tanpa henti).
            const tujuan = HOME[key];
            const sekarang = location.pathname.split("/").pop() || "index.html";
            location.replace(tujuan && tujuan !== sekarang ? tujuan : "login.html");
            return;
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
    if (!nav) return;
    nav.setAttribute("aria-label", "Menu utama");
    const page = location.pathname.split("/").pop().toLowerCase() || "index.html";
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
})();

// Ubah tampilan badge status (kelas + teks) di satu tempat.
function setBadge(badge, kelas, teks) {
    badge.className = `badge ${kelas}`;
    badge.textContent = teks;
}