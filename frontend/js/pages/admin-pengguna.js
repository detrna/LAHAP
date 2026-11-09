import "../layout/boot.js";
import { api } from "../core/api.js";
import { $, el } from "../ui/dom.js";
import { periksa, tampilGalat } from "../ui/forms.js";
import { renderPager } from "../ui/pager.js";
import { toast } from "../ui/toast.js";

const PERAN = { ADMIN: "Admin", KITCHEN: "Dapur", COURIER: "Kurir", CUSTOMER: "Pelanggan" };
const galat = (isi, teks) => tampilGalat($("#err"), isi, teks);
let sedangUbah = null,
    ke = 0,
    halaman = 1;

async function muat() {
    const ini = ++ke;
    const kata = $("#cari").value.trim();
    try {
        const { data, meta } = await api(
            `/admin/users?page=${halaman}&limit=20${kata ? `&search=${encodeURIComponent(kata)}` : ""}`,
        );
        if (ini !== ke) return;
        $("#list").removeAttribute("aria-busy");
        $("#kosong").hidden = data.length > 0;
        $("#list").replaceChildren(
            ...data.map(u => {
                const baris = el("div", "invoice");
                const kiri = el("div");
                kiri.append(
                    el("p", "t-h3", u.name || "Tanpa nama"),
                    el("p", "t-small t-muted", `${u.phone} · ${PERAN[u.role] || u.role}`),
                );
                const kanan = el("div", "row");
                kanan.append(
                    el(
                        "span",
                        `badge ${u.isActive ? "badge--success" : "badge--expire"}`,
                        u.isActive ? "Aktif" : "Nonaktif",
                    ),
                );
                if (u.role !== "CUSTOMER") {
                    const ubah = el("button", "btn btn-secondary btn-sm", "Ubah");
                    ubah.type = "button";
                    ubah.setAttribute("aria-label", `Ubah ${u.name}`);
                    ubah.onclick = () => bukaForm(u);
                    kanan.append(ubah);
                }
                const toggle = el(
                    "button",
                    `btn btn-sm ${u.isActive ? "btn-danger" : "btn-secondary"}`,
                    u.isActive ? "Nonaktifkan" : "Aktifkan",
                );
                toggle.type = "button";
                toggle.setAttribute("aria-label", `${toggle.textContent} ${u.name}`);
                toggle.onclick = async () => {
                    if (u.isActive && !confirm("Nonaktifkan pengguna ini? Dia tidak bisa masuk lagi.")) return;
                    toggle.disabled = true;
                    galat(null);
                    try {
                        await api(`/admin/users/${u.id}`, { method: "PATCH", body: { isActive: !u.isActive } });
                        toast(u.isActive ? "Pengguna dinonaktifkan." : "Pengguna diaktifkan.");
                        muat();
                    } catch (error) {
                        toggle.disabled = false;
                        galat(error);
                    }
                };
                kanan.append(toggle);
                baris.append(kiri, kanan);
                return baris;
            }),
        );
        renderPager($("#pager"), meta, p => {
            halaman = p;
            muat();
        });
        galat(null);
    } catch (error) {
        if (ini !== ke) return;
        $("#list").removeAttribute("aria-busy");
        $("#list").replaceChildren();
        galat(error);
    }
}

function bukaForm(u) {
    sedangUbah = u || null;
    $("#judulForm").textContent = u ? `Ubah ${u.name}` : "Tambah pengguna";
    $("#n").value = u ? u.name : "";
    $("#hp").value = u ? u.phone : "";
    $("#r").value = u && ["ADMIN", "KITCHEN", "COURIER"].includes(u.role) ? u.role : "ADMIN";
    $("#p").value = "";
    $("#hintPw").textContent = u
        ? "Kosongkan jika password tidak diubah. Jika diisi: 8 sampai 72 karakter."
        : "8 sampai 72 karakter.";
    $("#form").hidden = false;
    $("#n").focus();
}
$("#tambah").onclick = () => bukaForm(null);
$("#batal").onclick = () => {
    $("#form").hidden = true;
};
let tunda;
$("#cari").addEventListener("input", () => {
    clearTimeout(tunda);
    tunda = setTimeout(() => {
        halaman = 1;
        muat();
    }, 350);
});
$("#form").onsubmit = async event => {
    event.preventDefault();
    const pw = $("#p").value;
    const pwValid = sedangUbah && pw === "" ? true : pw.length >= 8 && pw.length <= 72;
    const hp = $("#hp").value.replace(/[\s-]/g, "");
    if (
        !periksa([
            [$("#n"), $("#n").value.trim() !== ""],
            [$("#hp"), /^(\+?62|0)8\d{8,12}$/.test(hp)],
            [$("#p"), pwValid],
        ])
    )
        return;
    const body = { name: $("#n").value.trim(), phone: hp, role: $("#r").value };
    if (pw) body.password = pw;
    $("#simpan").disabled = true;
    galat(null);
    try {
        if (sedangUbah) await api(`/admin/users/${sedangUbah.id}`, { method: "PATCH", body });
        else await api("/admin/users", { method: "POST", body });
        toast("Pengguna disimpan.");
        $("#form").hidden = true;
        muat();
    } catch (error) {
        galat(error);
    } finally {
        $("#simpan").disabled = false;
    }
};
muat();
