import { api } from "../../core/api.js";
import { bisaBatal, bisaSkip } from "../../features/pelanggan.js";
import { panelKonfirmasi } from "../../ui/confirm.js";
import { el } from "../../ui/dom.js";
import { formatTanggal, hariIni, rp } from "../../ui/format.js";
import { barisHarga } from "../../ui/harga.js";
import { badge, labelJenisBayar, labelMetode, labelStatusBayar } from "../../ui/status.js";
import { toast } from "../../ui/toast.js";
import { muatUlang } from "./halaman.js";

export function kartuRingkasan(s) {
    const card = el("section", "card stack");
    const kepala = el("div", "row-between");
    const judul = el("div");
    judul.append(
        el("p", "label", `Pesanan ${s.id.slice(0, 8).toUpperCase()}`),
        el("h1", "t-h1", `${s.package ? s.package.name : "Paket"} · ${s.period}`),
    );
    const label = s.status === "Success" ? s.displayStatus || s.status : s.status;
    kepala.append(judul, badge(label, s.status === "Pending" ? "Menunggu bayar" : undefined));
    const meta = el("dl", "meta");
    const rincian = [
        ["Periode", `${formatTanggal(s.startDate)} – ${formatTanggal(s.endDate)}`],
        ["Pembelian", s.purchaseType],
        ["Penerimaan", s.isDelivery ? "Diantar" : "Ambil sendiri"],
        ["Penerima", s.recipientName],
    ];
    if (s.isDelivery && s.deliveryAddress) rincian.push(["Alamat", s.deliveryAddress]);
    if (s.notes) rincian.push(["Catatan", s.notes]);
    rincian.forEach(([k, v]) => {
        const kotak = el("div");
        kotak.append(el("dt", "", k), el("dd", "", v));
        meta.append(kotak);
    });
    card.append(kepala, meta);
    if (s.needsRefund)
        card.append(el("div", "alert alert--info", "Refund sedang diproses admin. Kamu akan dihubungi."));
    (s.deliveryMethodChanges || [])
        .filter(c => c.needsRefund)
        .forEach(c =>
            card.append(el("div", "alert alert--info", `Refund ongkir ${rp(c.amount)} sedang diproses admin.`)),
        );
    return card;
}

export function kartuHarga(s) {
    const card = el("section", "card stack");
    card.append(el("h2", "t-h2", "Rincian harga"));
    const slot = (s.orders || []).length;
    card.append(barisHarga(`${slot} slot × ${rp(s.pricePerPortion)}`, s.foodSubtotal));
    if (s.tierDiscount > 0)
        card.append(barisHarga(`Diskon tier${s.tier ? " " + s.tier.name : ""}`, s.tierDiscount, true));
    if (s.promoDiscount > 0)
        card.append(barisHarga(`Kode promo${s.promoCode ? " " + s.promoCode.code : ""}`, s.promoDiscount, true));
    if (s.deliveryFeeTotal > 0)
        card.append(barisHarga(`Ongkir × ${rp(s.deliveryFeePerSlot)}/slot`, s.deliveryFeeTotal));
    const total = el("div", "price-total");
    total.append(el("span", "", "Total"), el("span", "", rp(s.totalPrice)));
    card.append(total, el("p", "hint", "Harga dikunci saat checkout."));
    if ((s.deliveryMethodChanges || []).some(c => c.status === "Success")) {
        card.append(el("p", "hint", "Metode penerimaan diubah setelah checkout; lihat riwayat ubah metode di bawah."));
    }
    return card;
}

function barisSlot(s, o) {
    const baris = el("div", "slot");
    const kiri = el("div");
    const jadwal = o.menuSchedule;
    kiri.append(
        el("p", "t-h3", jadwal ? jadwal.deliveryTime.time : "Slot"),
        el("p", "t-small t-muted", `${o.menu ? o.menu.name : ""} · ${o.isDelivery ? "Diantar" : "Ambil sendiri"}`),
    );
    if (o.usesAlternativeMenu) kiri.append(el("span", "badge badge--ready", "Menu alternatif"));
    if (o.status === "Dilewati" && o.skipReason)
        kiri.append(el("p", "t-small t-muted", `Alasan skip: ${o.skipReason}`));
    const kanan = el("div", "row");
    kanan.append(badge(o.status));
    if (s.status === "Success" && bisaSkip(o)) {
        const aksi = el("div");
        const skip = el("button", "btn btn-secondary btn-sm", "Skip");
        skip.type = "button";
        skip.onclick = () =>
            panelKonfirmasi(baris, {
                judul: "Lewati slot ini?",
                teks: "Tidak ada pengembalian dana dan hari ini tidak diganti ke hari lain.",
                alasan: true,
                tombol: "Ya, skip",
                onKirim: async skipReason => {
                    await api(`/orders/${o.id}/skip`, { method: "POST", body: skipReason ? { skipReason } : {} });
                    toast("Slot dilewati.");
                    await muatUlang();
                },
            });
        aksi.append(skip);
        kanan.append(aksi);
    }
    baris.append(kiri, kanan);
    return baris;
}

function kelompokTanggal(s, tanggal, slot) {
    const box = el("div", "stack");
    const kepala = el("div", "row-between");
    kepala.append(el("h3", "t-h3", formatTanggal(tanggal, "hari")));
    const bisa = slot.filter(bisaSkip);
    if (s.status === "Success" && bisa.length >= 2) {
        const skip = el("button", "btn btn-ghost btn-sm", "Skip hari ini");
        skip.type = "button";
        skip.onclick = () =>
            panelKonfirmasi(box, {
                judul: `Lewati semua slot ${formatTanggal(tanggal, "hari")}?`,
                teks: "Tidak ada pengembalian dana dan hari tidak diganti ke hari lain. Slot yang makanannya sudah siap tidak bisa dilewati.",
                alasan: true,
                tombol: "Ya, skip hari ini",
                onKirim: async skipReason => {
                    const { data } = await api("/orders/skip-day", {
                        method: "POST",
                        body: { date: tanggal, subscriptionId: s.id, ...(skipReason ? { skipReason } : {}) },
                    });
                    toast(`${data.skippedCount} slot dilewati.`);
                    await muatUlang();
                },
            });
        kepala.append(skip);
    }
    box.append(kepala, ...slot.map(o => barisSlot(s, o)));
    return box;
}

export function kartuKalender(s) {
    const card = el("section", "card stack");
    card.append(el("h2", "t-h2", "Jadwal makan"));
    const peta = new Map();
    (s.orders || []).forEach(o => {
        if (!o.menuSchedule) return;
        const t = o.menuSchedule.date;
        if (!peta.has(t)) peta.set(t, []);
        peta.get(t).push(o);
    });
    const tanggal = [...peta.keys()].sort();
    if (!tanggal.length) {
        card.append(el("p", "t-muted", "Belum ada slot."));
        return card;
    }
    const hari = hariIni();
    const lewat = tanggal.filter(t => t < hari);
    const depan = tanggal.filter(t => t >= hari);
    const urut = t =>
        peta.get(t).sort((a, b) => a.menuSchedule.deliveryTime.time.localeCompare(b.menuSchedule.deliveryTime.time));
    depan.forEach(t => card.append(kelompokTanggal(s, t, urut(t))));
    if (lewat.length) {
        const rinci = el("details", "stack");
        rinci.append(el("summary", "t-small", `Sudah lewat (${lewat.length} hari)`));
        lewat.forEach(t => rinci.append(kelompokTanggal(s, t, urut(t))));
        card.append(rinci);
    }
    return card;
}

export function kartuBayar(s) {
    const card = el("section", "card stack");
    card.append(el("h2", "t-h2", "Pembayaran"));
    const daftar = s.payments || [];
    if (!daftar.length) card.append(el("p", "t-muted", "Belum ada pembayaran."));
    daftar.forEach(p => {
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
        const kanan = el("div", "row");
        kanan.append(el("span", "t-h3", rp(p.amount)), badge(p.status, labelStatusBayar(p.status)));
        row.append(kiri, kanan);
        card.append(row);
    });
    return card;
}

export function kartuBatal(s) {
    if (bisaBatal(s)) {
        const card = el("section", "card stack");
        const tombol = el("button", "btn btn-danger", "Batalkan Pesanan");
        tombol.type = "button";
        tombol.onclick = () =>
            panelKonfirmasi(card, {
                judul: "Batalkan pesanan ini?",
                teks:
                    s.status === "Pending"
                        ? "Belum ada pembayaran yang masuk."
                        : "Dana dikembalikan manual oleh admin.",
                tombol: "Ya, batalkan",
                bahaya: true,
                onKirim: async () => {
                    await api(`/subscriptions/${s.id}/cancel`, { method: "POST" });
                    toast("Pesanan dibatalkan.");
                    await muatUlang();
                },
            });
        card.append(tombol);
        return card;
    }
    if (s.status === "Success" && s.displayStatus !== "Selesai") {
        return el("div", "alert alert--info", "Batas pembatalan sudah lewat. Kamu masih bisa skip slot tertentu.");
    }
    return null;
}
