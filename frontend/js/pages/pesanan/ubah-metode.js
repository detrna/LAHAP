import { api } from "../../core/api.js";
import { bayarSnap } from "../../features/pelanggan.js";
import { pasangPeta } from "../../features/peta.js";
import { muatBisnis } from "../../features/bisnis.js";
import { gambarJangkauan, penandaDapur, radiusJangkauan, titikDapur } from "../../features/jangkauan.js";
import { $, el } from "../../ui/dom.js";
import { formatTanggal, hariIni, rp, tambahHari } from "../../ui/format.js";
import { pesanForm, showIssues } from "../../ui/forms.js";
import { badge } from "../../ui/status.js";
import { toast } from "../../ui/toast.js";
import { galat, muatUlang } from "./halaman.js";

let petaUbah = null;
let pinUbah = null;
let infoBisnis = null;
let nomorPratinjau = 0;
let timerPratinjau = null;
let formUbahTerbuka = false;

function aturLingkaranUbah(peta, form, bisnis, paket, maksOverride = null) {
    const dapur = titikDapur(bisnis);
    if (!peta || !dapur) return;
    const radius = radiusJangkauan(bisnis, paket);
    gambarJangkauan(peta, {
        pusat: dapur,
        bebasKm: radius.bebasKm,
        maksKm: maksOverride ?? radius.maksKm,
        legenda: form ? form.querySelector("#uLegenda") : null,
        teksMaks: "batas jangkauan antar",
        sesuaikan: true,
    });
}

export const ubahSedangDiisi = () => formUbahTerbuka && petaUbah !== null;

export const adaSlotBisaUbah = s =>
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
        if (data.delivery && data.delivery.maxDistanceKm != null && petaUbah) {
            aturLingkaranUbah(petaUbah, $("#fUbah"), infoBisnis, s.package, data.delivery.maxDistanceKm);
        }
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

export async function kartuUbah(s) {
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
        <ul class="map-legend" id="uLegenda" hidden></ul>
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
            if (!infoBisnis) {
                infoBisnis = await muatBisnis();
            }
            const dapur = titikDapur(infoBisnis);
            petaUbah = pasangPeta(form.querySelector("#uPeta"), {
                titik,
                pusat: dapur || undefined,
                titikTetap: penandaDapur(infoBisnis),
                label: "Peta titik pengantaran. Ketuk untuk menaruh pin.",
                onPilih: baru => {
                    pinUbah = baru;
                    tunda();
                },
            });
            pinUbah = petaUbah.ambilTitik();
            aturLingkaranUbah(petaUbah, form, infoBisnis, s.package);
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
                await muatUlang();
                bayarSnap(data.paymentSession, { onSelesai: muatUlang });
                return;
            }
            if (data.payment && data.payment.method === "CASH") {
                toast(
                    `Bayar ${rp(data.payment.amount)} tunai di kasir. Slot berubah ke Diantar setelah pembayaran diverifikasi.`,
                );
            } else {
                toast("Metode penerimaan diubah.");
            }
            await muatUlang();
        } catch (error) {
            kirim.disabled = false;
            galat(pesanForm(form, error, FIELD_UBAH));
        }
    });
    if (formUbahTerbuka) setTimeout(buka, 0);
    return card;
}

export function kartuRiwayatUbah(s) {
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
                        await bayarSnap(data, { onSelesai: muatUlang });
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
