import { onRealtime, onRealtimeReconnect } from "../core/realtime.js";
import { api } from "../core/api.js";
import { toast } from "../ui/toast.js";

let perbaruiAktif = null;

export function perbaruiLonceng() {
    if (perbaruiAktif) perbaruiAktif();
}

export function pasangLonceng(link, key) {
    if (!link) return;
    const angka = document.createElement("span");
    angka.className = "badge badge--cancel";
    angka.hidden = true;
    link.append(" ", angka);
    const label = link.getAttribute("aria-label") || link.firstChild.textContent;
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
    perbaruiAktif = perbarui;
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
