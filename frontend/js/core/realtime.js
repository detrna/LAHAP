import { REALTIME_STREAM_URL } from "./config.js";
import { ensureToken, refreshSession, store } from "./api.js";

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

export function onRealtime(event, handler) {
    if (!realtime.handlers.has(event)) realtime.handlers.set(event, []);
    realtime.handlers.get(event).push(handler);
    bukaRealtime();
}

export function onRealtimeReconnect(handler) {
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
        const stream = new EventSource(`${REALTIME_STREAM_URL}?accessToken=${encodeURIComponent(store.token)}`);
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
