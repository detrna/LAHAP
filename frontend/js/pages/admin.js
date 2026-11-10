import "../layout/boot.js";
import { api, fetchAll } from "../core/api.js";
import { $, el } from "../ui/dom.js";
import { angka, formatTanggal, hariIni, rp, tambahHari } from "../ui/format.js";
import { tampilGalat } from "../ui/forms.js";
import { barisHarga } from "../ui/harga.js";
import { peringatan } from "../ui/peringatan.js";
import { labelMetode, peringatanTunai } from "../ui/status.js";
import { toast } from "../ui/toast.js";

const galat = (isi, teks) => tampilGalat($("#err"), isi, teks);

async function dashboard() {
    const { data } = await api(`/admin/dashboard?period=${$("#periode").value}`);
    $("#kPemasukan").textContent = rp(data.income.totalRevenue);
    $("#kPesanan").textContent = data.income.orderCount;
    $("#kBahan").textContent = data.shortages.length;
    $("#kosongTop").hidden = data.topMenus.length > 0;
    $("#top").replaceChildren(
        ...data.topMenus.map(m => {
            const r = el("div", "invoice");
            r.append(el("p", "t-h3", m.name), el("p", "t-h3", `${m.portions} porsi`));
            return r;
        }),
    );
    $("#kosongKurang").hidden = data.shortages.length > 0;
    $("#kurang").replaceChildren(
        ...data.shortages.map(s => {
            const r = el("div", "invoice");
            r.append(
                el("p", "t-h3", s.name),
                el(
                    "p",
                    "t-small t-muted",
                    `Kurang ${angka(s.shortageQuantity)} ${s.unit} (stok ${angka(s.currentStock)}, butuh ${angka(s.requiredQuantity)})`,
                ),
            );
            return r;
        }),
    );
    const belum = data.unreadNotificationCount || 0;
    $("#belumDibaca").hidden = belum === 0;
    $("#belumDibacaTeks").textContent = `${belum} notifikasi belum dibaca.`;
}

const ringkas = (label, x) => {
    const r = el("div", "invoice");
    const kiri = el("div");
    kiri.append(
        el("p", "t-h3", label),
        el(
            "p",
            "t-small t-muted",
            `${x.orderCount} pesanan · makanan ${rp(x.foodRevenue)} · ongkir ${rp(x.deliveryRevenue)}`,
        ),
    );
    r.append(kiri, el("p", "t-h3", rp(x.totalRevenue)));
    return r;
};
async function laporan() {
    const { data } = await api(`/admin/reports/income?period=${$("#periode").value}`);
    const t = data.total;
    $("#rentang").textContent =
        data.from === data.to
            ? formatTanggal(data.from, "pendek")
            : `${formatTanggal(data.from, "pendek")} – ${formatTanggal(data.to, "pendek")}`;
    const total = el("div", "price-total");
    total.append(el("span", "", "Pemasukan bersih"), el("span", "", rp(t.totalRevenue)));
    $("#lapTotal").replaceChildren(
        barisHarga(`Makanan (${t.orderCount} pesanan)`, t.foodRevenue),
        barisHarga("Diskon tier", t.tierDiscount, true),
        barisHarga("Diskon promo", t.promoDiscount, true),
        barisHarga("Ongkir bersih", t.deliveryRevenue),
        total,
    );
    $("#lapBeli").replaceChildren(...data.byPurchaseType.map(x => ringkas(x.purchaseType, x)));
    $("#kosongLapPaket").hidden = data.byPackage.length > 0;
    $("#lapPaket").replaceChildren(
        ...[...data.byPackage].sort((a, b) => b.totalRevenue - a.totalRevenue).map(x => ringkas(x.packageName, x)),
    );
}

async function menuMingguDepan() {
    const mulai = tambahHari(hariIni(), 1);
    const { meta } = await api(
        `/admin/menu-schedules?from=${mulai}&to=${tambahHari(mulai, 6)}&isPublished=true&limit=1`,
    );
    $("#peringatanMenu").hidden = meta.total > 0;
}

async function pembayaran() {
    const [pay, pak] = await Promise.all([api("/admin/payments?status=Pending&limit=20"), fetchAll("/admin/packages")]);
    const namaPaket = new Map(pak.map(p => [p.id, p.name]));
    const tunai = pay.data.filter(p => p.method === "CASH");
    const peta = new Map(
        await Promise.all(
            [...new Set(tunai.map(p => p.subscriptionId))].map(id =>
                api(`/admin/subscriptions/${id}`)
                    .then(({ data }) => [id, data])
                    .catch(() => [id, null]),
            ),
        ),
    );
    $("#kosongBayar").hidden = tunai.length > 0;
    $("#bayar").replaceChildren(
        ...tunai.map(p => {
            const s = peta.get(p.subscriptionId);
            const row = el("div", "invoice");
            const kiri = el("div");
            kiri.append(
                el(
                    "p",
                    "t-h3",
                    s
                        ? `${s.user ? s.user.name : s.recipientName} · ${namaPaket.get(s.packageId) || "Paket"} · ${s.period}`
                        : "Pesanan tunai",
                ),
                el(
                    "p",
                    "t-small t-muted",
                    `${labelMetode(p.method)}${p.type === "DELIVERY_SERVICE_UPGRADE" ? " · upgrade pengantaran" : ""} · ${rp(p.amount)}`,
                ),
            );
            const kanan = el("div", "row");
            const verif = el("button", "btn btn-primary btn-sm", "Verifikasi");
            verif.type = "button";
            verif.onclick = async () => {
                const siapa = s
                    ? `${s.user ? s.user.name : s.recipientName} · ${namaPaket.get(s.packageId) || "Paket"}`
                    : null;
                if (!(await peringatan(peringatanTunai(p, siapa)))) return;
                verif.disabled = true;
                try {
                    await api(`/admin/payments/${p.id}/verify-cash`, { method: "POST" });
                    toast("Pembayaran diverifikasi.");
                    pembayaran();
                    dashboard();
                } catch (error) {
                    verif.disabled = false;
                    galat(error);
                }
            };
            kanan.append(el("span", "badge badge--pending", "Pending"), verif);
            row.append(kiri, kanan);
            return row;
        }),
    );
}

let templates = [];
async function churn() {
    const [c, t, u] = await Promise.all([
        api("/admin/retention/churn?limit=20"),
        api("/admin/message-templates?limit=50"),
        api("/admin/users?role=CUSTOMER&isChurned=true&limit=1"),
    ]);
    templates = t.data;
    $("#kBerhenti").textContent = u.meta.total;
    $("#tpl").replaceChildren(
        ...templates.map(x => {
            const o = el("option", "", x.name);
            o.value = x.id;
            return o;
        }),
    );
    tampilTpl();
    $("#kosongChurn").hidden = c.data.length > 0;
    $("#churn").replaceChildren(
        ...c.data.map(x => {
            const box = el("div", "alert alert--error row-between");
            const kiri = el("div");
            kiri.append(
                el("span", "alert-title", x.name),
                `${x.lastPackageName} · berakhir ${formatTanggal(x.lastEndDate)} · ${x.daysSinceLastOrder} hari tidak memesan`,
            );
            const wa = el("button", "btn btn-secondary btn-sm", "Hubungi WhatsApp");
            wa.type = "button";
            wa.setAttribute("aria-label", `Hubungi ${x.name} lewat WhatsApp`);
            wa.onclick = async () => {
                if (!$("#tpl").value) return toast("Buat template pesan dulu.", "error");
                wa.disabled = true;
                try {
                    const { data } = await api(`/admin/retention/churn/${x.userId}/follow-up`, {
                        method: "POST",
                        body: { templateId: $("#tpl").value },
                    });
                    window.open(data.whatsappUrl, "_blank", "noopener");
                } catch (error) {
                    galat(error);
                } finally {
                    wa.disabled = false;
                }
            };
            box.append(kiri, wa);
            return box;
        }),
    );
}
function tampilTpl() {
    const t = templates.find(x => x.id === $("#tpl").value);
    $("#isiTpl").textContent = t ? t.body : "Belum ada template. Buat dulu di halaman Pelanggan.";
}
$("#tpl").addEventListener("change", tampilTpl);

$("#periode").addEventListener("change", () => Promise.all([dashboard(), laporan()]).catch(galat));
Promise.all([dashboard(), laporan(), menuMingguDepan(), pembayaran(), churn()]).catch(galat);
