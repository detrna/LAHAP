import "../layout/boot.js";
import { api, fetchAll } from "../core/api.js";
import { $, el } from "../ui/dom.js";
import { formatTanggal, rp } from "../ui/format.js";
import { tampilGalat } from "../ui/forms.js";
import { renderPager } from "../ui/pager.js";
import { peringatan } from "../ui/peringatan.js";
import { BADGE, labelMetode, peringatanTunai } from "../ui/status.js";
import { toast } from "../ui/toast.js";

const galat = (isi, teks) => tampilGalat($("#err"), isi, teks);

let peta = new Map(),
    namaPaket = new Map(),
    halaman = 1;
const nama = p => {
    const s = peta.get(p.subscriptionId);
    return s
        ? `${s.user ? s.user.name : s.recipientName} · ${namaPaket.get(s.packageId) || "Paket"} · ${s.period}`
        : `Pesanan ${p.subscriptionId.slice(0, 8).toUpperCase()}`;
};
async function lengkapi(ids) {
    const kurang = [...new Set(ids)].filter(id => !peta.has(id));
    await Promise.all(
        kurang.map(id =>
            api(`/admin/subscriptions/${id}`)
                .then(({ data }) => peta.set(id, data))
                .catch(() => {}),
        ),
    );
}
const jenis = p => (p.type === "DELIVERY_SERVICE_UPGRADE" ? " · upgrade pengantaran" : "");

function baris(p, perluRefund) {
    const row = el("div", "invoice");
    const kiri = el("div");
    const judul = el("a", "t-h3", nama(p));
    judul.href = `admin-langganan.html?id=${p.subscriptionId}`;
    judul.style.display = "block";
    kiri.append(
        judul,
        el(
            "p",
            "t-small t-muted",
            `${labelMetode(p.method)}${jenis(p)} · ${rp(p.amount)} · ${formatTanggal(p.paidAt || p.createdAt)}`,
        ),
    );
    const kanan = el("div", "row");
    kanan.append(
        el(
            "span",
            `badge ${perluRefund ? "badge--cancel" : BADGE[p.status] || "badge--expire"}`,
            perluRefund ? "Perlu refund" : p.status,
        ),
    );
    const kerja = (label, kelas, url, tanya, ok) => {
        const b = el("button", `btn ${kelas} btn-sm`, label);
        b.type = "button";
        b.onclick = async () => {
            if (!(await peringatan(tanya))) return;
            b.disabled = true;
            galat(null);
            try {
                await api(url, { method: "POST" });
                toast(ok);
                muat();
            } catch (error) {
                b.disabled = false;
                galat(error);
            }
        };
        kanan.append(b);
    };
    if (perluRefund)
        kerja(
            "Konfirmasi Refund",
            "btn-secondary",
            `/admin/payments/${p.id}/confirm-refund`,
            {
                judul: `Refund ${rp(p.amount)} sudah dikirim?`,
                akibat: [
                    nama(p),
                    "Pembayaran ditandai Refund dan tidak bisa dikembalikan.",
                    "Pastikan uangnya sudah benar-benar diterima pelanggan.",
                ],
                tombol: "Ya, sudah dikirim",
                bahaya: true,
            },
            "Refund dikonfirmasi.",
        );
    else if (p.status === "Pending" && p.method === "CASH")
        kerja(
            "Verifikasi Tunai",
            "btn-primary",
            `/admin/payments/${p.id}/verify-cash`,
            peringatanTunai(p, nama(p)),
            "Pembayaran diverifikasi.",
        );
    row.append(kiri, kanan);
    return row;
}

let ke = 0;
async function muat() {
    const ini = ++ke;
    const status = document.querySelector("#filter input:checked").value;
    try {
        const [bayar, refund, ubah, subs, pak] = await Promise.all([
            api(`/admin/payments?page=${halaman}&limit=20${status ? `&status=${status}` : ""}`),
            fetchAll("/admin/payments?needsRefund=true"),
            fetchAll("/admin/delivery-method-changes?needsRefund=true"),
            peta.size ? null : api("/admin/subscriptions?limit=100"),
            namaPaket.size ? null : fetchAll("/admin/packages"),
        ]);
        if (subs) subs.data.forEach(s => peta.set(s.id, s));
        if (pak) namaPaket = new Map(pak.map(p => [p.id, p.name]));
        await lengkapi([...bayar.data, ...refund, ...ubah].map(x => x.subscriptionId));
        if (ini !== ke) return;
        $("#isi").removeAttribute("aria-busy");
        $("#isi").replaceChildren(...bayar.data.map(p => baris(p, false)));
        $("#kosong").hidden = bayar.data.length > 0;
        $("#refund").replaceChildren(...refund.filter(p => p.status !== "Refund").map(p => baris(p, true)));
        $("#kosongRefund").hidden = refund.some(p => p.status !== "Refund");
        $("#ubah").replaceChildren(...ubah.map(barisUbah));
        $("#kosongUbah").hidden = ubah.length > 0;
        renderPager($("#pager"), bayar.meta, p => {
            halaman = p;
            muat();
        });
        galat(null);
    } catch (error) {
        if (ini !== ke) return;
        $("#isi").removeAttribute("aria-busy");
        $("#isi").replaceChildren();
        galat(error);
    }
}
function barisUbah(c) {
    const row = el("div", "invoice");
    const kiri = el("div");
    const judul = el("a", "t-h3", nama(c));
    judul.href = `admin-langganan.html?id=${c.subscriptionId}`;
    judul.style.display = "block";
    const sebab = c.toDelivery ? "Upgrade ke diantar dibayar setelah batas waktu" : "Pindah ke ambil sendiri";
    kiri.append(
        judul,
        el(
            "p",
            "t-small t-muted",
            `${sebab} · ${c.slotCount} slot mulai ${formatTanggal(c.effectiveFrom)} · ${rp(c.amount)}`,
        ),
    );
    const kanan = el("div", "row");
    const b = el("button", "btn btn-secondary btn-sm", "Konfirmasi Refund");
    b.type = "button";
    b.onclick = async () => {
        const ok = await peringatan({
            judul: `Refund ${rp(c.amount)} sudah dikirim?`,
            akibat: [
                nama(c),
                "Refund ini ditandai selesai dan tidak bisa dikembalikan.",
                "Pastikan uangnya sudah benar-benar diterima pelanggan.",
            ],
            tombol: "Ya, sudah dikirim",
            bahaya: true,
        });
        if (!ok) return;
        b.disabled = true;
        galat(null);
        try {
            await api(`/admin/delivery-method-changes/${c.id}/confirm-refund`, { method: "POST" });
            toast("Refund dikonfirmasi.");
            muat();
        } catch (error) {
            b.disabled = false;
            galat(error);
        }
    };
    kanan.append(el("span", "badge badge--cancel", "Perlu refund"), b);
    row.append(kiri, kanan);
    return row;
}
document.getElementById("filter").addEventListener("change", () => {
    halaman = 1;
    muat();
});
muat();
