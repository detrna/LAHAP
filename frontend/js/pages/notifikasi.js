import "../layout/boot.js";
import { api } from "../core/api.js";
import { onRealtime, onRealtimeReconnect } from "../core/realtime.js";
import { currentUser, homeFor } from "../core/session.js";
import { perbaruiLonceng } from "../layout/bell.js";
import { $, el } from "../ui/dom.js";
import { formatTanggal } from "../ui/format.js";
import { tampilGalat } from "../ui/forms.js";
import { renderPager } from "../ui/pager.js";

const KETERANGAN = {
    ADMIN: "Pengingat menu kosong, pembayaran yang perlu direfund, dan pengantaran yang perlu kurir.",
    COURIER: "Kabar tentang slot antar yang ditugaskan kepadamu.",
};

const user = currentUser();
const pelanggan = Boolean(user && user.role === "CUSTOMER");
if (user) $("#beranda").href = homeFor(user);
if (user && !pelanggan) {
    $("#judul").textContent = "Kotak masuk";
    document.title = "Kotak masuk · LAHAP";
}
if (user && KETERANGAN[user.role]) {
    $("#keterangan").textContent = KETERANGAN[user.role];
    $("#keterangan").hidden = false;
}

const galat = isi => tampilGalat($("#err"), isi);

function kartu(n) {
    const box = el("div", n.isRead ? "card" : "alert alert--info");
    box.append(
        el("span", "alert-title", n.title),
        n.body,
        el("p", "t-small t-muted", formatTanggal(n.createdAt, "waktu")),
    );
    if (!n.isRead) {
        box.style.cursor = "pointer";
        box.tabIndex = 0;
        box.setAttribute("role", "button");
        box.append(el("span", "sr-only", "Belum dibaca. Tekan untuk menandai sudah dibaca."));
        const tandai = async () => {
            if (box.dataset.sibuk) return;
            box.dataset.sibuk = "1";
            try {
                await api(`/me/notifications/${n.id}/read`, { method: "POST" });
                perbaruiLonceng();
                muat();
            } catch (error) {
                delete box.dataset.sibuk;
                galat(error);
            }
        };
        box.onclick = tandai;
        box.onkeydown = event => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                tandai();
            }
        };
    }
    return box;
}

function pengumuman(a) {
    const box = el("div", "card");
    box.append(
        el("span", "alert-title", a.title),
        a.body,
        el("p", "t-small t-muted", formatTanggal(a.createdAt, "waktu")),
    );
    return box;
}

let halaman = 1;
let muatKe = 0;
async function muat() {
    const ke = ++muatKe;
    const f = document.querySelector("#filter input:checked").value;
    try {
        const { data, meta } = await api(`/me/notifications?page=${halaman}&limit=20${f ? `&isRead=${f}` : ""}`);
        if (ke !== muatKe) return;
        if (!data.length && halaman > 1) {
            halaman -= 1;
            return muat();
        }
        $("#notif").replaceChildren(...data.map(kartu));
        $("#kosong").textContent = f === "false" ? "Semua notifikasi sudah dibaca." : "Belum ada notifikasi.";
        $("#kosong").hidden = data.length > 0;
        $("#semua").disabled = !meta.unreadCount;
        renderPager($("#pager"), meta, p => {
            halaman = p;
            muat();
        });
        galat(null);
    } catch (error) {
        if (ke !== muatKe) return;
        $("#notif").replaceChildren();
        galat(error);
    } finally {
        $("#notif").removeAttribute("aria-busy");
    }
}

let halamanInfo = 1;
async function muatPengumuman() {
    if (!pelanggan) return;
    try {
        const { data, meta } = await api(`/me/announcements?page=${halamanInfo}&limit=10`);
        $("#info").replaceChildren(...data.map(pengumuman));
        $("#boxInfo").hidden = meta.total === 0;
        renderPager($("#pagerInfo"), meta, p => {
            halamanInfo = p;
            muatPengumuman();
        });
    } catch (error) {
        galat(error);
    }
}

$("#semua").onclick = async event => {
    const tombol = event.currentTarget;
    tombol.disabled = true;
    try {
        await api("/me/notifications/read-all", { method: "POST" });
        perbaruiLonceng();
        await muat();
    } catch (error) {
        tombol.disabled = false;
        galat(error);
    }
};
$("#filter").addEventListener("change", () => {
    halaman = 1;
    muat();
});

onRealtime("notification", muat);
onRealtimeReconnect(muat);
if (pelanggan) {
    onRealtime("announcement", () => {
        halamanInfo = 1;
        muatPengumuman();
    });
    onRealtimeReconnect(muatPengumuman);
}

muat();
muatPengumuman();
