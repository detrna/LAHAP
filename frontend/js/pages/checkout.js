import "../layout/boot.js";
import { api, ApiError } from "../core/api.js";
import { errorMessage } from "../core/errors.js";
import { currentUser } from "../core/session.js";
import { muatBisnis } from "../features/bisnis.js";
import { bayarSnap } from "../features/pelanggan.js";
import { pasangPeta } from "../features/peta.js";
import { $, el } from "../ui/dom.js";
import { formatTanggal, hariIni, rp, tambahHari } from "../ui/format.js";
import { pesanForm, showIssues, tampilGalat } from "../ui/forms.js";
import { toast } from "../ui/toast.js";

const idPaket = new URLSearchParams(location.search).get("paket");
const senin = tanggal => tambahHari(tanggal, -((new Date(`${tanggal}T00:00:00Z`).getUTCDay() + 6) % 7));
const awalBulan = tanggal => `${tanggal.slice(0, 8)}01`;
const waktu = item => item.time ?? item;

let paket = null;
let pin = null;
let timer = null;
let nomor = 0;

const galat = isi => tampilGalat($("#err"), isi);

function chip(name, value, label, checked, type = "radio") {
    const wrap = document.createElement("label");
    wrap.className = "chip";
    const input = document.createElement("input");
    input.type = type;
    input.name = name;
    input.value = value;
    input.checked = checked;
    wrap.append(input, label);
    return wrap;
}

const nilai = name => {
    const dipilih = document.querySelector(`[name=${name}]:checked`);
    return dipilih ? dipilih.value : "";
};
const semua = name => [...document.querySelectorAll(`[name=${name}]:checked`)].map(input => input.value);

function aturPeriode() {
    const periode = nilai("periode");
    $("#boxHari").hidden = periode !== "Harian";
    $("#boxWaktu").hidden = periode === "Harian" || !periode;
    $("#boxMulai").hidden = periode === "Harian" || !periode;
    $("#hintMulai").textContent =
        periode === "Mingguan"
            ? "Dimulai dari hari Senin pada minggu tanggal ini."
            : "Dimulai dari tanggal 1 pada bulan tanggal ini.";
    $("#boxAntar").hidden = nilai("metode") !== "antar";
    $("#boxBayar").hidden = nilai("jenis") !== "Offline";
    $("#kirim").textContent =
        nilai("jenis") === "Offline" && nilai("bayar") === "CASH" ? "Buat Pesanan" : "Bayar Sekarang";
}

const FIELD_CHECKOUT = {
    recipientName: "penerima",
    deliveryAddress: "alamat",
    deliveryLatitude: "peta",
    deliveryLongitude: "peta",
    notes: "catatan",
    promoCode: "promo",
    menuScheduleIds: "hari",
    periodStart: "mulai",
    deliveryTimes: "waktu",
};

function badan() {
    const periode = nilai("periode");
    const antar = nilai("metode") === "antar";
    const body = {
        packageId: paket.id,
        purchaseType: nilai("jenis"),
        period: periode,
        isDelivery: antar,
        recipientName: $("#penerima").value.trim(),
        paymentMethod: nilai("jenis") === "Offline" ? nilai("bayar") : "MIDTRANS",
    };
    if (periode === "Harian") body.menuScheduleIds = semua("hari");
    else {
        const mulai = $("#mulai").value;
        body.periodStart = !mulai ? "" : periode === "Mingguan" ? senin(mulai) : awalBulan(mulai);
        body.deliveryTimes = semua("waktu");
    }
    if (antar) {
        body.deliveryAddress = $("#alamat").value.trim();
        if (pin) {
            body.deliveryLatitude = pin.lat;
            body.deliveryLongitude = pin.lng;
        }
    }
    if ($("#catatan").value.trim()) body.notes = $("#catatan").value.trim();
    if ($("#promo").value.trim()) body.promoCode = $("#promo").value.trim().toUpperCase();
    return body;
}

function lengkap(body) {
    if (!body.period || !body.recipientName) return false;
    if (body.period === "Harian" ? !body.menuScheduleIds.length : !body.periodStart || !body.deliveryTimes.length)
        return false;
    return !body.isDelivery || Boolean(body.deliveryAddress && pin);
}

// Daftar yang masih kurang, supaya pelanggan tahu kenapa harga belum muncul.
function kurang(body) {
    const daftar = [];
    if (!body.recipientName) daftar.push("nama penerima");
    if (!body.period) daftar.push("periode");
    else if (body.period === "Harian") {
        if (!body.menuScheduleIds.length) daftar.push("minimal satu hari layanan");
    } else {
        if (!body.periodStart) daftar.push("tanggal mulai");
        if (!body.deliveryTimes.length) daftar.push("waktu makan");
    }
    if (body.isDelivery) {
        if (!body.deliveryAddress) daftar.push("alamat pengantaran");
        if (!pin) daftar.push("titik lokasi di peta");
    }
    return daftar;
}

function tampilJadwal(p) {
    $("#jadwalBox").hidden = false;
    $("#jadwalRingkas").textContent =
        `${p.slotCount} slot, ${formatTanggal(p.startDate)} – ${formatTanggal(p.endDate)}.`;
    const bentrok = p.slots.filter(x => x.clashingAllergies.length);
    $("#bentrok").hidden = !bentrok.length;
    $("#bentrok").textContent = bentrok.length
        ? `${bentrok.length} slot mengandung alergenmu. Pesanan tetap bisa dibuat.`
        : "";
    $("#jadwalDaftar").replaceChildren(
        ...p.slots.map(x => {
            const row = el("div", "slot");
            const kiri = el("div");
            kiri.append(
                el("p", "t-h3", `${formatTanggal(x.date, "hari")} · ${waktu(x.deliveryTime)}`),
                el("p", "t-small t-muted", x.menu ? x.menu.name : ""),
            );
            row.append(kiri);
            if (x.clashingAllergies.length) {
                const nama = x.clashingAllergies.map(a => a.name).join(", ");
                row.append(
                    el(
                        "p",
                        "t-small",
                        `Mengandung ${nama} (alergimu). ${x.hasAlternative ? "Dapur bisa memberi menu alternatif." : "Belum ada menu alternatif untuk hari ini."}`,
                    ),
                );
            }
            return row;
        }),
    );
}

function tampilHarga(p, antar) {
    tampilJadwal(p);
    const luar = antar && p.delivery && !p.delivery.available;
    $("#luarJangkau").hidden = !luar;
    $("#luarJangkau").textContent = luar
        ? `Titik ini ${p.delivery.distanceKm} km dari dapur, di luar jangkauan antar (maksimal ${p.delivery.maxDistanceKm} km). Pindahkan titik atau pilih Ambil Sendiri.`
        : "";
    const info = antar && p.delivery && p.delivery.available && p.delivery.distanceKm != null;
    $("#infoJarak").textContent = info
        ? `Jarak ${p.delivery.distanceKm} km · ${p.delivery.feePerSlot > 0 ? `ongkir ${rp(p.delivery.feePerSlot)}/slot` : "gratis ongkir"}`
        : "";
    if (luar) {
        $("#rincian").hidden = true;
        $("#kosongHarga").hidden = false;
        $("#kosongHarga").textContent = "Pilih titik dalam jangkauan atau ambil sendiri untuk melihat harga.";
        return false;
    }
    $("#kosongHarga").hidden = true;
    $("#rincian").hidden = false;
    $("#rMakan").textContent = `${p.slotCount} slot × ${rp(p.pricePerPortion)}`;
    $("#vMakan").textContent = rp(p.foodSubtotal);
    $("#rTier").hidden = !p.tierDiscount;
    $("#vTier").textContent = `−${rp(p.tierDiscount)}`;
    $("#rKode").hidden = !p.promoDiscount;
    $("#vKode").textContent = `−${rp(p.promoDiscount)}`;
    $("#rOngkir").hidden = !p.deliveryFeeTotal;
    $("#tOngkir").textContent = `Ongkir ${p.slotCount} slot × ${rp(p.deliveryFeePerSlot)}`;
    $("#vOngkir").textContent = rp(p.deliveryFeeTotal);
    $("#vTotal").textContent = rp(p.totalPrice);
    $("#batas").textContent = p.cutoffAt ? `Batas pesan: ${formatTanggal(p.cutoffAt, "waktu")} WIB.` : "";
    const alasan = p.promo && p.promo.reason;
    $("#promoErr").hidden = !alasan;
    $("#promoErr .msg").textContent = alasan || "";
    return true;
}

async function hitung() {
    const ini = ++nomor;
    const body = badan();
    $("#kirim").disabled = true;
    if (!lengkap(body)) {
        $("#jadwalBox").hidden = true;
        $("#luarJangkau").hidden = true;
        $("#infoJarak").textContent = "";
        $("#rincian").hidden = true;
        $("#kosongHarga").hidden = false;
        const k = kurang(body);
        $("#kosongHarga").textContent = k.length
            ? `Lengkapi dulu: ${k.join(", ")}.`
            : "Lengkapi pilihan di atas untuk melihat harga.";
        return;
    }
    try {
        const { data } = await api("/subscriptions/preview", { method: "POST", body });
        if (ini !== nomor) return;
        galat("");
        showIssues($("#form"), null, FIELD_CHECKOUT);
        $("#kirim").disabled = !tampilHarga(data, body.isDelivery);
    } catch (error) {
        if (ini !== nomor) return;
        $("#rincian").hidden = true;
        $("#kosongHarga").hidden = false;
        galat(pesanIsian(error));
    }
}

function pesanIsian(error) {
    const aktif = document.activeElement;
    const teks = pesanForm($("#form"), error, FIELD_CHECKOUT);
    if (aktif && aktif !== document.body && document.contains(aktif)) aktif.focus();
    return teks;
}

const tunda = () => {
    clearTimeout(timer);
    timer = setTimeout(hitung, 350);
};

function mulaiPeta(titik) {
    const kendali = pasangPeta($("#peta"), {
        titik,
        label: "Peta titik pengantaran. Ketuk untuk menaruh pin.",
        onPilih: baru => {
            pin = baru;
            tunda();
        },
    });
    pin = kendali.ambilTitik();
}

async function muatHari() {
    const dipilih = new Set(semua("hari"));
    const { data: jadwal } = await api(`/packages/${paket.id}/schedules`, { auth: false });
    const terbit = jadwal.filter(j => j.isPublished && j.date > hariIni());
    $("#hari").replaceChildren(
        ...terbit.map(j => {
            return chip(
                "hari",
                j.id,
                `${formatTanggal(j.date, "hari")} · ${j.deliveryTime.time}`,
                dipilih.has(j.id),
                "checkbox",
            );
        }),
    );
    $("#hintHari").textContent = terbit.length ? "" : "Belum ada menu terbit untuk dipilih harian.";
}

async function muat() {
    try {
        if (!idPaket) return galat("Paket tidak tersedia. Pilih paket lain dari halaman Paket.");
        try {
            ({ data: paket } = await api(`/packages/${encodeURIComponent(idPaket)}`, { auth: false }));
        } catch (error) {
            if (error instanceof ApiError && (error.status === 404 || error.status === 400))
                return galat("Paket tidak tersedia. Pilih paket lain dari halaman Paket.");
            throw error;
        }
        $("#namaPaket").textContent = paket.name;
        document.title = `Pesan ${paket.name} · LAHAP`;
        $("#periode").replaceChildren(...paket.periods.map((p, i) => chip("periode", p, p, i === 0)));
        $("#waktu").replaceChildren(
            ...paket.deliveryTimes.map(t => {
                const item = waktu(t);
                return chip("waktu", item, t.range ? `${t.range} · ${item}` : item, true, "checkbox");
            }),
        );
        $("#mulai").min = tambahHari(hariIni(), 1);
        $("#mulai").value = tambahHari(senin(hariIni()), 7);
        $("#penerima").value = (currentUser() && currentUser().name) || "";
        const [, profil] = await Promise.all([muatHari(), api("/me").catch(() => null)]);
        let titik = null;
        if (profil) {
            if (profil.data.address) $("#alamat").value = profil.data.address;
            if (profil.data.latitude != null && profil.data.longitude != null)
                titik = { lat: Number(profil.data.latitude), lng: Number(profil.data.longitude) };
        }
        mulaiPeta(titik);
        aturPeriode();
        tunda();
    } catch (error) {
        galat(errorMessage(error));
    }
}

$("#form").addEventListener("input", () => {
    aturPeriode();
    tunda();
});
$("#form").addEventListener("change", () => {
    aturPeriode();
    tunda();
});
$("#pakai").onclick = () => {
    if (!$("#promo").value.trim()) return $("#promo").focus();
    hitung();
};
$("#form").addEventListener("submit", async event => {
    event.preventDefault();
    const body = badan();
    if (!lengkap(body)) return;
    $("#kirim").disabled = true;
    galat("");
    try {
        const { data } = await api("/subscriptions", { method: "POST", body });
        const ke = `pesanan.html?id=${data.subscription.id}`;
        if (data.paymentSession) {
            await bayarSnap(data.paymentSession, { onSelesai: () => (location.href = ke) });
            return;
        }
        if (data.payment && data.payment.method === "CASH") return tampilSukses(data, ke);
        toast("Pesanan lunas. Total Rp0.");
        location.href = ke;
    } catch (error) {
        $("#kirim").disabled = false;
        galat(pesanForm($("#form"), error, FIELD_CHECKOUT));
        if (error instanceof ApiError && error.status === 422 && /cut-off|slot is not available/.test(error.message)) {
            try {
                await muatHari();
            } catch {}
            hitung();
        }
    }
});

async function tampilSukses(data, ke) {
    const b = await muatBisnis();
    const alamat = b && b.address ? ` (${b.address})` : "";
    const lihat = el("a", "btn btn-primary", "Lihat Pesanan");
    lihat.href = ke;
    const kembali = el("a", "btn btn-secondary", "Kembali ke Paket");
    kembali.href = "index.html";
    const aksi = el("div", "row");
    aksi.append(lihat, kembali);
    $("#sukses").replaceChildren(
        el("h2", "t-h2", "Pesanan dibuat"),
        el("p", "", `Bayar ${rp(data.subscription.totalPrice)} tunai di kasir${alamat} secepatnya.`),
        el(
            "p",
            "t-small t-muted",
            "Pesanan yang belum dibayar batal otomatis. Admin memverifikasi pembayaranmu di kasir.",
        ),
        aksi,
    );
    $("#form").hidden = true;
    $("#sukses").hidden = false;
    $("#sukses").scrollIntoView({ block: "nearest", behavior: "smooth" });
}

muat();
