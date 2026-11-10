import "../layout/boot.js";
import { api, fetchAll } from "../core/api.js";
import { pasangPeta } from "../features/peta.js";
import { muatBisnis } from "../features/bisnis.js";
import { gambarJangkauan, penandaDapur, radiusJangkauan, titikDapur } from "../features/jangkauan.js";
import { $, el, opsi } from "../ui/dom.js";
import { formatTanggal, hariIni, rp, tambahHari } from "../ui/format.js";
import { periksa, tampilGalat } from "../ui/forms.js";
import { barisHarga } from "../ui/harga.js";
import { renderPager } from "../ui/pager.js";
import { badge, labelMetode } from "../ui/status.js";
import { toast } from "../ui/toast.js";

const galat = (isi, teks) => tampilGalat($("#err"), isi, teks);

const url = new URLSearchParams(location.search);
const userId = url.get("userId");
let namaPaket = new Map(),
    halaman = 1,
    aktif = null;
const paketDari = s => namaPaket.get(s.packageId) || "Paket";

function baris(s) {
    const row = el("div", "invoice");
    const kiri = el("div");
    kiri.append(
        el("p", "t-h3", `${s.user ? s.user.name : s.recipientName} · ${paketDari(s)} · ${s.period}`),
        el(
            "p",
            "t-small t-muted",
            `Penerima ${s.recipientName} · ${formatTanggal(s.startDate)} – ${formatTanggal(s.endDate)} · ${s.purchaseType} · ${s.isDelivery ? "diantar" : "ambil sendiri"} · ${rp(s.totalPrice)}`,
        ),
    );
    const kanan = el("div", "row");
    if (s.needsRefund) kanan.append(el("span", "badge badge--cancel", "Perlu refund"));
    kanan.append(badge(s.displayStatus || s.status));
    const buka = el("button", "btn btn-secondary btn-sm", "Detail");
    buka.type = "button";
    buka.setAttribute("aria-label", `Detail langganan ${s.recipientName}`);
    buka.onclick = () => bukaDetail(s.id);
    kanan.append(buka);
    row.append(kiri, kanan);
    return row;
}

let ke = 0;
async function muat() {
    const ini = ++ke;
    const q = new URLSearchParams({ page: halaman, limit: 20 });
    if (userId) q.set("userId", userId);
    [
        ["status", "fStatus"],
        ["packageId", "fPk"],
        ["purchaseType", "fBeli"],
        ["from", "fDari"],
        ["to", "fSampai"],
    ].forEach(([k, id]) => {
        if ($(`#${id}`).value) q.set(k, $(`#${id}`).value);
    });
    if ($("#fRefund").checked) q.set("needsRefund", "true");
    try {
        const { data, meta } = await api(`/admin/subscriptions?${q}`);
        if (ini !== ke) return;
        $("#list").removeAttribute("aria-busy");
        $("#list").replaceChildren(...data.map(baris));
        $("#kosong").hidden = data.length > 0;
        $("#hasil").textContent = `${meta.total} langganan.`;
        renderPager($("#pager"), meta, p => {
            halaman = p;
            muat();
        });
        if (userId && data[0] && data[0].user)
            $("#filterUserTeks").textContent = `Langganan milik ${data[0].user.name}`;
        galat(null);
    } catch (error) {
        if (ini !== ke) return;
        $("#list").removeAttribute("aria-busy");
        $("#list").replaceChildren();
        galat(error);
    }
}

function tampilDetail(s) {
    aktif = s;
    $("#dJudul").textContent = `${s.user ? s.user.name : s.recipientName} · ${paketDari(s)} · ${s.period}`;
    const meta = [
        ["Status", s.displayStatus ? `${s.status} · ${s.displayStatus}` : s.status],
        ["Periode", `${formatTanggal(s.startDate)} – ${formatTanggal(s.endDate)}`],
        ["Pembelian", s.purchaseType],
        ["Penerima", s.recipientName],
        ["Pengantaran", s.isDelivery ? `Diantar · ${s.deliveryDistanceKm ?? "?"} km` : "Ambil sendiri"],
        ["Dibuat", formatTanggal(s.createdAt)],
    ];
    if (s.user) meta.splice(1, 0, ["Pelanggan", `${s.user.name} · ${s.user.phone}`]);
    if (s.isDelivery && s.deliveryAddress) meta.push(["Alamat", s.deliveryAddress]);
    if (s.notes) meta.push(["Catatan", s.notes]);
    if (s.needsRefund) meta.push(["Refund", "Perlu refund"]);
    $("#dMeta").replaceChildren(...meta.flatMap(([k, v]) => [el("dt", "", k), el("dd", "", v)]));
    const slotCount = (s.orders || []).length;
    const harga = [barisHarga(`${slotCount} porsi × ${rp(s.pricePerPortion)}`, s.foodSubtotal)];
    if (s.tierDiscount > 0) harga.push(barisHarga("Diskon tier", s.tierDiscount, true));
    if (s.promoDiscount > 0) harga.push(barisHarga("Diskon promo", s.promoDiscount, true));
    if (s.isDelivery || s.deliveryFeeTotal > 0)
        harga.push(barisHarga(`Ongkir (${rp(s.deliveryFeePerSlot)} per slot)`, s.deliveryFeeTotal));
    const total = el("div", "price-total");
    total.append(el("span", "", "Total"), el("span", "", rp(s.totalPrice)));
    $("#dHarga").replaceChildren(...harga, total);
    const bayar = s.payments || [];
    $("#dKosongBayar").hidden = bayar.length > 0;
    $("#dBayar").replaceChildren(
        ...bayar.map(p => {
            const r = el("div", "invoice");
            const kiri = el("div");
            kiri.append(
                el("p", "t-h3", rp(p.amount)),
                el(
                    "p",
                    "t-small t-muted",
                    `${labelMetode(p.method)}${p.type === "DELIVERY_SERVICE_UPGRADE" ? " · upgrade pengantaran" : ""} · ${formatTanggal(p.paidAt || p.createdAt)}`,
                ),
            );
            r.append(kiri, badge(p.status));
            return r;
        }),
    );
    const kunci = o => (o.menuSchedule ? `${o.menuSchedule.date} ${o.menuSchedule.deliveryTime.time}` : "");
    const slot = [...(s.orders || [])].sort((a, b) => kunci(a).localeCompare(kunci(b)));
    $("#dSlot").replaceChildren(
        ...slot.map(o => {
            const r = el("div", "slot");
            const kiri = el("div");
            const ms = o.menuSchedule;
            kiri.append(
                el(
                    "p",
                    "t-h3",
                    ms ? `${formatTanggal(ms.date)} · ${ms.deliveryTime.range} ${ms.deliveryTime.time}` : "Slot",
                ),
                el(
                    "p",
                    "t-small t-muted",
                    `${o.menu ? o.menu.name : "Menu"}${o.usesAlternativeMenu ? " (alternatif)" : ""} · ${o.isDelivery ? `diantar${o.courier ? ` oleh ${o.courier.name}` : ""}` : "ambil sendiri"}${o.skipReason ? ` · alasan skip: ${o.skipReason}` : ""}`,
                ),
            );
            r.append(kiri, badge(o.status));
            return r;
        }),
    );
    const ubah = s.deliveryMethodChanges || [];
    $("#dBoxUbah").hidden = ubah.length === 0;
    $("#dUbah").replaceChildren(
        ...ubah.map(c => {
            const r = el("div", "invoice");
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
                    `${c.slotCount} slot · ${rp(c.amount)}${c.refundedAt ? ` · direfund ${formatTanggal(c.refundedAt)}` : ""}`,
                ),
            );
            const kanan = el("div", "row");
            if (c.needsRefund) kanan.append(el("span", "badge badge--cancel", "Perlu refund"));
            kanan.append(badge(c.status));
            r.append(kiri, kanan);
            return r;
        }),
    );
    siapkanUbah(s);
    $("#detail").hidden = false;
}

async function bukaDetail(id) {
    galat(null);
    try {
        tampilDetail((await api(`/admin/subscriptions/${id}`)).data);
        history.replaceState(null, "", `?${new URLSearchParams({ ...(userId ? { userId } : {}), id })}`);
        $("#detail").scrollIntoView();
        $("#tutup").focus();
    } catch (error) {
        galat(error);
    }
}

let petaUbah = null;

function aturLingkaranAdmin(peta, bisnis, paket, maksOverride = null) {
    const dapur = titikDapur(bisnis);
    if (!peta || !dapur) return;
    const radius = radiusJangkauan(bisnis, paket);
    gambarJangkauan(peta, {
        pusat: dapur,
        bebasKm: radius.bebasKm,
        maksKm: maksOverride ?? radius.maksKm,
        legenda: $("#uLegenda"),
        sesuaikan: true,
    });
}

function siapkanUbah(s) {
    const bisa = s.status === "Success" && s.displayStatus !== "Selesai";
    $("#ubah").hidden = !bisa;
    if (!bisa) return;
    const keAntar = !s.isDelivery;
    $("#uJudul").textContent = keAntar ? "Ubah ke diantar" : "Ubah ke ambil sendiri";
    $("#uAlamat").hidden = !keAntar;
    $("#uAddr").value = s.deliveryAddress || "";
    $("#uLat").value = s.deliveryLatitude ?? "";
    $("#uLng").value = s.deliveryLongitude ?? "";
    if (keAntar) {
        muatBisnis().then(bisnis => {
            const dapur = titikDapur(bisnis);
            petaUbah ??= pasangPeta($("#uPeta"), {
                pusat: dapur || undefined,
                titikTetap: penandaDapur(bisnis),
                label: "Peta titik pengantaran. Ketuk untuk memindahkan pin.",
                masukan: { lat: $("#uLat"), lng: $("#uLng") },
                onPilih: () => {
                    $("#uKonfirmasi").hidden = true;
                },
            });
            petaUbah.setTitik(
                s.deliveryLatitude != null && s.deliveryLongitude != null
                    ? { lat: Number(s.deliveryLatitude), lng: Number(s.deliveryLongitude) }
                    : null,
            );
            aturLingkaranAdmin(petaUbah, bisnis, s.package);
        });
    }
    $("#uMulai").value = "";
    $("#uMulai").min = tambahHari(hariIni(), 1);
    $("#fBayar").hidden = !keAntar;
    $("#uBayar").querySelector('option[value="CASH"]').disabled = s.purchaseType !== "Offline";
    $("#uBayar").value = "MIDTRANS";
    $("#uRingkas").hidden = true;
    $("#uKonfirmasi").hidden = true;
}

function bodyUbah() {
    const keAntar = !aktif.isDelivery;
    const body = { isDelivery: keAntar };
    if ($("#uMulai").value) body.effectiveFrom = $("#uMulai").value;
    if (keAntar) {
        body.deliveryAddress = $("#uAddr").value.trim();
        body.deliveryLatitude = Number($("#uLat").value);
        body.deliveryLongitude = Number($("#uLng").value);
    }
    return body;
}

$("#ubah").onsubmit = async event => {
    event.preventDefault();
    const keAntar = !aktif.isDelivery;
    if (keAntar) {
        const lat = Number($("#uLat").value),
            lng = Number($("#uLng").value);
        if (
            !periksa([
                [$("#uAddr"), $("#uAddr").value.trim() !== ""],
                [$("#uLat"), $("#uLat").value !== "" && lat >= -90 && lat <= 90],
                [$("#uLng"), $("#uLng").value !== "" && lng >= -180 && lng <= 180],
            ])
        )
            return;
    }
    $("#uCek").disabled = true;
    galat(null);
    try {
        const { data } = await api(`/admin/subscriptions/${aktif.id}/delivery-method/preview`, {
            method: "POST",
            body: bodyUbah(),
        });
        if (data.delivery && data.delivery.maxDistanceKm != null && petaUbah) {
            muatBisnis().then(bisnis =>
                aturLingkaranAdmin(petaUbah, bisnis, aktif.package, data.delivery.maxDistanceKm),
            );
        }
        const teks = [`${data.slotCount} slot mulai ${formatTanggal(data.effectiveFrom)}.`];
        if (data.delivery && !data.delivery.available)
            teks.push(
                `Jarak ${data.delivery.distanceKm} km melebihi batas ${data.delivery.maxDistanceKm} km, jadi tidak bisa diantar.`,
            );
        else if (data.toDelivery)
            teks.push(
                data.amount > 0
                    ? `Ongkir ${rp(data.deliveryFeePerSlot)} per slot. Pelanggan membayar ${rp(data.amount)}.`
                    : "Dalam radius gratis ongkir, langsung berlaku tanpa pembayaran.",
            );
        else
            teks.push(
                data.amount > 0
                    ? `Ongkir ${rp(data.amount)} perlu direfund ke pelanggan (dikonfirmasi di halaman Pembayaran).`
                    : "Tidak ada ongkir yang perlu direfund.",
            );
        $("#uRingkas").textContent = teks.join(" ");
        $("#uRingkas").hidden = false;
        $("#uKonfirmasi").hidden = Boolean(data.delivery && !data.delivery.available) || data.slotCount === 0;
        $("#uKonfirmasi").dataset.amount = data.amount;
    } catch (error) {
        galat(error);
    } finally {
        $("#uCek").disabled = false;
    }
};

$("#uKonfirmasi").onclick = async () => {
    const body = bodyUbah();
    if (body.isDelivery && Number($("#uKonfirmasi").dataset.amount) > 0) body.paymentMethod = $("#uBayar").value;
    if (
        !confirm(
            body.isDelivery
                ? "Ubah langganan ini ke diantar?"
                : "Ubah langganan ini ke ambil sendiri? Berlaku langsung.",
        )
    )
        return;
    $("#uKonfirmasi").disabled = true;
    galat(null);
    try {
        const { data } = await api(`/admin/subscriptions/${aktif.id}/delivery-method`, { method: "POST", body });
        if (data.paymentSession && data.paymentSession.redirectUrl) {
            toast("Perubahan menunggu pembayaran pelanggan.");
            $("#uRingkas").replaceChildren(
                "Kirim tautan pembayaran ini ke pelanggan: ",
                Object.assign(el("a", "", data.paymentSession.redirectUrl), {
                    href: data.paymentSession.redirectUrl,
                    target: "_blank",
                    rel: "noopener",
                }),
            );
            $("#uKonfirmasi").hidden = true;
            return;
        }
        toast(
            data.payment && data.payment.status === "Pending"
                ? "Perubahan menunggu pembayaran tunai. Verifikasi di halaman Pembayaran."
                : "Metode pengantaran diubah.",
        );
        await bukaDetail(aktif.id);
        muat();
    } catch (error) {
        galat(error);
    } finally {
        $("#uKonfirmasi").disabled = false;
    }
};
$("#ubah").addEventListener("input", () => {
    $("#uKonfirmasi").hidden = true;
});
$("#tutup").onclick = () => {
    $("#detail").hidden = true;
    aktif = null;
    history.replaceState(null, "", userId ? `?userId=${userId}` : location.pathname);
};

["fStatus", "fPk", "fBeli", "fDari", "fSampai", "fRefund"].forEach(id =>
    $(`#${id}`).addEventListener("change", () => {
        halaman = 1;
        muat();
    }),
);
if (userId) {
    $("#filterUser").hidden = false;
    $("#filterUserTeks").textContent = "Langganan satu pelanggan";
}
(async () => {
    try {
        const data = await fetchAll("/admin/packages");
        namaPaket = new Map(data.map(p => [p.id, p.name]));
        $("#fPk").append(...data.map(p => opsi(p.id, p.name)));
    } catch (error) {
        galat(error);
    }
    muat();
    if (url.get("id")) bukaDetail(url.get("id"));
})();
