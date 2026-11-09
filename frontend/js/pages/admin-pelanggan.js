import "../layout/boot.js";
import { api, fetchAll } from "../core/api.js";
import { issuesText } from "../core/errors.js";
import { $, el, opsi } from "../ui/dom.js";
import { formatTanggal } from "../ui/format.js";
import { showIssues, tampilGalat } from "../ui/forms.js";
import { renderPager } from "../ui/pager.js";
import { toast } from "../ui/toast.js";

const galat = (isi, teks) => tampilGalat($("#err"), isi, teks);
const ISIAN = [
    ["{nama}", "Nama"],
    ["{paket_terakhir}", "Paket terakhir"],
    ["{tanggal_berakhir}", "Tanggal berakhir"],
    ["{lama_tidak_memesan}", "Lama tidak memesan"],
    ["{kode_promo}", "Kode promo"],
];

let ke = 0,
    halaman = 1;
async function muatPelanggan() {
    const ini = ++ke;
    const kata = $("#cari").value.trim();
    try {
        const { data, meta } = await api(
            `/admin/users?role=CUSTOMER&page=${halaman}&limit=20${kata ? `&search=${encodeURIComponent(kata)}` : ""}`,
        );
        if (ini !== ke) return;
        $("#daftar").removeAttribute("aria-busy");
        $("#daftar").hidden = data.length === 0;
        $("#kosongCari").hidden = data.length > 0;
        $("#hasil").textContent = kata ? `${meta.total} pelanggan ditemukan.` : `${meta.total} pelanggan.`;
        $("#daftar").replaceChildren(
            ...data.map(u => {
                const row = el("div", "invoice");
                const kiri = el("div");
                kiri.append(
                    el("p", "t-h3", u.name || "Tanpa nama"),
                    el("p", "t-small t-muted", `${u.phone}${u.email ? ` · ${u.email}` : ""}`),
                );
                const kanan = el("div", "row");
                kanan.append(
                    el(
                        "span",
                        `badge ${u.isChurned ? "badge--cancel" : u.isActive ? "badge--success" : "badge--expire"}`,
                        u.isChurned ? "Berhenti" : u.isActive ? "Aktif" : "Nonaktif",
                    ),
                );
                const buka = el("button", "btn btn-secondary btn-sm", "Detail");
                buka.type = "button";
                buka.setAttribute("aria-label", `Detail ${u.name}`);
                buka.onclick = () => bukaDetail(u.id);
                kanan.append(buka);
                row.append(kiri, kanan);
                return row;
            }),
        );
        renderPager($("#pager"), meta, p => {
            halaman = p;
            muatPelanggan();
        });
        galat(null);
    } catch (error) {
        if (ini !== ke) return;
        $("#daftar").removeAttribute("aria-busy");
        galat(error);
    }
}
let tunda;
$("#cari").addEventListener("input", () => {
    clearTimeout(tunda);
    tunda = setTimeout(() => {
        halaman = 1;
        muatPelanggan();
    }, 350);
});

async function bukaDetail(id) {
    galat(null);
    try {
        const { data: u } = await api(`/admin/users/${id}`);
        $("#dNama").textContent = u.name || u.phone;
        const m = u.membership;
        const meta = [
            ["Nomor HP", u.phone],
            ["Email", u.email || "—"],
            ["Status", `${u.isActive ? "Aktif" : "Nonaktif"}${u.isChurned ? " · berhenti berlangganan" : ""}`],
            [
                "Tier",
                m && m.tier
                    ? `${m.tier.name} · diskon ${m.tier.discountPercent}% · ${m.isActive ? `sampai ${formatTanggal(m.expiresAt)}` : "tidak aktif"}`
                    : "Belum punya tier",
            ],
            ["Alamat tersimpan", u.address || "—"],
            ["Alergi", (u.allergies || []).map(a => a.name).join(", ") || "—"],
            ["Catatan alergi", u.allergyNote || "—"],
            ["Terdaftar", formatTanggal(u.createdAt)],
        ];
        $("#dMeta").replaceChildren(...meta.flatMap(([k, v]) => [el("dt", "", k), el("dd", "", v)]));
        $("#dPesanan").href = `admin-langganan.html?userId=${u.id}`;
        $("#detail").hidden = false;
        $("#detail").scrollIntoView();
        $("#tutup").focus();
    } catch (error) {
        galat(error);
    }
}
$("#tutup").onclick = () => {
    $("#detail").hidden = true;
};

let templates = [],
    sedangUbah = null;
function tampilTpl() {
    const t = templates.find(x => x.id === $("#tpl").value);
    $("#isiTpl").textContent = t ? t.body : "Belum ada template. Tambahkan di bagian Template pesan.";
}
async function muatTemplate() {
    templates = await fetchAll("/admin/message-templates");
    const sebelum = $("#tpl").value;
    $("#tpl").replaceChildren(...templates.map(x => opsi(x.id, x.name)));
    if (templates.some(t => t.id === sebelum)) $("#tpl").value = sebelum;
    tampilTpl();
    $("#kosongTpl").hidden = templates.length > 0;
    $("#daftarTpl").replaceChildren(
        ...templates.map(t => {
            const row = el("div", "invoice");
            const kiri = el("div");
            kiri.append(el("p", "t-h3", t.name), el("p", "t-small t-muted", t.body));
            const kanan = el("div", "row");
            const ubah = el("button", "btn btn-secondary btn-sm", "Ubah");
            ubah.type = "button";
            ubah.setAttribute("aria-label", `Ubah template ${t.name}`);
            ubah.onclick = () => bukaTpl(t);
            const hapus = el("button", "btn btn-danger btn-sm", "Hapus");
            hapus.type = "button";
            hapus.setAttribute("aria-label", `Hapus template ${t.name}`);
            hapus.onclick = async () => {
                if (!confirm(`Hapus template "${t.name}"?`)) return;
                hapus.disabled = true;
                try {
                    await api(`/admin/message-templates/${t.id}`, { method: "DELETE" });
                    toast("Template dihapus.");
                    muatTemplate().catch(galat);
                } catch (error) {
                    hapus.disabled = false;
                    galat(error);
                }
            };
            kanan.append(ubah, hapus);
            row.append(kiri, kanan);
            return row;
        }),
    );
}
function bukaTpl(t) {
    sedangUbah = t || null;
    $("#judulTpl").textContent = t ? `Ubah ${t.name}` : "Tambah template";
    $("#tNama").value = t ? t.name : "";
    $("#tIsi").value = t ? t.body : "";
    showIssues($("#formTpl"), null, {});
    $("#formTpl")
        .querySelectorAll(".error-msg")
        .forEach(p => (p.hidden = true));
    $("#formTpl").hidden = false;
    $("#tNama").focus();
}
$("#isian").replaceChildren(
    ...ISIAN.map(([token, label]) => {
        const b = el("button", "btn btn-ghost btn-sm", token);
        b.type = "button";
        b.title = label;
        b.onclick = () => {
            const t = $("#tIsi");
            const awal = t.selectionStart ?? t.value.length,
                akhir = t.selectionEnd ?? t.value.length;
            t.setRangeText(token, awal, akhir, "end");
            t.focus();
        };
        return b;
    }),
);
$("#tambahTpl").onclick = () => bukaTpl(null);
$("#batalTpl").onclick = () => {
    $("#formTpl").hidden = true;
};
$("#formTpl").onsubmit = async event => {
    event.preventDefault();
    showIssues($("#formTpl"), null, {});
    const name = $("#tNama").value.trim(),
        body = $("#tIsi").value.trim();
    let pertama = null;
    [
        [$("#tNama"), name],
        [$("#tIsi"), body],
    ].forEach(([input, ok]) => {
        input.closest(".field").classList.toggle("is-error", !ok);
        input.closest(".field").querySelector(".error-msg").hidden = Boolean(ok);
        if (!ok && !pertama) pertama = input;
    });
    if (pertama) return pertama.focus();
    $("#simpanTpl").disabled = true;
    galat(null);
    try {
        if (sedangUbah)
            await api(`/admin/message-templates/${sedangUbah.id}`, { method: "PATCH", body: { name, body } });
        else await api("/admin/message-templates", { method: "POST", body: { name, body } });
        toast("Template disimpan.");
        $("#formTpl").hidden = true;
        await muatTemplate();
    } catch (error) {
        const sisa = showIssues($("#formTpl"), error, { name: "tNama", body: "tIsi" });
        if (sisa === false) galat(error);
        else if (sisa.length) galat(error, issuesText(sisa));
    } finally {
        $("#simpanTpl").disabled = false;
    }
};

async function muatChurn() {
    try {
        const [c] = await Promise.all([api("/admin/retention/churn?limit=30"), muatTemplate()]);
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
                            body: {
                                templateId: $("#tpl").value,
                                promoCode: $("#kode").value.trim().toUpperCase() || null,
                            },
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
    } catch (error) {
        galat(error);
    }
}
$("#tpl").addEventListener("change", tampilTpl);
muatPelanggan();
muatChurn();
