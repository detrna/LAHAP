import "../layout/boot.js";
import { api, fetchAll } from "../core/api.js";
import { $, el, opsi } from "../ui/dom.js";
import { formatTanggal, hariIni } from "../ui/format.js";
import { periksa, tampilGalat } from "../ui/forms.js";
import { renderPager } from "../ui/pager.js";
import { peringatan } from "../ui/peringatan.js";
import { toast } from "../ui/toast.js";

const CAKUPAN = { GLOBAL: "Semua pelanggan", PACKAGE: "Satu paket", SCHEDULE: "Satu hari layanan" };
const galat = (isi, teks) => tampilGalat($("#err"), isi, teks);
// 08xxx / +62xxx diubah ke 62xxx, sama seperti format nomor di database.
const normal = hp => {
    const d = hp.replace(/[\s-+]/g, "");
    return d.startsWith("0") ? `62${d.slice(1)}` : d;
};

let halaman = 1,
    sedangUbah = null;
async function muatDaftar() {
    try {
        const { data, meta } = await api(`/admin/announcements?page=${halaman}&limit=20`);
        $("#daftar").removeAttribute("aria-busy");
        $("#kosong").hidden = data.length > 0;
        $("#daftar").replaceChildren(
            ...data.map(a => {
                const row = el("div", "invoice");
                const kiri = el("div");
                kiri.append(
                    el("p", "t-h3", a.title),
                    el("p", "t-small t-muted", `${CAKUPAN[a.scope] || a.scope} · ${formatTanggal(a.createdAt)}`),
                );
                const hapus = el("button", "btn btn-danger btn-sm", "Hapus");
                hapus.type = "button";
                hapus.setAttribute("aria-label", `Hapus pengumuman ${a.title}`);
                hapus.onclick = async () => {
                    const ok = await peringatan({
                        judul: `Hapus pengumuman "${a.title}"?`,
                        akibat: ["Pengumuman hilang dari daftar pengumuman pelanggan dan tidak bisa dikembalikan."],
                        tombol: "Ya, hapus",
                        bahaya: true,
                    });
                    if (!ok) return;
                    hapus.disabled = true;
                    try {
                        await api(`/admin/announcements/${a.id}`, { method: "DELETE" });
                        toast("Pengumuman dihapus.");
                        muatDaftar();
                    } catch (error) {
                        hapus.disabled = false;
                        galat(error);
                    }
                };
                const ubah = el("button", "btn btn-secondary btn-sm", "Ubah");
                ubah.type = "button";
                ubah.setAttribute("aria-label", `Ubah pengumuman ${a.title}`);
                ubah.onclick = () => bukaUbah(a);
                const kanan = el("div", "row");
                kanan.append(ubah, hapus);
                row.append(kiri, kanan);
                return row;
            }),
        );
        renderPager($("#pager"), meta, p => {
            halaman = p;
            muatDaftar();
        });
    } catch (error) {
        $("#daftar").removeAttribute("aria-busy");
        $("#daftar").replaceChildren();
        galat(error);
    }
}

async function muatPilihan() {
    try {
        const [pk, jd] = await Promise.all([
            fetchAll("/admin/packages"),
            fetchAll(`/admin/menu-schedules?from=${hariIni()}`),
        ]);
        const nama = new Map(pk.map(p => [p.id, p.name]));
        ["pk", "upk"].forEach(id => $(`#${id}`).replaceChildren(...pk.map(p => opsi(p.id, p.name))));
        ["jd", "ujd"].forEach(id =>
            $(`#${id}`).replaceChildren(
                ...jd.map(j =>
                    opsi(
                        j.id,
                        `${formatTanggal(j.date)} · ${j.deliveryTime.range} · ${nama.get(j.packageId) || "Paket"}`,
                    ),
                ),
            ),
        );
    } catch (error) {
        galat(error);
    }
}
$("#c").addEventListener("change", () => {
    $("#fPaket").hidden = $("#c").value !== "PACKAGE";
    $("#fJadwal").hidden = $("#c").value !== "SCHEDULE";
});
$("#uc").addEventListener("change", () => {
    $("#uFPaket").hidden = $("#uc").value !== "PACKAGE";
    $("#uFJadwal").hidden = $("#uc").value !== "SCHEDULE";
});
function bukaUbah(a) {
    sedangUbah = a;
    $("#uc").value = a.scope;
    if (a.packageId) $("#upk").value = a.packageId;
    if (a.menuScheduleId) {
        if (![...$("ujd").options].some(o => o.value === a.menuScheduleId))
            $("#ujd").prepend(opsi(a.menuScheduleId, "Hari layanan sebelumnya"));
        $("#ujd").value = a.menuScheduleId;
    }
    $("#uj").value = a.title;
    $("#ub").value = a.body;
    $("#uc").dispatchEvent(new Event("change"));
    $("#ubah").hidden = false;
    $("#ubah").scrollIntoView();
    $("#uj").focus();
}
$("#batalUbah").onclick = () => {
    $("#ubah").hidden = true;
};
$("#ubah").onsubmit = async event => {
    event.preventDefault();
    if (
        !periksa([
            [$("#uj"), $("#uj").value.trim() !== ""],
            [$("#ub"), $("#ub").value.trim() !== ""],
        ])
    )
        return;
    const scope = $("#uc").value;
    const body = {
        title: $("#uj").value.trim(),
        body: $("#ub").value.trim(),
        scope,
        packageId: scope === "PACKAGE" ? $("#upk").value : null,
        menuScheduleId: scope === "SCHEDULE" ? $("#ujd").value : null,
    };
    const ok = await peringatan({
        judul: "Ubah pengumuman yang sudah terkirim?",
        akibat: [
            "Pelanggan langsung melihat teks baru di daftar pengumuman, tanpa notifikasi ulang.",
            scope !== sedangUbah.scope ||
            body.packageId !== (sedangUbah.packageId ?? null) ||
            body.menuScheduleId !== (sedangUbah.menuScheduleId ?? null)
                ? "Penerimanya berubah, jadi sebagian pelanggan tidak lagi melihat pengumuman ini."
                : null,
        ],
        tombol: "Ya, simpan",
    });
    if (!ok) return;
    $("#simpanUbah").disabled = true;
    galat(null);
    try {
        await api(`/admin/announcements/${sedangUbah.id}`, { method: "PATCH", body });
        toast("Pengumuman diubah.");
        $("#ubah").hidden = true;
        muatDaftar();
    } catch (error) {
        galat(error);
    } finally {
        $("#simpanUbah").disabled = false;
    }
};

$("#kirim").onsubmit = async event => {
    event.preventDefault();
    const hp = normal($("#hp").value);
    if (
        !periksa([
            [$("#hp"), /^628\d{8,12}$/.test(hp)],
            [$("#j1"), $("#j1").value.trim() !== ""],
            [$("#b1"), $("#b1").value.trim() !== ""],
        ])
    )
        return;
    const tombol = event.target.querySelector("button[type=submit]");
    tombol.disabled = true;
    galat(null);
    try {
        const { data } = await api(`/admin/users?role=CUSTOMER&search=${encodeURIComponent(hp)}&limit=5`);
        const user = data.find(u => u.phone === hp);
        if (!user) {
            periksa([[$("#hp"), false]]);
            toast("Pelanggan dengan nomor itu tidak ditemukan.", "error");
            return;
        }
        await api("/admin/notifications/broadcast", {
            method: "POST",
            body: { title: $("#j1").value.trim(), body: $("#b1").value.trim(), target: "CUSTOMER", userId: user.id },
        });
        toast(`Notifikasi terkirim ke ${user.name || hp}.`);
        event.target.reset();
    } catch (error) {
        galat(error);
    } finally {
        tombol.disabled = false;
    }
};
$("#umum").onsubmit = async event => {
    event.preventDefault();
    const cakupan = $("#c").value;
    const butuhJadwal = cakupan === "SCHEDULE";
    if (
        !periksa([
            [$("#j2"), $("#j2").value.trim() !== ""],
            [$("#b2"), $("#b2").value.trim() !== ""],
            ...(butuhJadwal ? [[$("#jd"), $("#jd").value !== ""]] : []),
        ])
    )
        return;
    const teksPilihan = id => ($(id).selectedOptions[0] || {}).textContent || "";
    const penerima =
        cakupan === "PACKAGE"
            ? `pelanggan aktif paket ${teksPilihan("#pk")}`
            : butuhJadwal
              ? `pelanggan yang punya pesanan di ${teksPilihan("#jd")}`
              : "semua pelanggan aktif";
    const ok = await peringatan({
        judul: "Kirim pengumuman?",
        akibat: [
            `Dikirim ke ${penerima} sekaligus.`,
            "Pengumuman yang sudah terkirim tidak bisa ditarik. Mengubah atau menghapusnya tidak mengirim notifikasi ulang.",
        ],
        tombol: "Ya, kirim",
    });
    if (!ok) return;
    const body = { title: $("#j2").value.trim(), body: $("#b2").value.trim(), target: cakupan };
    if (cakupan === "PACKAGE") body.packageId = $("#pk").value;
    if (butuhJadwal) body.menuScheduleId = $("#jd").value;
    const tombol = event.target.querySelector("button[type=submit]");
    tombol.disabled = true;
    galat(null);
    try {
        const { data } = await api("/admin/notifications/broadcast", { method: "POST", body });
        toast(`Pengumuman terkirim ke ${data.recipientCount} pelanggan.`);
        event.target.reset();
        $("#c").dispatchEvent(new Event("change"));
        muatDaftar();
    } catch (error) {
        galat(error);
    } finally {
        tombol.disabled = false;
    }
};
muatDaftar();
muatPilihan();
