import { ApiError } from "./api.js";

const MUAT_ULANG = "Muat ulang halaman lalu coba lagi.";
const PESAN_KODE = {
    INVALID_CREDENTIALS: "Nomor HP atau email, atau password salah.",
    INVALID_PHONE_NUMBER: "Nomor HP tidak valid.",
    UNKNOWN_ALLERGY: "Ada alergi yang tidak dikenal. " + MUAT_ULANG,
    UNKNOWN_INGREDIENT: "Ada bahan yang sudah tidak ada. " + MUAT_ULANG,
    UNKNOWN_MENU: "Ada menu yang sudah tidak ada. " + MUAT_ULANG,
    PAYLOAD_TOO_LARGE: "Foto terlalu besar.",
    UNSUPPORTED_MEDIA_TYPE: "Gunakan foto JPEG, PNG, atau WebP.",
    INVALID_STOCK_IMAGE: "Foto tidak bisa dibaca. Coba foto lain.",
    LOW_CONFIDENCE: "Isi wadah kurang jelas. Foto lebih dekat dengan cahaya cukup.",
    CONTAINER_NOT_VISIBLE: "Wadah bahan ini tidak terlihat di foto.",
    STOCK_LEVEL_ESTIMATOR_PROVIDER_ERROR: "Perkiraan gagal. Coba lagi.",
    STOCK_LEVEL_ESTIMATION_FAILED: "Perkiraan gagal. Coba lagi.",
    INVALID_RECEIPT_IMAGE: "Foto ini tidak terbaca sebagai struk. Coba foto struk yang lebih jelas.",
    LOW_CONFIDENCE_RECEIPT: "Struk kurang jelas untuk dibaca. Foto ulang dengan cahaya cukup dan tidak miring.",
    NO_RECEIPT_ITEMS_FOUND: "Tidak ada barang di struk yang cocok dengan daftar bahan.",
    RECEIPT_EXTRACTOR_PROVIDER_ERROR: "Layanan pembaca struk sedang bermasalah. Coba lagi beberapa saat lagi.",
    RECEIPT_EXTRACTION_FAILED: "Struk gagal dibaca. Coba lagi.",
    ORDER_NOT_FOUND: "Slot pesanan tidak ditemukan. " + MUAT_ULANG,
    SUBSCRIPTION_NOT_FOUND: "Pesanan tidak ditemukan. " + MUAT_ULANG,
    PAYMENT_NOT_FOUND: "Pembayaran tidak ditemukan. " + MUAT_ULANG,
    DELIVERY_METHOD_CHANGE_NOT_FOUND: "Perubahan metode tidak ditemukan. " + MUAT_ULANG,
    INGREDIENT_NOT_FOUND: "Bahan tidak ditemukan. " + MUAT_ULANG,
    ALLERGY_NOT_FOUND: "Alergi tidak ditemukan. " + MUAT_ULANG,
    PACKAGE_NOT_FOUND: "Paket tidak ditemukan. " + MUAT_ULANG,
    MENU_NOT_FOUND: "Menu tidak ditemukan. " + MUAT_ULANG,
    MENU_SCHEDULE_NOT_FOUND: "Jadwal tidak ditemukan. " + MUAT_ULANG,
    TIER_NOT_FOUND: "Tier tidak ditemukan. " + MUAT_ULANG,
    PROMO_CODE_NOT_FOUND: "Kode promo tidak ditemukan. " + MUAT_ULANG,
    MESSAGE_TEMPLATE_NOT_FOUND: "Template tidak ditemukan. " + MUAT_ULANG,
    NOTIFICATION_NOT_FOUND: "Notifikasi tidak ditemukan. " + MUAT_ULANG,
    ANNOUNCEMENT_NOT_FOUND: "Pengumuman tidak ditemukan. " + MUAT_ULANG,
    USER_NOT_FOUND: "Pengguna tidak ditemukan. " + MUAT_ULANG,
    TARGET_NOT_FOUND: "Penerima tidak ditemukan atau akunnya tidak aktif.",
    BUSINESS_NOT_CONFIGURED: "Pengaturan usaha belum diisi. Hubungi admin.",
    SERVICE_UNAVAILABLE: "Server sedang sibuk. Coba lagi sebentar.",
};
const PESAN_SERVER = [
    ["cut-off has passed", "Batas waktu sudah lewat (pukul 23.59 sehari sebelum hari layanan pertama)."],
    ["current password is incorrect", "Password lama salah."],
    ["at least one active admin is required", "Harus ada minimal satu admin aktif."],
    ["slot changed, try again", "Data baru saja berubah. " + MUAT_ULANG],
    ["slots changed, try again", "Data baru saja berubah. " + MUAT_ULANG],
    ["subscription changed, try again", "Data baru saja berubah. " + MUAT_ULANG],
    ["no slots to order", "Tidak ada jadwal yang bisa dipesan pada pilihan ini."],
    ["slot is not available", "Ada jadwal yang sudah tidak tersedia. Pilih ulang jadwalnya."],
    ["package is not available", "Paket ini sedang tidak dijual."],
    ["package does not offer this period", "Paket ini tidak menyediakan periode tersebut."],
    [/^package does not offer delivery time /, "Paket ini tidak menyediakan waktu makan tersebut."],
    ["delivery needs a delivery point", "Pilih titik antar di peta."],
    ["delivery is not available for this address", "Alamat ini di luar jangkauan antar. Pilih ambil sendiri."],
    ["online orders cannot be paid in cash", "Pesanan online tidak bisa dibayar tunai."],
    ["cash orders are paid at the cashier", "Pesanan tunai dibayar di kasir."],
    ["cash payments are paid at the cashier", "Pembayaran tunai dibayar di kasir."],
    ["promo code has already been used", "Kamu sudah pernah memakai kode promo ini."],
    ["promo code quota is exhausted", "Kuota kode promo sudah habis."],
    ["promo code no longer exists", "Kode promo sudah tidak ada."],
    ["tier no longer exists", "Tier sudah tidak ada. " + MUAT_ULANG],
    ["payment session has expired", "Waktu pembayaran sudah habis."],
    ["payment has not been paid", "Pembayaran ini belum lunas."],
    ["payment is not a pending cash payment", "Pembayaran ini bukan pembayaran tunai yang menunggu."],
    ["subscription is not waiting for payment", "Pesanan ini tidak sedang menunggu pembayaran."],
    ["subscription is not paid", "Pesanan ini belum lunas."],
    ["subscription cannot be cancelled", "Pesanan ini sudah tidak bisa dibatalkan."],
    ["subscription does not need a refund", "Pesanan ini tidak perlu refund."],
    ["slot is not skippable", "Slot ini sudah tidak bisa dilewati karena makanannya sudah disiapkan."],
    ["slot is past food preparation", "Makanan sudah ditandai siap, menu tidak bisa diganti lagi."],
    ["schedule has no alternative menu", "Jadwal ini belum punya menu alternatif."],
    ["schedule has no primary menu", "Jadwal ini belum punya menu utama."],
    ["slot is not out for delivery", "Slot ini tidak sedang diantar."],
    ["slot is not ready for pick-up", "Slot ini belum siap diambil."],
    [/^slot cannot move from /, "Status slot tidak bisa diubah ke status itu."],
    ["no slot can switch method", "Tidak ada slot yang bisa diubah metodenya."],
    ["another delivery method change is waiting for payment", "Masih ada perubahan metode yang menunggu pembayaran."],
    ["delivery method change can no longer be applied", "Perubahan metode ini sudah tidak bisa diterapkan."],
    ["delivery method change does not need a refund", "Perubahan metode ini tidak perlu refund."],
    ["delivery method change is not waiting for payment", "Perubahan metode ini tidak sedang menunggu pembayaran."],
    ["courier is not an active courier", "Kurir yang dipilih tidak aktif."],
    ["cook is not an active kitchen staff", "Koki yang dipilih bukan staf dapur aktif."],
    ["customer account is inactive", "Akun pelanggan ini tidak aktif."],
    ["customer is not churned", "Pelanggan ini belum termasuk churn."],
    ["template needs a promo code", "Template ini memakai {kode_promo}, jadi isi kode promonya."],
    ["meal time is still used by schedules with orders", "Waktu makan ini masih dipakai jadwal yang sudah dipesan."],
    [
        "a schedule already exists for this package, date and meal time",
        "Jadwal untuk paket, tanggal, dan waktu makan ini sudah ada.",
    ],
    ["schedule has active orders", "Jadwal ini sudah punya pesanan."],
    ["menu is used by schedules", "Menu ini masih dipakai di jadwal."],
    ["package is used by subscriptions, deactivate it instead", "Paket ini sudah pernah dipesan. Nonaktifkan saja."],
    ["promo code is already used", "Kode promo ini sudah dipakai kode lain."],
    [
        "promo code is used by orders that are waiting for payment",
        "Kode promo masih dipakai pesanan yang menunggu pembayaran.",
    ],
    ["message template name is already used", "Nama template sudah dipakai."],
    ["tier name is already used", "Nama tier sudah dipakai."],
    ["required subscription days is already used by another tier", "Jumlah hari ini sudah dipakai tier lain."],
    [/^allergy already exists: "(.*)"$/, m => `Alergi "${m[1]}" sudah ada.`],
    [/^ingredient already exists: "(.*)"$/, m => `Bahan "${m[1]}" sudah ada.`],
    [/^ingredient is used by menus: (.+)$/, m => `Bahan ini masih dipakai menu: ${m[1]}.`],
    [
        "ingredient is used by menus, remove it from them first",
        "Bahan ini masih dipakai menu. Hapus dulu dari resepnya.",
    ],
    ["too many open event streams, try again later", "Server sedang sibuk. Coba lagi sebentar."],
];

function pesanServer(message) {
    for (const [cocok, teks] of PESAN_SERVER) {
        if (typeof cocok === "string") {
            if (cocok === message) return teks;
            continue;
        }
        const hasil = cocok.exec(message);
        if (hasil) return typeof teks === "function" ? teks(hasil) : teks;
    }
    return null;
}

export function errorMessage(error) {
    if (!(error instanceof ApiError)) {
        if (error && error.name === "AbortError") return "Server terlalu lama merespons. Coba lagi sebentar.";
        return "Tidak bisa terhubung ke server. Periksa koneksi atau alamat API.";
    }
    if (error.code === "TOO_MANY_REQUESTS" || error.status === 429) {
        const tunggu = error.retryAfter;
        if (!tunggu) return "Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.";
        return tunggu >= 90
            ? `Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil(tunggu / 60)} menit.`
            : `Terlalu banyak percobaan. Coba lagi dalam ${tunggu} detik.`;
    }
    if (PESAN_KODE[error.code]) return PESAN_KODE[error.code];
    const terjemahan = pesanServer(error.message);
    if (terjemahan) return terjemahan;
    if (error.code === "CONFLICT" && /^(phone|email) is already registered$/.test(error.message))
        return "Nomor HP atau email sudah terdaftar.";
    if (error.code === "VALIDATION_ERROR" && error.issues.length) return issuesText(error.issues);
    if (error.status >= 500) return "Server sedang bermasalah. Coba lagi beberapa saat lagi.";
    if (error.status === 403) return "Kamu tidak punya akses untuk tindakan ini.";
    return error.message === "request failed" ? "Permintaan gagal. Coba lagi." : error.message;
}

const PESAN_ISSUE = [
    ["must be after today", "Pilih tanggal setelah hari ini."],
    ["must not be after the order's end date", "Tanggal tidak boleh melewati akhir pesanan."],
    ["must match password", "Password tidak sama."],
    ["must differ from the current password", "Password baru harus berbeda dari password lama."],
    ["must be at most 72 bytes", "Password terlalu panjang. Kurangi huruf khusus atau emoji."],
    [/^must be an Indonesian number/, "Nomor HP tidak valid. Contoh: 0812…"],
    ["must be a real calendar date", "Tanggal tidak valid."],
    ["must not be before from", "Tanggal akhir tidak boleh sebelum tanggal mulai."],
    ["must be after startAt", "Harus setelah tanggal mulai."],
    ["must not be greater than deliveryMaxDistance", "Tidak boleh lebih dari jarak antar maksimal."],
    ["latitude and longitude must be sent together", "Pilih titik di peta."],
    ["deliveryLatitude and deliveryLongitude must be sent together", "Pilih titik antar di peta."],
    ["latitude and longitude must both be null to clear them", "Hapus titik peta sepenuhnya atau pilih ulang."],
    ["is required for delivery", "Wajib diisi untuk pesanan antar."],
    ["is required", "Wajib diisi."],
    ["is optional", "Tidak perlu diisi."],
    ["must change at least one field", "Belum ada yang diubah."],
    ["must not contain duplicates", "Ada pilihan yang dobel."],
    ["must not move two times to the same time", "Dua waktu makan tidak boleh dipindah ke jam yang sama."],
    ["cannot be sent together with deliveryTimes", "Tidak bisa dipakai bersama pilihan waktu makan."],
    ["send either ids or packageId with from and to", "Pilih slot tertentu atau paket dengan rentang tanggal."],
    ["must be a finite number", "Harus berupa angka."],
    [/^must be 1-50 characters/, "1–50 karakter: huruf besar, angka, - atau _."],
    ["photo does not exist", "Foto tidak ditemukan. Unggah ulang fotonya."],
    [
        /^unknown placeholders (.+?); allowed: (.+)$/,
        m => `Placeholder tidak dikenal: ${m[1]}. Yang bisa dipakai: ${m[2]}.`,
    ],
    ["is already one of the package's meal times", "Waktu makan ini sudah ada di paket."],
    ["must be one of the package's meal times", "Pilih salah satu waktu makan paket."],
];
const SATUAN_ISSUE = { characters: "karakter", items: "pilihan", bytes: "byte", entries: "isian" };
const LABEL_FIELD = {
    phone: "Nomor HP",
    password: "Password",
    confirmPassword: "Ulangi password",
    currentPassword: "Password lama",
    newPassword: "Password baru",
    name: "Nama",
    email: "Email",
    address: "Alamat",
    allergyIds: "Alergi",
    allergyNote: "Catatan alergi",
    recipientName: "Nama penerima",
    deliveryAddress: "Alamat antar",
    promoCode: "Kode promo",
    notes: "Catatan",
    note: "Catatan",
    photoKey: "Foto",
};

export function pesanIssue(issue) {
    const message = issue.message || "";
    for (const [cocok, teks] of PESAN_ISSUE) {
        const hasil = typeof cocok === "string" ? (cocok === message ? [message] : null) : cocok.exec(message);
        if (hasil) return typeof teks === "function" ? teks(hasil) : teks;
    }
    const ukuran = /^Too (small|big): expected (\w+) to (?:have|be) (>=|<=|>|<|exactly )(-?[\d.]+)(?: (\w+))?$/.exec(
        message,
    );
    if (ukuran) {
        const [, arah, asal, tanda, angkaTeks, satuan] = ukuran;
        let angka = Number(angkaTeks);
        if (tanda === ">") angka += asal === "number" ? 0 : 1;
        if (tanda === "<") angka -= asal === "number" ? 0 : 1;
        const kata = satuan ? ` ${SATUAN_ISSUE[satuan] || satuan}` : "";
        if (tanda === "exactly ") return `Harus tepat ${angka}${kata}.`;
        if (asal === "string" && arah === "small" && angka === 1) return "Wajib diisi.";
        if (asal === "array" && arah === "small" && angka === 1) return "Pilih minimal 1.";
        if (asal === "number" && (tanda === ">" || tanda === "<"))
            return arah === "small" ? `Harus lebih dari ${angka}.` : `Harus kurang dari ${angka}.`;
        return arah === "small" ? `Minimal ${angka}${kata}.` : `Maksimal ${angka}${kata}.`;
    }
    if (issue.code === "invalid_type")
        return /received undefined$/.test(message) ? "Wajib diisi." : "Isian tidak valid.";
    if (issue.code === "invalid_value") return "Pilihan tidak valid.";
    if (issue.code === "invalid_format" || /^Invalid (email address|UUID)/.test(message)) {
        if (/email/.test(message)) return "Format email tidak valid.";
        if (/UUID/.test(message)) return "Pilihan tidak valid.";
        return "Format tidak valid.";
    }
    if (issue.code === "photo_not_found") return "Foto tidak ditemukan. Unggah ulang fotonya.";
    if (issue.code === "end_before_start") return "Tanggal akhir harus setelah tanggal mulai.";
    if (issue.code === "required") return "Wajib diisi.";
    return message;
}

export function issuesText(issues) {
    return issues
        .map(i => {
            const teks = pesanIssue(i);
            if (!i.path) return teks;
            const baris = /^items\.(\d+)\.(\w+)/.exec(i.path);
            if (baris) return `Baris ${Number(baris[1]) + 1}, ${LABEL_FIELD[baris[2]] || baris[2]}: ${teks}`;
            const akar = i.path.split(".")[0];
            return `${LABEL_FIELD[akar] || i.path}: ${teks}`;
        })
        .join(" ");
}
