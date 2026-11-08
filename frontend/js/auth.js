const API_BASE = "https://lahap.bccdev.id/api";

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
    constructor(status, body) {
        const error = (body && body.error) || {};
        super(error.message || "request failed");
        this.status = status;
        this.code = error.code || "UNKNOWN";
        this.issues = error.issues || [];
    }
}

const store = {
    get token() {
        return sessionStorage.getItem("lahap_token");
    },
    set token(value) {
        if (value) sessionStorage.setItem("lahap_token", value);
        else sessionStorage.removeItem("lahap_token");
    },
    get user() {
        try {
            return JSON.parse(sessionStorage.getItem("lahap_user"));
        } catch {
            return null;
        }
    },
    set user(value) {
        if (value) sessionStorage.setItem("lahap_user", JSON.stringify(value));
        else sessionStorage.removeItem("lahap_user");
    },
};

async function rawFetch(path, { method = "GET", body, auth = true } = {}) {
    const headers = {};
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (auth && store.token) headers.Authorization = `Bearer ${store.token}`;
    const response = await fetch(API_BASE + path, {
        method,
        headers,
        credentials: "include",
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    const json = await response.json().catch(() => null);
    return { response, json };
}

function saveSession(session) {
    store.token = session.accessToken;
    store.user = session.user;
}

async function refreshSession() {
    const { response, json } = await rawFetch("/auth/refresh", { method: "POST", body: {}, auth: false });
    if (!response.ok) return false;
    saveSession(json.data);
    return true;
}

async function api(path, options = {}) {
    let { response, json } = await rawFetch(path, options);
    if (response.status === 401 && options.auth !== false && (await refreshSession())) {
        ({ response, json } = await rawFetch(path, options));
    }
    if (!response.ok) throw new ApiError(response.status, json);
    return json;
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
        store.token = null;
    }
    store.token = null;
    store.user = null;
    location.href = "login.html";
}

function currentUser() {
    return store.user;
}

function homeFor(user) {
    return HOME[ROLE_KEY[user.role]];
}

function errorMessage(error) {
    if (!(error instanceof ApiError)) return "Tidak bisa terhubung ke server. Periksa koneksi atau alamat API.";
    const messages = {
        INVALID_CREDENTIALS: "Nomor HP atau email, atau password salah.",
        TOO_MANY_REQUESTS: "Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.",
        CONFLICT: "Nomor HP atau email sudah terdaftar.",
        INVALID_PHONE_NUMBER: "Nomor HP tidak valid.",
    };
    return messages[error.code] || error.message;
}

(function () {
    const user = currentUser();
    const key = user ? ROLE_KEY[user.role] : null;
    const roles = document.body.getAttribute("data-roles");
    if (roles) {
        if (!user) {
            location.href = "login.html";
            return;
        }
        if (!roles.split(",").includes(key)) {
            location.href = HOME[key];
            return;
        }
    }
    const nav = document.querySelector(".nav");
    if (!nav) return;
    const page = location.pathname.split("/").pop().toLowerCase();
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