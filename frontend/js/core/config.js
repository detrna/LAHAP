export const API_ORIGIN = "https://lahap.bccdev.id";
const LOCAL_HOSTS = ["localhost", "127.0.0.1"];
export const IS_LOCAL = LOCAL_HOSTS.includes(location.hostname);
export const API_BASE = IS_LOCAL ? `${API_ORIGIN}/api` : "/api";
export const REALTIME_STREAM_URL = `${API_ORIGIN}/api/realtime/stream`;
export const REQUEST_TIMEOUT_MS = 20000;
export const MIDTRANS_CLIENT_KEY = "Mid-client-fmKxo1pZHv54Xpa-";
export const MIDTRANS_SANDBOX = true;
export const MIDTRANS_SNAP_URL = MIDTRANS_SANDBOX
    ? "https://app.sandbox.midtrans.com/snap/snap.js"
    : "https://app.midtrans.com/snap/snap.js";
