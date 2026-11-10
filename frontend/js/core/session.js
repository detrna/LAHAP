import { api, clearSession, saveSession, store } from "./api.js";

export const ROLE_KEY = { CUSTOMER: "pelanggan", ADMIN: "admin", KITCHEN: "dapur", COURIER: "kurir" };
export const HOME = { pelanggan: "index.html", admin: "admin.html", dapur: "dapur.html", kurir: "kurir.html" };

export async function login(identifier, password) {
    const { data } = await api("/auth/login", { method: "POST", body: { identifier, password }, auth: false });
    saveSession(data);
    return data.user;
}

export async function register(fields) {
    const { data } = await api("/auth/register", { method: "POST", body: fields, auth: false });
    saveSession(data);
    return data.user;
}

export async function logout() {
    try {
        await api("/auth/logout", { method: "POST", body: {}, auth: false });
    } catch {
        /* tetap keluar di sisi browser */
    }
    clearSession();
    location.replace("landing.html");
}

export function currentUser() {
    return store.user;
}

export function homeFor(user) {
    return (user && HOME[ROLE_KEY[user.role]]) || "index.html";
}

export function redirectAman(minta) {
    return minta && /^[\w-]+\.html(\?[\w%=&.-]*)?$/.test(minta) ? minta : null;
}
