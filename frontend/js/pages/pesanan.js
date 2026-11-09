import "../layout/boot.js";
import { api, ApiError } from "../core/api.js";
import { errorMessage } from "../core/errors.js";
import { onRealtime, onRealtimeReconnect } from "../core/realtime.js";
import { muatBisnis } from "../features/bisnis.js";
import { bayarSnap, bisaBatal, bisaSkip, hitungMundur } from "../features/pelanggan.js";
import { pasangPeta } from "../features/peta.js";
import { panelKonfirmasi } from "../ui/confirm.js";
import { $, el } from "../ui/dom.js";
import { formatTanggal, hariIni, rp, tambahHari } from "../ui/format.js";
import { pesanForm, showIssues, tampilGalat } from "../ui/forms.js";
import { barisHarga } from "../ui/harga.js";
import { badge, labelJenisBayar, labelMetode, labelStatusBayar } from "../ui/status.js";
import { toast } from "../ui/toast.js";

const idPesanan = new URLSearchParams(location.search).get("id");

let sub = null;
let tutupHitung = null;
let petaUbah = null;
let pinUbah = null;
let nomorPratinjau = 0;
let timerPratinjau = null;
let formUbahTerbuka = false;

const galat = isi => tampilGalat($("#err"), isi);

function kartuRingkasan(s) {
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

function kartuHarga(s) {
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

function barisSlot(o) {
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
    if (sub.status === "Success" && bisaSkip(o)) {
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
                    await muat();
                },
            });
        aksi.append(skip);
        kanan.append(aksi);
    }
    baris.append(kiri, kanan);
    return baris;
}

function kelompokTanggal(tanggal, slot) {
    const box = el("div", "stack");
    const kepala = el("div", "row-between");
    kepala.append(el("h3", "t-h3", formatTanggal(tanggal, "hari")));
    const bisa = slot.filter(bisaSkip);
    if (sub.status === "Success" && bisa.length >= 2) {
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
                        body: { date: tanggal, subscriptionId: sub.id, ...(skipReason ? { skipReason } : {}) },
                    });
                    toast(`${data.skippedCount} slot dilewati.`);
                    await muat();
                },
            });
        kepala.append(skip);
    }
    box.append(kepala, ...slot.map(barisSlot));
    return box;
}

function kartuKalender(s) {
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
    depan.forEach(t => card.append(kelompokTanggal(t, urut(t))));
    if (lewat.length) {
        const rinci = el("details", "stack");
        rinci.append(el("summary", "t-small", `Sudah lewat (${lewat.length} hari)`));
        lewat.forEach(t => rinci.append(kelompokTanggal(t, urut(t))));
        card.append(rinci);
    }
    return card;
}

function kartuBayar(s) {
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

async function kartuTunggu(s) {
    const bayar = (s.payments || []).find(p => p.type === "SUBSCRIPTION" && p.status === "Pending");
    if (s.status !== "Pending" || !bayar) return null;
    const card = el("section", "card live stack");
    card.append(el("h2", "t-h2", "Menunggu pembayaran"));
    if (bayar.method === "CASH") {
        const b = await muatBisnis();
        card.append(
            el(
                "p",
                "",
                `Bayar ${rp(bayar.amount)} tunai di kasir${b && b.address ? ` (${b.address})` : ""} secepatnya.`,
            ),
            el(
                "p",
                "t-small t-muted",
                "Pesanan yang belum dibayar batal otomatis. Admin memverifikasi pembayaranmu di kasir.",
            ),
        );
        return card;
    }
    try {
        const { data: sesi } = await api(`/subscriptions/${s.id}/payment-session`, { method: "POST" });
        const hitung = el("p", "t-h3");
        const tombol = el("button", "btn btn-primary", "Lanjutkan Pembayaran");
        tombol.type = "button";
        tombol.onclick = () => bayarSnap(sesi, { onSelesai: muat });
        card.append(hitung, tombol);
        tutupHitung = hitungMundur(hitung, sesi.expiresAt, () => {
            tombol.disabled = true;
            setTimeout(muat, 3000);
        });
    } catch (error) {
        card.append(
            el(
                "p",
                "",
                error instanceof ApiError && error.status === 422
                    ? "Sesi pembayaran sudah habis. Pesanan akan batal otomatis; buat pesanan baru."
                    : errorMessage(error),
            ),
        );
    }
    return card;
}

function kartuBatal(s) {
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
                    await muat();
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

const adaSlotBisaUbah = s =>
    (s.orders || []).some(o => o.status === "Terjadwal" && o.menuSchedule && o.menuSchedule.date > hariIni());

function bodyUbah(s, kirim) {
    const ke = !s.isDelivery;
    const body = { isDelivery: ke };
    if ($("#uMulai").value) body.effectiveFrom = $("#uMulai").value;
    if (ke) {
        body.deliveryAddress = $("#uAlamat").value.trim();
        if (pinUbah) {
            body.deliveryLatitude = pinUbah.lat;
            body.deliveryLongitude = pinUbah.lng;
        }
        if (kirim && s.purchaseType === "Offline")
            body.paymentMethod = (document.querySelector("[name=uBayar]:checked") || {}).value || "MIDTRANS";
    }
    return body;
}

const FIELD_UBAH = {
    effectiveFrom: "uMulai",
    deliveryAddress: "uAlamat",
    deliveryLatitude: "uPeta",
    deliveryLongitude: "uPeta",
};

async function pratinjauUbah(s) {
    const ini = ++nomorPratinjau;
    const body = bodyUbah(s, false);
    const hasil = $("#uHasil");
    $("#uKonfirmasi").hidden = true;
    if (body.isDelivery && (!body.deliveryAddress || !pinUbah)) {
        hasil.textContent = "Isi alamat dan pilih titik di peta untuk melihat biaya.";
        return;
    }
    try {
        const { data } = await api(`/subscriptions/${s.id}/delivery-method/preview`, { method: "POST", body });
        if (ini !== nomorPratinjau) return;
        showIssues($("#fUbah"), null, FIELD_UBAH);
        galat(null);
        const teks = [
            `${data.slotCount} slot mulai ${formatTanggal(data.effectiveFrom)} berubah ke ${data.toDelivery ? "Diantar" : "Ambil sendiri"}.`,
        ];
        const luar = Boolean(data.delivery && !data.delivery.available);
        if (data.toDelivery) {
            if (luar)
                teks.push(
                    `Titik ini ${data.delivery.distanceKm} km dari dapur, di luar jangkauan antar (maksimal ${data.delivery.maxDistanceKm} km). Pindahkan titik atau tetap ambil sendiri.`,
                );
            else if (data.amount === 0) teks.push("Gratis, langsung berlaku.");
            else
                teks.push(
                    `Jarak ${data.delivery.distanceKm} km · ongkir ${rp(data.deliveryFeePerSlot)}/slot · total ${rp(data.amount)}.`,
                );
        } else if (data.amount > 0) {
            teks.push(`Ongkir ${rp(data.amount)} dikembalikan manual oleh admin.`);
        }
        hasil.replaceChildren(...teks.map(t => el("p", "", t)));
        const tanggal = data.slots.map(x => formatTanggal(x.serviceDate, "pendek")).join(", ");
        hasil.append(el("p", "t-small t-muted", `Tanggal: ${tanggal}`));
        $("#uKonfirmasi").hidden = luar || data.slotCount === 0;
        $("#uKonfirmasi").textContent =
            data.toDelivery && data.amount > 0
                ? (document.querySelector("[name=uBayar]:checked") || {}).value === "CASH" &&
                  s.purchaseType === "Offline"
                    ? "Ubah & Bayar Tunai"
                    : "Ubah & Bayar"
                : "Ubah Metode";
    } catch (error) {
        if (ini !== nomorPratinjau) return;
        hasil.textContent = "";
        galat(pesanForm($("#fUbah"), error, FIELD_UBAH));
    }
}

async function kartuUbah(s) {
    const card = el("section", "card stack");
    card.append(el("h2", "t-h2", "Ubah metode penerimaan"));
    if ((s.deliveryMethodChanges || []).some(c => c.status === "Pending")) {
        card.append(el("p", "t-muted", "Selesaikan atau tunggu pembayaran perubahan sebelumnya."));
        return card;
    }
    petaUbah = null;
    const ke = !s.isDelivery;
    const tombolBuka = el("button", "btn btn-secondary", ke ? "Ubah ke Diantar" : "Ubah ke Ambil Sendiri");
    tombolBuka.type = "button";
    const form = el("form", "stack");
    form.id = "fUbah";
    form.noValidate = true;
    form.hidden = !formUbahTerbuka;
    tombolBuka.hidden = formUbahTerbuka;
    form.innerHTML = `
      <div class="field"><label for="uMulai">Berlaku mulai</label><input class="input" id="uMulai" type="date"><p class="hint">Kosongkan untuk mulai dari slot pertama yang bisa diubah.</p></div>
      <div class="stack" id="uAntar" hidden>
        <div class="field"><label for="uAlamat">Alamat pengantaran</label><textarea class="textarea" id="uAlamat"></textarea></div>
        <div class="field"><span class="field-label">Titik lokasi</span><div id="uPeta"></div></div>
        <div class="field" id="uBox" hidden><span class="field-label">Metode bayar ongkir</span><div class="chip-group">
          <label class="chip"><input type="radio" name="uBayar" value="MIDTRANS" checked>Non-tunai</label><label class="chip"><input type="radio" name="uBayar" value="CASH">Tunai</label></div></div>
      </div>
      <div class="card" aria-live="polite" id="uHasil"></div>
      <div class="row"><button class="btn btn-primary" type="submit" id="uKonfirmasi" hidden>Ubah Metode</button><button class="btn btn-ghost" type="button" id="uTutup">Tutup</button></div>`;
    card.append(tombolBuka, form);
    const mulai = form.querySelector("#uMulai");
    mulai.min = tambahHari(hariIni(), 1);
    mulai.max = s.endDate;
    form.querySelector("#uAntar").hidden = !ke;
    form.querySelector("#uBox").hidden = s.purchaseType !== "Offline";
    const tunda = () => {
        clearTimeout(timerPratinjau);
        timerPratinjau = setTimeout(() => pratinjauUbah(s), 350);
    };
    const buka = async () => {
        formUbahTerbuka = true;
        form.hidden = false;
        tombolBuka.hidden = true;
        if (ke && !petaUbah) {
            let titik =
                s.deliveryLatitude != null && s.deliveryLongitude != null
                    ? { lat: Number(s.deliveryLatitude), lng: Number(s.deliveryLongitude) }
                    : null;
            let alamat = s.deliveryAddress || "";
            if (!titik || !alamat) {
                try {
                    const { data: profil } = await api("/me");
                    if (!alamat) alamat = profil.address || "";
                    if (!titik && profil.latitude != null && profil.longitude != null)
                        titik = { lat: Number(profil.latitude), lng: Number(profil.longitude) };
                } catch {}
            }
            form.querySelector("#uAlamat").value = alamat;
            petaUbah = pasangPeta(form.querySelector("#uPeta"), {
                titik,
                label: "Peta titik pengantaran. Ketuk untuk menaruh pin.",
                onPilih: baru => {
                    pinUbah = baru;
                    tunda();
                },
            });
            pinUbah = petaUbah.ambilTitik();
        }
        pratinjauUbah(s);
    };
    tombolBuka.onclick = buka;
    form.querySelector("#uTutup").onclick = () => {
        formUbahTerbuka = false;
        form.hidden = true;
        tombolBuka.hidden = false;
    };
    form.addEventListener("input", tunda);
    form.addEventListener("change", tunda);
    form.addEventListener("submit", async event => {
        event.preventDefault();
        const kirim = form.querySelector("#uKonfirmasi");
        kirim.disabled = true;
        galat(null);
        try {
            const { data } = await api(`/subscriptions/${s.id}/delivery-method`, {
                method: "POST",
                body: bodyUbah(s, true),
            });
            formUbahTerbuka = false;
            petaUbah = null;
            pinUbah = null;
            if (data.paymentSession) {
                await muat();
                bayarSnap(data.paymentSession, { onSelesai: muat });
                return;
            }
            if (data.payment && data.payment.method === "CASH") {
                toast(
                    `Bayar ${rp(data.payment.amount)} tunai di kasir. Slot berubah ke Diantar setelah pembayaran diverifikasi.`,
                );
            } else {
                toast("Metode penerimaan diubah.");
            }
            await muat();
        } catch (error) {
            kirim.disabled = false;
            galat(pesanForm(form, error, FIELD_UBAH));
        }
    });
    if (formUbahTerbuka) setTimeout(buka, 0);
    return card;
}

function kartuRiwayatUbah(s) {
    const daftar = [...(s.deliveryMethodChanges || [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (!daftar.length) return null;
    const card = el("section", "card stack");
    card.append(el("h2", "t-h2", "Riwayat ubah metode"));
    const STATUS = { Pending: "Menunggu pembayaran", Success: "Berlaku", Expire: "Batal" };
    daftar.forEach(c => {
        const row = el("div", "invoice");
        const kiri = el("div");
        kiri.append(
            el(
                "p",
                "t-h3",
                `${c.toDelivery ? "Ke diantar" : "Ke ambil sendiri"} mulai ${formatTanggal(c.effectiveFrom)}`,
            ),
            el(
                "p",
                "t-small t-muted",
                `${c.slotCount} slot · ${c.amount > 0 ? rp(c.amount) : "tanpa biaya"}${c.needsRefund ? " · refund diproses" : ""}`,
            ),
        );
        const kanan = el("div", "row");
        kanan.append(badge(c.status, STATUS[c.status]));
        const bayar = c.paymentId && (s.payments || []).find(p => p.id === c.paymentId);
        if (c.status === "Pending" && bayar) {
            if (bayar.method === "CASH") {
                kiri.append(el("p", "t-small", "Bayar tunai di kasir."));
            } else {
                const tombol = el("button", "btn btn-primary btn-sm", "Lanjutkan Pembayaran");
                tombol.type = "button";
                tombol.onclick = async () => {
                    tombol.disabled = true;
                    try {
                        const { data } = await api(`/delivery-method-changes/${c.id}/payment-session`, {
                            method: "POST",
                        });
                        await bayarSnap(data, { onSelesai: muat });
                    } catch (error) {
                        galat(error);
                    } finally {
                        tombol.disabled = false;
                    }
                };
                kanan.append(tombol);
            }
        }
        row.append(kiri, kanan);
        card.append(row);
    });
    return card;
}

let muatKe = 0;
async function muat() {
    const ke = ++muatKe;
    if (!idPesanan) {
        $("#isi").removeAttribute("aria-busy");
        $("#isi").replaceChildren(el("p", "t-muted", "Pesanan tidak ditemukan."));
        return;
    }
    try {
        const { data } = await api(`/subscriptions/${encodeURIComponent(idPesanan)}`);
        if (ke !== muatKe) return;
        sub = data;
        if (tutupHitung) tutupHitung();
        tutupHitung = null;
        document.title = `Pesanan ${data.id.slice(0, 8).toUpperCase()} · LAHAP`;
        const tunggu = await kartuTunggu(data);
        const ubah = data.status === "Success" && adaSlotBisaUbah(data) ? await kartuUbah(data) : null;
        if (ke !== muatKe) return;
        const bagian = [
            kartuRingkasan(data),
            tunggu,
            kartuHarga(data),
            kartuKalender(data),
            kartuBayar(data),
            ubah,
            kartuRiwayatUbah(data),
            kartuBatal(data),
        ].filter(Boolean);
        $("#isi").removeAttribute("aria-busy");
        $("#isi").replaceChildren(...bagian);
    } catch (error) {
        if (ke !== muatKe) return;
        $("#isi").removeAttribute("aria-busy");
        if (error instanceof ApiError && (error.status === 404 || error.status === 400)) {
            const kosong = el("div", "stack");
            const kembali = el("a", "btn btn-secondary", "Kembali ke Langganan Saya");
            kembali.href = "langganan.html";
            kosong.append(el("p", "t-muted", "Pesanan tidak ditemukan."), kembali);
            $("#isi").replaceChildren(kosong);
        } else {
            $("#isi").replaceChildren();
            galat(error);
        }
    }
}

let tundaMuat;
const muatTertunda = () => {
    if (formUbahTerbuka && petaUbah) return;
    clearTimeout(tundaMuat);
    tundaMuat = setTimeout(muat, 300);
};
["slot.status", "slot.menu", "slot.obstacle", "notification"].forEach(nama => onRealtime(nama, muatTertunda));
onRealtimeReconnect(muatTertunda);

muat();
