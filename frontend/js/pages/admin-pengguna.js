import "../layout/boot.js";
import { ApiError, api } from "../core/api.js";
import { pilihAlergi } from "../features/alergi.js";
import { pasangPeta, pastikanLeaflet } from "../features/peta.js";
import { $, el } from "../ui/dom.js";
import { periksa, pesanForm, showIssues, tampilGalat, tandaiField } from "../ui/forms.js";
import { renderPager } from "../ui/pager.js";
import { toast } from "../ui/toast.js";

const PERAN = { ADMIN: "Admin", KITCHEN: "Dapur", COURIER: "Kurir", CUSTOMER: "Pelanggan" };
const FIELD = {
    name: "n",
    phone: "hp",
    role: "r",
    password: "p",
    email: "em",
    address: "alamat",
    latitude: "peta",
    longitude: "peta",
    allergyIds: "alergi",
    allergyNote: "catAlergi",
};
const EMAIL_VALID = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const galat = (isi, teks) => tampilGalat($("#err"), isi, teks);
const alergiPengguna = pilihAlergi($("#alergi"));
let sedangUbah = null,
    ke = 0,
    halaman = 1,
    peta = null,
    persiapanProfil = null,
    profilAwal = null;

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
                    el("p", "t-small t-muted", [u.phone, u.email, PERAN[u.role] || u.role].filter(Boolean).join(" · ")),
                );
                const kanan = el("div", "row");
                kanan.append(
                    el(
                        "span",
                        `badge ${u.isActive ? "badge--success" : "badge--expire"}`,
                        u.isActive ? "Aktif" : "Nonaktif",
                    ),
                );
                const ubah = el("button", "btn btn-secondary btn-sm", "Ubah");
                ubah.type = "button";
                ubah.setAttribute("aria-label", `Ubah ${u.name}`);
                ubah.onclick = async () => {
                    ubah.disabled = true;
                    await bukaForm(u.id);
                    ubah.disabled = false;
                };
                kanan.append(ubah);
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

function siapkanProfil() {
    persiapanProfil ??= (async () => {
        await pastikanLeaflet();
        peta = pasangPeta($("#peta"), { label: "Peta titik lokasi pelanggan. Ketuk untuk menaruh pin." });
        try {
            const { data } = await api("/allergies", { auth: false });
            alergiPengguna.setAlergi(data);
            $("#fAlergi").hidden = data.length === 0;
        } catch {
            $("#fAlergi").hidden = true;
        }
    })();
    return persiapanProfil;
}

async function aturPeran() {
    const pelanggan = $("#r").value === "CUSTOMER";
    $("#profilPelanggan").hidden = !pelanggan;
    if (!pelanggan) return;
    await siapkanProfil();
    if (!profilAwal) return;
    peta.setTitik(profilAwal.titik);
    profilAwal = null;
}

async function bukaForm(id) {
    galat(null);
    let u = null;
    if (id) {
        try {
            ({ data: u } = await api(`/admin/users/${id}`));
        } catch (error) {
            galat(error);
            return;
        }
    }
    sedangUbah = u;
    const form = $("#form");
    showIssues(form, null, {});
    form.querySelectorAll(".error-msg").forEach(p => (p.hidden = true));
    form.querySelectorAll(".is-error").forEach(f => f.classList.remove("is-error"));
    $("#judulForm").textContent = u ? `Ubah ${u.name}` : "Tambah pengguna";
    $("#n").value = u ? u.name : "";
    $("#hp").value = u ? u.phone : "";
    $("#em").value = u?.email || "";
    $("#r").value = u && u.role in PERAN ? u.role : "ADMIN";
    $("#p").value = "";
    $("#hintPw").textContent = u
        ? "Kosongkan jika password tidak diubah. Jika diisi: 8 sampai 72 karakter."
        : "8 sampai 72 karakter.";
    $("#alamat").value = u?.address || "";
    $("#catAlergi").value = u?.allergyNote || "";
    alergiPengguna.tutup();
    alergiPengguna.setNilai((u?.allergies || []).map(a => a.id));
    profilAwal = {
        titik:
            u && u.latitude != null && u.longitude != null
                ? { lat: Number(u.latitude), lng: Number(u.longitude) }
                : null,
    };
    form.hidden = false;
    form.scrollIntoView({ block: "start", behavior: "smooth" });
    $("#n").focus({ preventScroll: true });
    await aturPeran();
}

function isiProfil(body, baru) {
    const atauNull = nilai => nilai || null;
    const alamat = $("#alamat").value.trim();
    const catatan = $("#catAlergi").value.trim();
    const titik = peta ? peta.ambilTitik() : null;
    const alergi = alergiPengguna.nilai();
    if (baru) {
        if (alamat) body.address = alamat;
        if (catatan) body.allergyNote = catatan;
        if (titik) {
            body.latitude = titik.lat;
            body.longitude = titik.lng;
        }
        if (alergi.length) body.allergyIds = alergi;
        return;
    }
    body.address = atauNull(alamat);
    body.allergyNote = atauNull(catatan);
    body.latitude = titik ? titik.lat : null;
    body.longitude = titik ? titik.lng : null;
    body.allergyIds = alergi;
}

$("#tambah").onclick = () => bukaForm(null);
$("#batal").onclick = () => {
    $("#form").hidden = true;
};
$("#r").addEventListener("change", aturPeran);
$("#hapusTitik").onclick = () => peta?.setTitik(null);
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
    const form = $("#form");
    showIssues(form, null, {});
    const pw = $("#p").value;
    const pwValid = sedangUbah && pw === "" ? true : pw.length >= 8 && pw.length <= 72;
    const hp = $("#hp").value.replace(/[\s-]/g, "");
    const email = $("#em").value.trim();
    if (
        !periksa([
            [$("#n"), $("#n").value.trim() !== ""],
            [$("#hp"), /^(\+?62|0)8\d{8,12}$/.test(hp)],
            [$("#em"), email === "" || EMAIL_VALID.test(email)],
            [$("#p"), pwValid],
        ])
    )
        return;
    const body = { name: $("#n").value.trim(), phone: hp, role: $("#r").value };
    if (pw) body.password = pw;
    if (sedangUbah) body.email = email || null;
    else if (email) body.email = email;
    if (body.role === "CUSTOMER") isiProfil(body, !sedangUbah);
    $("#simpan").disabled = true;
    galat(null);
    try {
        if (sedangUbah) await api(`/admin/users/${sedangUbah.id}`, { method: "PATCH", body });
        else await api("/admin/users", { method: "POST", body });
        toast("Pengguna disimpan.");
        form.hidden = true;
        muat();
    } catch (error) {
        galat(error, pesanForm(form, error, FIELD));
        if (error instanceof ApiError && error.code === "CONFLICT" && error.message === "email is already registered") {
            tandaiField($("#em"), "Email ini sudah dipakai akun lain.");
            $("#em").focus();
        }
    } finally {
        $("#simpan").disabled = false;
    }
};
muat();
const ubahId = new URLSearchParams(location.search).get("ubah");
if (ubahId) bukaForm(ubahId);
