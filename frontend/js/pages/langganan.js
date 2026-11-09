import "../layout/boot.js";
import { api } from "../core/api.js";
import { onRealtime, onRealtimeReconnect } from "../core/realtime.js";
import { currentUser } from "../core/session.js";
import { bisaSkip, langkahSlot } from "../features/pelanggan.js";
import { panelKonfirmasi } from "../ui/confirm.js";
import { $, el } from "../ui/dom.js";
import { formatTanggal, hariIni, jam, rp } from "../ui/format.js";
import { tampilGalat } from "../ui/forms.js";
import { renderPager } from "../ui/pager.js";
import { badge, labelJenisBayar, labelMetode, labelStatusBayar } from "../ui/status.js";
import { toast } from "../ui/toast.js";

const FILTER = [
    ["", "Semua"],
    ["Pending", "Menunggu bayar"],
    ["Success", "Lunas"],
    ["Dibatalkan", "Dibatalkan"],
    ["Expire", "Kedaluwarsa"],
];
let filter = "";

const galat = isi => tampilGalat($("#err"), isi);

function kartuPesanan(s) {
    const card = el("section", "card stack");
    const label = s.displayStatus || s.status;
    const kepala = el("div", "row-between");
    const judul = el("div");
    judul.append(
        el("p", "label", `Pesanan ${s.id.slice(0, 8).toUpperCase()}`),
        el("h3", "t-h2", `${s.package ? s.package.name : "Paket"} · ${s.period}`),
    );
    kepala.append(
        judul,
        badge(s.status === "Success" ? label : s.status, s.status === "Pending" ? "Menunggu bayar" : undefined),
    );
    const meta = el("dl", "meta");
    [
        ["Periode", `${formatTanggal(s.startDate)} – ${formatTanggal(s.endDate)}`],
        ["Penerimaan", s.isDelivery ? "Diantar" : "Ambil sendiri"],
        ["Total", rp(s.totalPrice)],
    ].forEach(([k, v]) => {
        const kotak = el("div");
        kotak.append(el("dt", "", k), el("dd", "", v));
        meta.append(kotak);
    });
    card.append(kepala, meta);
    if (s.needsRefund) card.append(el("div", "alert alert--info", "Refund sedang diproses admin."));
    const aksi = el("div", "row");
    const detail = el(
        "a",
        s.status === "Pending" ? "btn btn-primary btn-sm" : "btn btn-secondary btn-sm",
        s.status === "Pending" ? "Selesaikan Pembayaran" : "Lihat detail",
    );
    detail.href = `pesanan.html?id=${s.id}`;
    aksi.append(detail);
    card.append(aksi);
    return card;
}

function kartuHariIni(o) {
    const card = el("section", "card live stack");
    const jadwal = o.menuSchedule;
    const kepala = el("div", "row-between");
    const judul = el("div");
    judul.append(el("h3", "t-h3", jadwal ? `${jadwal.deliveryTime.range} · ${jadwal.deliveryTime.time}` : "Hari ini"));
    const paket = o.subscription && o.subscription.package;
    if (paket) judul.append(el("p", "t-small t-muted", paket.name));
    kepala.append(judul, badge(o.status));
    card.append(kepala);
    if (o.status !== "Dilewati") card.append(langkahSlot(o));
    if (o.status === "Diantar" && o.courier) card.append(el("p", "t-small", `Kurir: ${o.courier.name}`));
    if (o.status === "Selesai" && o.completedAt)
        card.append(el("p", "t-small t-muted", `Selesai pukul ${jam(o.completedAt)}`));
    if (o.status === "Dilewati" && o.skipReason)
        card.append(el("p", "t-small t-muted", `Alasan skip: ${o.skipReason}`));
    (o.obstacles || []).forEach(k => {
        const box = el("div", "alert alert--warning");
        box.append(el("span", "alert-title", `Catatan kurir · ${formatTanggal(k.createdAt, "waktu")}`), k.note);
        card.append(box);
    });
    const menu = el("p", "t-small t-muted", o.menu ? o.menu.name : "");
    card.append(menu);
    if (o.usesAlternativeMenu) {
        card.append(
            el("div", "alert alert--info", "Menu alternatif: menu hari ini diganti untuk menghindari alergenmu."),
        );
    }
    if (bisaSkip(o)) {
        const aksi = el("div");
        const skip = el("button", "btn btn-secondary btn-sm", "Skip slot ini");
        skip.type = "button";
        skip.onclick = () =>
            panelKonfirmasi(aksi, {
                judul: "Lewati slot ini?",
                teks: "Tidak ada pengembalian dana dan hari ini tidak diganti ke hari lain.",
                alasan: true,
                tombol: "Ya, skip",
                onKirim: async skipReason => {
                    await api(`/orders/${o.id}/skip`, { method: "POST", body: skipReason ? { skipReason } : {} });
                    toast("Slot dilewati.");
                    await muat();
                },
            });
        aksi.prepend(skip);
        card.append(aksi);
    }
    return card;
}

function tampilTier(m) {
    const box = $("#tier");
    const tier = m.membership && m.membership.tier;
    const kepala = el("div", "row-between");
    kepala.append(el("span", "t-h3", tier ? `Tier ${tier.name}` : "Belum punya tier"));
    if (tier) kepala.append(el("span", "badge badge--ready", `Diskon ${tier.discountPercent}%`));
    const info = el("p", "t-small t-muted", `${m.subscriptionDays} hari langganan terbayar.`);
    box.replaceChildren(kepala, info);
    if (m.nextTier && m.daysToNextTier != null) {
        const total = m.subscriptionDays + m.daysToNextTier;
        const bar = el("div", "progress");
        bar.style.margin = "8px 0";
        const isi = el("span");
        isi.style.width = `${total ? Math.min(100, (m.subscriptionDays / total) * 100) : 0}%`;
        bar.append(isi);
        box.append(bar, el("p", "t-small t-muted", `${m.daysToNextTier} hari lagi menuju ${m.nextTier.name}.`));
    }
    if (m.membership && m.membership.expiresAt)
        box.append(el("p", "t-small t-muted", `Tier berlaku sampai ${formatTanggal(m.membership.expiresAt)}.`));
}

function baris(p) {
    const row = el("div", "invoice");
    const kiri = el("div");
    kiri.append(
        el("p", "t-h3", labelJenisBayar(p.type)),
        el(
            "p",
            "t-small t-muted",
            `${formatTanggal(p.paidAt || p.createdAt)} · ${labelMetode(p.method)} · ${p.doneOnline ? "Online" : "Tunai"}`,
        ),
    );
    const lihat = el("a", "t-small", "Lihat pesanan");
    lihat.href = `pesanan.html?id=${p.subscriptionId}`;
    kiri.append(lihat);
    const kanan = el("div", "row");
    kanan.append(el("span", "t-h3", rp(p.amount)), badge(p.status, labelStatusBayar(p.status)));
    row.append(kiri, kanan);
    return row;
}

let hariIniData = [];
let muatKe = 0;
let halamanPesanan = 1;
let halamanBayar = 1;
async function muat() {
    const ke = ++muatKe;
    try {
        const user = currentUser();
        if (user) {
            $("#nama").textContent = user.name;
            $("#hp").textContent = user.phone || "";
            $("#avatar").textContent = (user.name || "?")
                .split(" ")
                .map(k => k[0])
                .slice(0, 2)
                .join("")
                .toUpperCase();
        }
        const status = filter ? `&status=${filter}` : "";
        const [subs, hari, bayar, member] = await Promise.all([
            api(`/subscriptions?page=${halamanPesanan}&limit=10${status}`),
            api(`/orders?date=${hariIni()}`),
            api(`/payments?page=${halamanBayar}&limit=10`),
            api("/me/membership"),
        ]);
        if (ke !== muatKe) return;
        if ((!subs.data.length && halamanPesanan > 1) || (!bayar.data.length && halamanBayar > 1)) {
            if (!subs.data.length && halamanPesanan > 1) halamanPesanan -= 1;
            if (!bayar.data.length && halamanBayar > 1) halamanBayar -= 1;
            return muat();
        }
        $("#pesanan").removeAttribute("aria-busy");
        $("#pesanan").replaceChildren(...subs.data.map(kartuPesanan));
        $("#kosong").hidden = subs.data.length > 0;
        $("#kosong").textContent = filter
            ? "Tidak ada pesanan dengan status ini."
            : "Belum ada pesanan. Pilih paket untuk mulai.";
        renderPager($("#pagerPesanan"), subs.meta, p => {
            halamanPesanan = p;
            muat();
        });
        hariIniData = hari.data;
        $("#hariIni").replaceChildren(...hari.data.map(kartuHariIni));
        $("#boxHariIni").hidden = hari.data.length === 0;
        $("#skipHariIni").hidden = hari.data.filter(bisaSkip).length < 2;
        $("#bayar").replaceChildren(...bayar.data.map(baris));
        $("#kosongBayar").hidden = bayar.data.length > 0;
        renderPager($("#pagerBayar"), bayar.meta, p => {
            halamanBayar = p;
            muat();
        });
        tampilTier(member.data);
    } catch (error) {
        if (ke !== muatKe) return;
        $("#pesanan").removeAttribute("aria-busy");
        $("#pesanan").replaceChildren();
        $("#bayar").replaceChildren();
        galat(error);
    }
}

$("#filter").replaceChildren(
    ...FILTER.map(([nilai, label]) => {
        const wrap = el("label", "chip");
        const input = document.createElement("input");
        input.type = "radio";
        input.name = "filter";
        input.value = nilai;
        input.checked = nilai === filter;
        input.onchange = () => {
            filter = nilai;
            halamanPesanan = 1;
            muat();
        };
        wrap.append(input, label);
        return wrap;
    }),
);

$("#skipHariIni").onclick = () =>
    panelKonfirmasi($("#panelSkipHari"), {
        judul: "Lewati semua slot hari ini?",
        teks: "Tidak ada pengembalian dana dan hari tidak diganti ke hari lain. Slot yang makanannya sudah siap tidak bisa dilewati.",
        alasan: true,
        tombol: "Ya, skip hari ini",
        onKirim: async skipReason => {
            const sebelum = hariIniData.filter(bisaSkip).length;
            const { data } = await api("/orders/skip-day", {
                method: "POST",
                body: { date: hariIni(), ...(skipReason ? { skipReason } : {}) },
            });
            toast(
                data.skippedCount < sebelum
                    ? `${data.skippedCount} slot dilewati. Slot yang makanannya sudah siap tidak bisa dilewati.`
                    : `${data.skippedCount} slot dilewati.`,
            );
            await muat();
        },
    });

let tundaMuat;
const muatTertunda = () => {
    clearTimeout(tundaMuat);
    tundaMuat = setTimeout(muat, 300);
};

["slot.status", "slot.menu", "slot.obstacle", "notification"].forEach(nama => onRealtime(nama, muatTertunda));
onRealtimeReconnect(muatTertunda);
document.addEventListener("visibilitychange", () => {
    if (!document.hidden) muatTertunda();
});

muat();
