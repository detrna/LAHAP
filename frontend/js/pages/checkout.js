import "../layout/boot.js";
import { api, ApiError } from "../core/api.js";
import { errorMessage } from "../core/errors.js";
import { currentUser } from "../core/session.js";
import { bayarSnap } from "../features/pelanggan.js";
import { pasangPeta } from "../features/peta.js";
import { $ } from "../ui/dom.js";
import { awalMinggu, hariIni, tambahHari } from "../ui/format.js";
import { pesanForm, showIssues, tampilGalat } from "../ui/forms.js";
import { toast } from "../ui/toast.js";
import { isiKalender } from "./checkout/kalender.js";
import { tampilHarga, waktu } from "./checkout/rincian.js";
import { tampilSukses } from "./checkout/sukses.js";

const idPaket = new URLSearchParams(location.search).get("paket");
const awalBulan = tanggal => `${tanggal.slice(0, 8)}01`;

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
    const slot = semua("hari").length;
    $("#jumlahHari").textContent = slot ? `${slot} slot dipilih` : "";
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
        body.periodStart = !mulai ? "" : periode === "Mingguan" ? awalMinggu(mulai) : awalBulan(mulai);
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
    const ada = isiKalender({ jadwal: terbit, waktu: paket.deliveryTimes, dipilih }) > 0;
    $("#kalender").hidden = !ada;
    $("#hintHari").textContent = ada ? "" : "Belum ada menu terbit untuk dipilih harian.";
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
        $("#mulai").value = tambahHari(awalMinggu(hariIni()), 7);
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

muat();
