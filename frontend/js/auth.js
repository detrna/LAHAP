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
        ["Kotak Masuk", "admin-kotak-masuk.html"],
        ["Pelanggan", "admin-pelanggan.html"],
        ["Langganan", "admin-langganan.html"],
        ["Pesanan", "admin-pesanan.html"],
        ["Pembayaran", "admin-pembayaran.html"],
        ["Menu", "admin-menu.html"],
        ["Jadwal", "admin-jadwal.html"],
        ["Paket", "admin-paket.html"],
        ["Bahan", "admin-bahan.html"],
        ["Promo", "admin-promo.html"],
        ["Tier", "admin-tier.html"],
        ["Notifikasi", "admin-notifikasi.html"],
        ["Pengguna", "admin-pengguna.html"],
        ["Pengaturan", "admin-pengaturan.html"],
        ["Akun", "akun.html"],
    ],
    dapur: [
        ["To-do Dapur", "dapur.html"],
        ["Stok Bahan", "dapur-stok.html"],
        ["Akun", "akun.html"],
    ],
    kurir: [
        ["To-do Kurir", "kurir.html"],
        ["Akun", "akun.html"],
    ],
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

async function rawFetch(path, { method = "GET", body, auth = true, timeout = REQUEST_TIMEOUT_MS } = {}) {
    // Baru pindah halaman: token di memori kosong tapi sesi masih ada, jadi ambil dulu.
    if (auth && !store.token && store.user) await refreshSession();
    const headers = {};
    const form = body instanceof FormData;
    if (body !== undefined && !form) headers["Content-Type"] = "application/json";
    if (auth && store.token) headers.Authorization = `Bearer ${store.token}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
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
        INVALID_PHONE_NUMBER: "Nomor HP tidak valid.",
    };
    if (messages[error.code]) return messages[error.code];
    if (error.code === "CONFLICT" && /^(phone|email) is already registered$/.test(error.message)) return "Nomor HP atau email sudah terdaftar.";
    if (error.message === "at least one active admin is required") return "Harus ada minimal satu admin aktif.";
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
    if (key === "admin") pasangLonceng(nav.querySelector('a[href="admin-kotak-masuk.html"]'));
})();

function pasangLonceng(link) {
    if (!link) return;
    const angka = document.createElement("span");
    angka.className = "badge badge--cancel";
    angka.hidden = true;
    link.append(" ", angka);
    const perbarui = async () => {
        try {
            const { meta } = await api("/me/notifications?limit=1");
            angka.textContent = meta.unreadCount;
            angka.hidden = !meta.unreadCount;
            link.setAttribute("aria-label", meta.unreadCount ? `Kotak Masuk, ${meta.unreadCount} belum dibaca` : "Kotak Masuk");
        } catch {
            angka.hidden = true;
        }
    };
    window.perbaruiLonceng = perbarui;
    perbarui();
    let stream = null;
    let ditutup = false;
    const sambung = async () => {
        if (ditutup || stream || !(await ensureToken())) return;
        stream = new EventSource(`${API_BASE}/realtime/stream?accessToken=${encodeURIComponent(store.token)}`);
        stream.addEventListener("notification", perbarui);
        stream.onerror = () => {
            stream.close();
            stream = null;
            if (ditutup) return;
            setTimeout(async () => {
                if (ditutup || document.hidden) return;
                await refreshSession();
                await sambung();
                perbarui();
            }, 5000);
        };
    };
    window.addEventListener("pagehide", () => {
        ditutup = true;
        if (stream) stream.close();
    });
    sambung();
}

// Ubah tampilan badge status (kelas + teks) di satu tempat.
function setBadge(badge, kelas, teks) {
    badge.className = `badge ${kelas}`;
    badge.textContent = teks;
}

function showIssues(form, error, fields) {
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
        const field = input.closest(".field") || input.parentElement;
        field.classList.add("is-error");
        input.setAttribute("aria-invalid", "true");
        const pesan = document.createElement("p");
        pesan.className = "error-msg";
        pesan.dataset.server = "1";
        pesan.textContent = issue.message;
        field.append(pesan);
        if (!pertama) pertama = input;
    });
    if (pertama) pertama.focus();
    return sisa;
}

function issuesText(issues) {
    return issues.map(i => (i.path ? `${i.path}: ${i.message}` : i.message)).join("; ");
}

function needsChangeReason(error) {
    return error instanceof ApiError && error.issues.some(i => i.code === "change_reason_required");
}

function renderPager(container, meta, onPage) {
    const halaman = Math.max(1, Math.ceil(meta.total / meta.limit));
    container.hidden = halaman <= 1;
    const tombol = (label, ke, aktif) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "btn btn-ghost btn-sm";
        b.textContent = label;
        b.disabled = !aktif;
        b.onclick = () => onPage(ke);
        return b;
    };
    const info = document.createElement("span");
    info.className = "t-small t-muted";
    info.textContent = `Halaman ${meta.page} dari ${halaman}`;
    container.className = "row-between";
    container.replaceChildren(tombol("Sebelumnya", meta.page - 1, meta.page > 1), info, tombol("Berikutnya", meta.page + 1, meta.page < halaman));
}

function askChangeReason(container, onSubmit) {
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
