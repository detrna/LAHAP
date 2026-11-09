import { $, el } from "../../ui/dom.js";
import { formatTanggal, rp } from "../../ui/format.js";

export const waktu = item => item.time ?? item;

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

export function tampilHarga(p, antar) {
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
