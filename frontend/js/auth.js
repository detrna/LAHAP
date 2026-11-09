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
        ["Kotak Masuk", "notifikasi.html"],
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
        ["Kirim Notifikasi", "admin-notifikasi.html"],
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
        ["Kotak Masuk", "notifikasi.html"],
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
    location.replace("landing.html");
}

function currentUser() {
    return store.user;
}

function homeFor(user) {
    return (user && HOME[ROLE_KEY[user.role]]) || "index.html";
}

const MUAT_ULANG = "Muat ulang halaman lalu coba lagi.";
const PESAN_KODE = {
    INVALID_CREDENTIALS: "Nomor HP atau email, atau password salah.",
    INVALID_PHONE_NUMBER: "Nomor HP tidak valid.",
    UNKNOWN_ALLERGY: "Ada alergi yang tidak dikenal. " + MUAT_ULANG,
    UNKNOWN_INGREDIENT: "Ada bahan yang sudah tidak ada. " + MUAT_ULANG,
    UNKNOWN_MENU: "Ada menu yang sudah tidak ada. " + MUAT_ULANG,
    PAYLOAD_TOO_LARGE: "Foto terlalu besar.",
    UNSUPPORTED_MEDIA_TYPE: "Gunakan foto JPEG, PNG, atau WebP.",
    INVALID_STOCK_IMAGE: "Foto tidak bisa dibaca. Coba foto lain.",
    LOW_CONFIDENCE: "Isi wadah kurang jelas. Foto lebih dekat dengan cahaya cukup.",
    CONTAINER_NOT_VISIBLE: "Wadah bahan ini tidak terlihat di foto.",
    STOCK_LEVEL_ESTIMATOR_PROVIDER_ERROR: "Perkiraan gagal. Coba lagi.",
    STOCK_LEVEL_ESTIMATION_FAILED: "Perkiraan gagal. Coba lagi.",
    INVALID_RECEIPT_IMAGE: "Foto ini tidak terbaca sebagai struk. Coba foto struk yang lebih jelas.",
    LOW_CONFIDENCE_RECEIPT: "Struk kurang jelas untuk dibaca. Foto ulang dengan cahaya cukup dan tidak miring.",
    NO_RECEIPT_ITEMS_FOUND: "Tidak ada barang di struk yang cocok dengan daftar bahan.",
    RECEIPT_EXTRACTOR_PROVIDER_ERROR: "Layanan pembaca struk sedang bermasalah. Coba lagi beberapa saat lagi.",
    RECEIPT_EXTRACTION_FAILED: "Struk gagal dibaca. Coba lagi.",
    ORDER_NOT_FOUND: "Slot pesanan tidak ditemukan. " + MUAT_ULANG,
    SUBSCRIPTION_NOT_FOUND: "Pesanan tidak ditemukan. " + MUAT_ULANG,
    PAYMENT_NOT_FOUND: "Pembayaran tidak ditemukan. " + MUAT_ULANG,
    DELIVERY_METHOD_CHANGE_NOT_FOUND: "Perubahan metode tidak ditemukan. " + MUAT_ULANG,
    INGREDIENT_NOT_FOUND: "Bahan tidak ditemukan. " + MUAT_ULANG,
    ALLERGY_NOT_FOUND: "Alergi tidak ditemukan. " + MUAT_ULANG,
    PACKAGE_NOT_FOUND: "Paket tidak ditemukan. " + MUAT_ULANG,
    MENU_NOT_FOUND: "Menu tidak ditemukan. " + MUAT_ULANG,
    MENU_SCHEDULE_NOT_FOUND: "Jadwal tidak ditemukan. " + MUAT_ULANG,
    TIER_NOT_FOUND: "Tier tidak ditemukan. " + MUAT_ULANG,
    PROMO_CODE_NOT_FOUND: "Kode promo tidak ditemukan. " + MUAT_ULANG,
    MESSAGE_TEMPLATE_NOT_FOUND: "Template tidak ditemukan. " + MUAT_ULANG,
    NOTIFICATION_NOT_FOUND: "Notifikasi tidak ditemukan. " + MUAT_ULANG,
    ANNOUNCEMENT_NOT_FOUND: "Pengumuman tidak ditemukan. " + MUAT_ULANG,
    USER_NOT_FOUND: "Pengguna tidak ditemukan. " + MUAT_ULANG,
    TARGET_NOT_FOUND: "Penerima tidak ditemukan atau akunnya tidak aktif.",
    BUSINESS_NOT_CONFIGURED: "Pengaturan usaha belum diisi. Hubungi admin.",
    SERVICE_UNAVAILABLE: "Server sedang sibuk. Coba lagi sebentar.",
};
const PESAN_SERVER = [
    ["cut-off has passed", "Batas waktu sudah lewat (pukul 23.59 sehari sebelum hari layanan pertama)."],
    ["current password is incorrect", "Password lama salah."],
    ["at least one active admin is required", "Harus ada minimal satu admin aktif."],
    ["slot changed, try again", "Data baru saja berubah. " + MUAT_ULANG],
    ["slots changed, try again", "Data baru saja berubah. " + MUAT_ULANG],
    ["subscription changed, try again", "Data baru saja berubah. " + MUAT_ULANG],
    ["no slots to order", "Tidak ada jadwal yang bisa dipesan pada pilihan ini."],
    ["slot is not available", "Ada jadwal yang sudah tidak tersedia. Pilih ulang jadwalnya."],
    ["package is not available", "Paket ini sedang tidak dijual."],
    ["package does not offer this period", "Paket ini tidak menyediakan periode tersebut."],
    [/^package does not offer delivery time /, "Paket ini tidak menyediakan waktu makan tersebut."],
    ["delivery needs a delivery point", "Pilih titik antar di peta."],
    ["delivery is not available for this address", "Alamat ini di luar jangkauan antar. Pilih ambil sendiri."],
    ["online orders cannot be paid in cash", "Pesanan online tidak bisa dibayar tunai."],
    ["cash orders are paid at the cashier", "Pesanan tunai dibayar di kasir."],
    ["cash payments are paid at the cashier", "Pembayaran tunai dibayar di kasir."],
    ["promo code has already been used", "Kamu sudah pernah memakai kode promo ini."],
    ["promo code quota is exhausted", "Kuota kode promo sudah habis."],
    ["promo code no longer exists", "Kode promo sudah tidak ada."],
    ["tier no longer exists", "Tier sudah tidak ada. " + MUAT_ULANG],
    ["payment session has expired", "Waktu pembayaran sudah habis."],
    ["payment has not been paid", "Pembayaran ini belum lunas."],
    ["payment is not a pending cash payment", "Pembayaran ini bukan pembayaran tunai yang menunggu."],
    ["subscription is not waiting for payment", "Pesanan ini tidak sedang menunggu pembayaran."],
    ["subscription is not paid", "Pesanan ini belum lunas."],
    ["subscription cannot be cancelled", "Pesanan ini sudah tidak bisa dibatalkan."],
    ["subscription does not need a refund", "Pesanan ini tidak perlu refund."],
    ["slot is not skippable", "Slot ini sudah tidak bisa dilewati karena makanannya sudah disiapkan."],
    ["slot is past food preparation", "Makanan sudah ditandai siap, menu tidak bisa diganti lagi."],
    ["schedule has no alternative menu", "Jadwal ini belum punya menu alternatif."],
    ["schedule has no primary menu", "Jadwal ini belum punya menu utama."],
    ["slot is not out for delivery", "Slot ini tidak sedang diantar."],
    ["slot is not ready for pick-up", "Slot ini belum siap diambil."],
    [/^slot cannot move from /, "Status slot tidak bisa diubah ke status itu."],
    ["no slot can switch method", "Tidak ada slot yang bisa diubah metodenya."],
    ["another delivery method change is waiting for payment", "Masih ada perubahan metode yang menunggu pembayaran."],
    ["delivery method change can no longer be applied", "Perubahan metode ini sudah tidak bisa diterapkan."],
    ["delivery method change does not need a refund", "Perubahan metode ini tidak perlu refund."],
    ["delivery method change is not waiting for payment", "Perubahan metode ini tidak sedang menunggu pembayaran."],
    ["courier is not an active courier", "Kurir yang dipilih tidak aktif."],
    ["cook is not an active kitchen staff", "Koki yang dipilih bukan staf dapur aktif."],
    ["customer account is inactive", "Akun pelanggan ini tidak aktif."],
    ["customer is not churned", "Pelanggan ini belum termasuk churn."],
    ["template needs a promo code", "Template ini memakai {kode_promo}, jadi isi kode promonya."],
    ["meal time is still used by schedules with orders", "Waktu makan ini masih dipakai jadwal yang sudah dipesan."],
    ["a schedule already exists for this package, date and meal time", "Jadwal untuk paket, tanggal, dan waktu makan ini sudah ada."],
    ["schedule has active orders", "Jadwal ini sudah punya pesanan."],
    ["menu is used by schedules", "Menu ini masih dipakai di jadwal."],
    ["package is used by subscriptions, deactivate it instead", "Paket ini sudah pernah dipesan. Nonaktifkan saja."],
    ["promo code is already used", "Kode promo ini sudah dipakai kode lain."],
    ["promo code is used by orders that are waiting for payment", "Kode promo masih dipakai pesanan yang menunggu pembayaran."],
    ["message template name is already used", "Nama template sudah dipakai."],
    ["tier name is already used", "Nama tier sudah dipakai."],
    ["required subscription days is already used by another tier", "Jumlah hari ini sudah dipakai tier lain."],
    [/^allergy already exists: "(.*)"$/, m => `Alergi "${m[1]}" sudah ada.`],
    [/^ingredient already exists: "(.*)"$/, m => `Bahan "${m[1]}" sudah ada.`],
    [/^ingredient is used by menus: (.+)$/, m => `Bahan ini masih dipakai menu: ${m[1]}.`],
    ["ingredient is used by menus, remove it from them first", "Bahan ini masih dipakai menu. Hapus dulu dari resepnya."],
    ["too many open event streams, try again later", "Server sedang sibuk. Coba lagi sebentar."],
];

function pesanServer(message) {
    for (const [cocok, teks] of PESAN_SERVER) {
        if (typeof cocok === "string") {
            if (cocok === message) return teks;
            continue;
        }
        const hasil = cocok.exec(message);
        if (hasil) return typeof teks === "function" ? teks(hasil) : teks;
    }
    return null;
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
    if (PESAN_KODE[error.code]) return PESAN_KODE[error.code];
    const terjemahan = pesanServer(error.message);
    if (terjemahan) return terjemahan;
    if (error.code === "CONFLICT" && /^(phone|email) is already registered$/.test(error.message)) return "Nomor HP atau email sudah terdaftar.";
    if (error.code === "VALIDATION_ERROR" && error.issues.length) return issuesText(error.issues);
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

const REALTIME_EVENTS = ["slot.status", "slot.obstacle", "slot.menu", "notification", "announcement"];
const REALTIME_MIN_DELAY_MS = 5000;
const REALTIME_MAX_DELAY_MS = 60000;
const realtime = {
    handlers: new Map(),
    reconnects: [],
    stream: null,
    opening: false,
    closed: false,
    dropped: false,
    delay: REALTIME_MIN_DELAY_MS,
    timer: null,
};

function tokenSegeraHabis() {
    try {
        const payload = store.token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
        return JSON.parse(atob(payload)).exp * 1000 - Date.now() < 30000;
    } catch {
        return true;
    }
}

function onRealtime(event, handler) {
    if (!realtime.handlers.has(event)) realtime.handlers.set(event, []);
    realtime.handlers.get(event).push(handler);
    bukaRealtime();
}

function onRealtimeReconnect(handler) {
    realtime.reconnects.push(handler);
}

function jadwalkanRealtime() {
    clearTimeout(realtime.timer);
    if (realtime.closed || document.hidden) return;
    realtime.timer = setTimeout(bukaRealtime, realtime.delay);
    realtime.delay = Math.min(realtime.delay * 2, REALTIME_MAX_DELAY_MS);
}

async function bukaRealtime() {
    if (realtime.stream || realtime.opening || realtime.closed || document.hidden || !realtime.handlers.size) return;
    realtime.opening = true;
    try {
        if (!(await ensureToken())) return;
        if (tokenSegeraHabis() && !(await refreshSession())) return jadwalkanRealtime();
        const stream = new EventSource(`${API_BASE}/realtime/stream?accessToken=${encodeURIComponent(store.token)}`);
        realtime.stream = stream;
        REALTIME_EVENTS.forEach(nama =>
            stream.addEventListener(nama, event => {
                let data = null;
                try {
                    data = JSON.parse(event.data);
                } catch {
                    data = null;
                }
                (realtime.handlers.get(nama) || []).forEach(handler => handler(data));
            }),
        );
        stream.onopen = () => {
            realtime.delay = REALTIME_MIN_DELAY_MS;
            if (!realtime.dropped) return;
            realtime.dropped = false;
            realtime.reconnects.forEach(handler => handler());
        };
        stream.onerror = () => {
            stream.close();
            if (realtime.stream === stream) realtime.stream = null;
            realtime.dropped = true;
            jadwalkanRealtime();
        };
    } finally {
        realtime.opening = false;
    }
}

document.addEventListener("visibilitychange", () => {
    if (document.hidden || realtime.stream) return;
    clearTimeout(realtime.timer);
    bukaRealtime();
});
window.addEventListener("pagehide", () => {
    realtime.closed = true;
    clearTimeout(realtime.timer);
    if (realtime.stream) realtime.stream.close();
    realtime.stream = null;
});
window.addEventListener("pageshow", event => {
    if (!event.persisted) return;
    realtime.closed = false;
    realtime.dropped = true;
    bukaRealtime();
});

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
    if (key === "pelanggan" || key === "admin" || key === "kurir") pasangLonceng(nav.querySelector('a[href="notifikasi.html"]'), key);
})();

function pasangLonceng(link, key) {
    if (!link) return;
    const angka = document.createElement("span");
    angka.className = "badge badge--cancel";
    angka.hidden = true;
    link.append(" ", angka);
    const label = link.firstChild.textContent;
    const perbarui = async () => {
        try {
            const { meta } = await api("/me/notifications?limit=1");
            angka.textContent = meta.unreadCount;
            angka.hidden = !meta.unreadCount;
            link.setAttribute("aria-label", meta.unreadCount ? `${label}, ${meta.unreadCount} belum dibaca` : label);
        } catch {
            angka.hidden = true;
        }
    };
    const diKotakMasuk = (location.pathname.split("/").pop() || "").toLowerCase() === "notifikasi.html";
    window.perbaruiLonceng = perbarui;
    perbarui();
    onRealtime("notification", data => {
        if (!diKotakMasuk && data && data.title) toast(data.title);
        perbarui();
    });
    if (key === "pelanggan") {
        onRealtime("announcement", data => {
            if (!diKotakMasuk && data && data.title) toast(`Pengumuman: ${data.title}`);
        });
    }
    onRealtimeReconnect(perbarui);
}

// Ubah tampilan badge status (kelas + teks) di satu tempat.
function setBadge(badge, kelas, teks) {
    badge.className = `badge ${kelas}`;
    badge.textContent = teks;
}

function tandaiField(input, teks) {
    const field = input.closest(".field") || input.parentElement;
    field.classList.add("is-error");
    input.setAttribute("aria-invalid", "true");
    const pesan = document.createElement("p");
    pesan.className = "error-msg";
    pesan.dataset.server = "1";
    pesan.textContent = teks;
    field.append(pesan);
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
        tandaiField(input, pesanIssue(issue));
        if (!pertama) pertama = input;
    });
    if (pertama) pertama.focus();
    return sisa;
}

function pesanGantiPassword(form, error) {
    const teks = pesanForm(form, error, { currentPassword: "pl", newPassword: "pb" });
    if (error instanceof ApiError && error.message === "current password is incorrect") {
        const input = form.querySelector("#pl");
        tandaiField(input, "Password lama salah.");
        input.focus();
    }
    return teks;
}

function pesanForm(form, error, fields) {
    const sisa = showIssues(form, error, fields);
    if (sisa === false) return errorMessage(error);
    return sisa.length ? issuesText(sisa) : "Periksa lagi isian yang ditandai.";
}

const PESAN_ISSUE = [
    ["must match password", "Password tidak sama."],
    ["must differ from the current password", "Password baru harus berbeda dari password lama."],
    ["must be at most 72 bytes", "Password terlalu panjang. Kurangi huruf khusus atau emoji."],
    [/^must be an Indonesian number/, "Nomor HP tidak valid. Contoh: 0812…"],
    ["must be a real calendar date", "Tanggal tidak valid."],
    ["must not be before from", "Tanggal akhir tidak boleh sebelum tanggal mulai."],
    ["must be after startAt", "Harus setelah tanggal mulai."],
    ["must not be greater than deliveryMaxDistance", "Tidak boleh lebih dari jarak antar maksimal."],
    ["latitude and longitude must be sent together", "Pilih titik di peta."],
    ["deliveryLatitude and deliveryLongitude must be sent together", "Pilih titik antar di peta."],
    ["latitude and longitude must both be null to clear them", "Hapus titik peta sepenuhnya atau pilih ulang."],
    ["is required for delivery", "Wajib diisi untuk pesanan antar."],
    ["is required", "Wajib diisi."],
    ["is optional", "Tidak perlu diisi."],
    ["must change at least one field", "Belum ada yang diubah."],
    ["must not contain duplicates", "Ada pilihan yang dobel."],
    ["must not move two times to the same time", "Dua waktu makan tidak boleh dipindah ke jam yang sama."],
    ["cannot be sent together with deliveryTimes", "Tidak bisa dipakai bersama pilihan waktu makan."],
    ["send either ids or packageId with from and to", "Pilih slot tertentu atau paket dengan rentang tanggal."],
    ["must be a finite number", "Harus berupa angka."],
    [/^must be 1-50 characters/, "1–50 karakter: huruf besar, angka, - atau _."],
    ["photo does not exist", "Foto tidak ditemukan. Unggah ulang fotonya."],
    [/^unknown placeholders (.+?); allowed: (.+)$/, m => `Placeholder tidak dikenal: ${m[1]}. Yang bisa dipakai: ${m[2]}.`],
    ["is already one of the package's meal times", "Waktu makan ini sudah ada di paket."],
    ["must be one of the package's meal times", "Pilih salah satu waktu makan paket."],
];
const SATUAN_ISSUE = { characters: "karakter", items: "pilihan", bytes: "byte", entries: "isian" };
const LABEL_FIELD = {
    phone: "Nomor HP",
    password: "Password",
    confirmPassword: "Ulangi password",
    currentPassword: "Password lama",
    newPassword: "Password baru",
    name: "Nama",
    email: "Email",
    address: "Alamat",
    allergyIds: "Alergi",
    allergyNote: "Catatan alergi",
    recipientName: "Nama penerima",
    deliveryAddress: "Alamat antar",
    promoCode: "Kode promo",
    notes: "Catatan",
    note: "Catatan",
    photoKey: "Foto",
};

function pesanIssue(issue) {
    const message = issue.message || "";
    for (const [cocok, teks] of PESAN_ISSUE) {
        const hasil = typeof cocok === "string" ? (cocok === message ? [message] : null) : cocok.exec(message);
        if (hasil) return typeof teks === "function" ? teks(hasil) : teks;
    }
    const ukuran = /^Too (small|big): expected (\w+) to (?:have|be) (>=|<=|>|<|exactly )(-?[\d.]+)(?: (\w+))?$/.exec(message);
    if (ukuran) {
        const [, arah, asal, tanda, angkaTeks, satuan] = ukuran;
        let angka = Number(angkaTeks);
        if (tanda === ">") angka += asal === "number" ? 0 : 1;
        if (tanda === "<") angka -= asal === "number" ? 0 : 1;
        const kata = satuan ? ` ${SATUAN_ISSUE[satuan] || satuan}` : "";
        if (tanda === "exactly ") return `Harus tepat ${angka}${kata}.`;
        if (asal === "string" && arah === "small" && angka === 1) return "Wajib diisi.";
        if (asal === "array" && arah === "small" && angka === 1) return "Pilih minimal 1.";
        if (asal === "number" && (tanda === ">" || tanda === "<")) return arah === "small" ? `Harus lebih dari ${angka}.` : `Harus kurang dari ${angka}.`;
        return arah === "small" ? `Minimal ${angka}${kata}.` : `Maksimal ${angka}${kata}.`;
    }
    if (issue.code === "invalid_type") return /received undefined$/.test(message) ? "Wajib diisi." : "Isian tidak valid.";
    if (issue.code === "invalid_value") return "Pilihan tidak valid.";
    if (issue.code === "invalid_format" || /^Invalid (email address|UUID)/.test(message)) {
        if (/email/.test(message)) return "Format email tidak valid.";
        if (/UUID/.test(message)) return "Pilihan tidak valid.";
        return "Format tidak valid.";
    }
    if (issue.code === "photo_not_found") return "Foto tidak ditemukan. Unggah ulang fotonya.";
    if (issue.code === "end_before_start") return "Tanggal akhir harus setelah tanggal mulai.";
    if (issue.code === "required") return "Wajib diisi.";
    return message;
}

function issuesText(issues) {
    return issues
        .map(i => {
            const teks = pesanIssue(i);
            if (!i.path) return teks;
            const baris = /^items\.(\d+)\.(\w+)/.exec(i.path);
            if (baris) return `Baris ${Number(baris[1]) + 1}, ${LABEL_FIELD[baris[2]] || baris[2]}: ${teks}`;
            const akar = i.path.split(".")[0];
            return `${LABEL_FIELD[akar] || i.path}: ${teks}`;
        })
        .join(" ");
}

async function fetchAll(path) {
    const pemisah = path.includes("?") ? "&" : "?";
    const semua = [];
    for (let page = 1; ; page++) {
        const { data, meta } = await api(`${path}${pemisah}page=${page}&limit=100`);
        semua.push(...data);
        if (!meta || !data.length || semua.length >= meta.total) return semua;
    }
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
