const WIB = { timeZone: "Asia/Jakarta" };
const rp = n => "Rp" + Math.round(n).toLocaleString("id-ID");
const tgl = (s, opsi = { day: "numeric", month: "short", year: "numeric" }) =>
    new Date(s.length === 10 ? `${s}T00:00:00+07:00` : s).toLocaleDateString("id-ID", { ...WIB, ...opsi });
const jam = s => new Date(s).toLocaleTimeString("id-ID", { ...WIB, hour: "2-digit", minute: "2-digit" });
const hariIni = () => new Date().toLocaleDateString("sv-SE", WIB);
const tambahHari = (tanggal, n) => {
    const d = new Date(`${tanggal}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
};

const BADGE = {
    Terjadwal: "badge--prepared",
    Disiapkan: "badge--prepared",
    Diantar: "badge--delivering",
    "Siap Diambil": "badge--ready",
    Selesai: "badge--success",
    Dilewati: "badge--expire",
    Pending: "badge--pending",
    Success: "badge--success",
    Expire: "badge--expire",
    Dibatalkan: "badge--cancel",
    Aktif: "badge--success",
    "Akan Datang": "badge--prepared",
    Refund: "badge--cancel",
};

function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

const badge = (teks, label) => el("span", `badge ${BADGE[teks] || "badge--expire"}`, label || teks);

const LABEL_BAYAR = { Pending: "Menunggu", Success: "Lunas", Expire: "Kedaluwarsa", Refund: "Dikembalikan" };
const labelStatusBayar = status => LABEL_BAYAR[status] || status;

const METODE_MIDTRANS = {
    QRIS: "QRIS",
    BANK_TRANSFER: "Transfer bank",
    GOPAY: "GoPay",
    SHOPEEPAY: "ShopeePay",
    CREDIT_CARD: "Kartu kredit",
    CSTORE: "Gerai retail",
};

function labelMetode(method) {
    if (method === "CASH") return "Tunai";
    if (method === "FREE") return "Gratis (total Rp0)";
    if (method === "MIDTRANS") return "Non-tunai (belum dipilih)";
    if (method && method.startsWith("MIDTRANS_")) return METODE_MIDTRANS[method.slice(9)] || "Non-tunai";
    return method || "";
}

const labelJenisBayar = type => (type === "SUBSCRIPTION" ? "Pembayaran pesanan" : "Tambah ongkir");

function bisaBatal(s) {
    return (s.status === "Pending" || s.status === "Success") && hariIni() < s.startDate;
}

const bisaSkip = o => o.status === "Terjadwal" || o.status === "Disiapkan";

function langkahSlot(o) {
    const langkah = o.isDelivery ? ["Terjadwal", "Disiapkan", "Diantar", "Selesai"] : ["Terjadwal", "Disiapkan", "Siap Diambil", "Selesai"];
    const sekarang = langkah.indexOf(o.status);
    const daftar = el("ol", "steps");
    langkah.forEach((nama, i) => {
        const li = el("li", `step${i < sekarang ? " is-done" : i === sekarang ? " is-current" : ""}`, nama);
        if (i === sekarang) li.setAttribute("aria-current", "step");
        daftar.append(li);
    });
    return daftar;
}

function panelKonfirmasi(wadah, { judul, teks, alasan = false, tombol, bahaya = false, onKirim }) {
    const lama = wadah.querySelector(":scope > .panel-konfirmasi");
    if (lama) {
        lama.remove();
        return;
    }
    const panel = el("div", "alert alert--warning panel-konfirmasi stack");
    panel.setAttribute("role", "group");
    panel.setAttribute("aria-label", judul);
    panel.append(el("span", "alert-title", judul), el("span", "", teks));
    let isian = null;
    if (alasan) {
        const field = el("div", "field");
        const label = el("label", "", "Alasan (opsional)");
        isian = el("textarea", "textarea");
        isian.maxLength = 500;
        isian.id = `alasan-${Math.random().toString(36).slice(2, 8)}`;
        label.htmlFor = isian.id;
        field.append(label, isian);
        panel.append(field);
    }
    const galat = el("p", "error-msg");
    galat.hidden = true;
    const baris = el("div", "row");
    const kirim = el("button", `btn ${bahaya ? "btn-danger" : "btn-primary"} btn-sm`, tombol);
    kirim.type = "button";
    const batal = el("button", "btn btn-ghost btn-sm", "Batal");
    batal.type = "button";
    batal.onclick = () => panel.remove();
    kirim.onclick = async () => {
        kirim.disabled = true;
        batal.disabled = true;
        galat.hidden = true;
        try {
            await onKirim(isian ? isian.value.trim() : "");
            panel.remove();
        } catch (error) {
            galat.textContent = errorMessage(error);
            galat.hidden = false;
            kirim.disabled = false;
            batal.disabled = false;
        }
    };
    baris.append(kirim, batal);
    panel.append(galat, baris);
    wadah.append(panel);
    (isian || kirim).focus();
}

function hitungMundur(elemen, expiresAt, onHabis) {
    const akhir = new Date(expiresAt).getTime();
    let timer = null;
    const tampil = () => {
        const sisa = Math.max(0, Math.round((akhir - Date.now()) / 1000));
        elemen.textContent = `Bayar dalam ${String(Math.floor(sisa / 60)).padStart(2, "0")}:${String(sisa % 60).padStart(2, "0")}`;
        if (sisa === 0) {
            clearInterval(timer);
            if (onHabis) onHabis();
        }
    };
    tampil();
    timer = setInterval(tampil, 1000);
    return () => clearInterval(timer);
}

let snapSiap = null;
function muatSnap() {
    if (window.snap) return Promise.resolve();
    if (snapSiap) return snapSiap;
    snapSiap = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = MIDTRANS_SNAP_URL;
        script.dataset.clientKey = MIDTRANS_CLIENT_KEY;
        script.onload = () => resolve();
        script.onerror = () => {
            snapSiap = null;
            script.remove();
            reject(new Error("snap gagal dimuat"));
        };
        document.head.append(script);
    });
    return snapSiap;
}

async function bayarSnap(sesi, { onSelesai } = {}) {
    const selesai = () => {
        if (onSelesai) onSelesai();
    };
    if (!MIDTRANS_CLIENT_KEY) {
        location.href = sesi.redirectUrl;
        return;
    }
    try {
        await muatSnap();
    } catch {
        location.href = sesi.redirectUrl;
        return;
    }
    window.snap.pay(sesi.snapToken, {
        onSuccess: () => {
            toast("Pembayaran diterima. Status pesanan diperbarui sebentar lagi.");
            selesai();
        },
        onPending: () => {
            toast("Selesaikan pembayaran sesuai instruksi Midtrans.");
            selesai();
        },
        onError: () => {
            toast("Pembayaran gagal. Coba lagi.", "error");
            selesai();
        },
        onClose: () => {
            toast("Pembayaran belum selesai. Kamu bisa melanjutkannya dari halaman pesanan.");
            selesai();
        },
    });
}

function namaHari(tanggal) {
    return tgl(tanggal, { weekday: "long", day: "numeric", month: "short" });
}
