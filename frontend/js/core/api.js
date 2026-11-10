import { API_BASE, REQUEST_TIMEOUT_MS } from "./config.js";

export class ApiError extends Error {
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
export const store = {
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

export function saveSession(session) {
    store.token = session.accessToken;
    store.user = session.user;
}

export function clearSession() {
    store.token = null;
    store.user = null;
}

// Beberapa request paralel yang sama-sama 401 harus berbagi satu refresh,
// karena refresh token biasanya dirotasi dan pemakaian kedua akan gagal.
let refreshing = null;
export function refreshSession() {
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
export function keLogin() {
    const sekarang = location.pathname.split("/").pop() + location.search;
    if (!document.body.hasAttribute("data-roles")) {
        import("../features/auth-modal.js").then(({ bukaMasuk }) => bukaMasuk());
        return;
    }
    location.replace(`landing.html?masuk=1&redirect=${encodeURIComponent(sekarang)}`);
}

// Memastikan access token tersedia (mis. sebelum membuka EventSource).
export async function ensureToken() {
    if (store.token) return true;
    if (!store.user) return false;
    return refreshSession();
}

export async function api(path, options = {}) {
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

export async function upload(folder, file) {
    const body = new FormData();
    body.append("folder", folder);
    body.append("file", file);
    const { data } = await api("/files", { method: "POST", body });
    return data;
}

export async function fetchAll(path) {
    const pemisah = path.includes("?") ? "&" : "?";
    const semua = [];
    for (let page = 1; ; page++) {
        const { data, meta } = await api(`${path}${pemisah}page=${page}&limit=100`);
        semua.push(...data);
        if (!meta || !data.length || semua.length >= meta.total) return semua;
    }
}
