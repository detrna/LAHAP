import "../layout/boot.js";
import { api, fetchAll, upload } from "../core/api.js";
import { $, el } from "../ui/dom.js";
import { formatTanggal, rp, tanggalInput } from "../ui/format.js";
import { askChangeReason, needsChangeReason, periksa, tampilGalat } from "../ui/forms.js";
import { setBadge } from "../ui/status.js";
import { toast } from "../ui/toast.js";

const galat = (isi, teks) => tampilGalat($("#err"), isi, teks);

let paket = [],
    sedangUbah = null;

function gambar() {
    $("#list").removeAttribute("aria-busy");
    $("#kosong").hidden = paket.length > 0;
    $("#list").replaceChildren(
        ...paket.map(p => {
            const baris = el("div", "invoice");
            const kiri = el("div");
            kiri.append(
                el("p", "t-h3", p.name),
                el(
                    "p",
                    "t-small t-muted",
                    `${rp(p.basePrice)} · ${p.periods.join("/")} · ${formatTanggal(p.startAt)}${p.endAt ? ` – ${formatTanggal(p.endAt)}` : ""} · ${p.activeSubscriberCount ?? 0} pelanggan aktif`,
                ),
            );
            const kanan = el("div", "row");
            const badge = el("span", "");
            setBadge(badge, p.isActive ? "badge--success" : "badge--expire", p.isActive ? "Aktif" : "Nonaktif");
            const ubah = el("button", "btn btn-secondary btn-sm", "Ubah");
            ubah.type = "button";
            ubah.setAttribute("aria-label", `Ubah ${p.name}`);
            ubah.onclick = () => bukaForm(p);
            const toggle = el(
                "button",
                `btn btn-sm ${p.isActive ? "btn-danger" : "btn-secondary"}`,
                p.isActive ? "Nonaktifkan" : "Aktifkan",
            );
            toggle.type = "button";
            toggle.setAttribute("aria-label", `${toggle.textContent} ${p.name}`);
            const ganti = async changeReason => {
                const body = { isActive: !p.isActive };
                if (changeReason) body.changeReason = changeReason;
                try {
                    await api(`/admin/packages/${p.id}`, { method: "PATCH", body });
                    toast(p.isActive ? "Paket dinonaktifkan." : "Paket diaktifkan.");
                    muat();
                } catch (error) {
                    toggle.disabled = false;
                    if (needsChangeReason(error) && !changeReason) return askChangeReason($("#alasanToggle"), ganti);
                    galat(error);
                    if (changeReason) throw error;
                }
            };
            toggle.onclick = () => {
                if (p.isActive && !confirm("Nonaktifkan paket ini? Pesanan yang sudah ada tidak terpengaruh.")) return;
                toggle.disabled = true;
                galat(null);
                ganti();
            };
            kanan.append(badge, ubah, toggle);
            baris.append(kiri, kanan);
            return baris;
        }),
    );
}

async function muat() {
    try {
        paket = await fetchAll("/admin/packages");
        gambar();
        galat(null);
    } catch (error) {
        $("#list").removeAttribute("aria-busy");
        $("#list").replaceChildren();
        galat(error);
    }
}

function bukaForm(p) {
    sedangUbah = p || null;
    $("#judulForm").textContent = p ? `Ubah ${p.name}` : "Tambah paket";
    $("#n").value = p ? p.name : "";
    $("#d").value = p ? p.description : "";
    $("#h").value = p ? p.basePrice : "";
    $("#m").value = p ? tanggalInput(p.startAt) : "";
    $("#s").value = p ? tanggalInput(p.endAt) : "";
    $("#w").value = p ? p.deliveryTimes.map(t => t.time).join(", ") : "";
    $("#r1").value = p && p.deliveryFreeRadius != null ? p.deliveryFreeRadius : "";
    $("#r2").value = p && p.deliveryMaxDistance != null ? p.deliveryMaxDistance : "";
    $("#r3").value = p && p.deliveryPricePerKm != null ? p.deliveryPricePerKm : "";
    document.querySelectorAll("#periode input").forEach(c => (c.checked = p ? p.periods.includes(c.value) : false));
    $("#foto").value = "";
    fotoTerunggah = null;
    $("#alasan").hidden = true;
    $("#hintJam").hidden = !p;
    $("#hintFoto").textContent = p
        ? "Kosongkan jika foto tidak diganti."
        : "Wajib untuk paket baru. JPEG, PNG, atau WebP.";
    $("#form").hidden = false;
    $("#n").focus();
}

const iso = (tgl, akhir) => `${tgl}T${akhir ? "23:59:59" : "00:00:00"}+07:00`;
const angkaAtauNull = id => ($(`#${id}`).value === "" ? null : Number($(`#${id}`).value));
let fotoTerunggah = null,
    bodyTerakhir = null;
$("#foto").addEventListener("change", () => {
    fotoTerunggah = null;
});

function perubahanJam(lama, baru) {
    const hapus = lama.filter(t => !baru.includes(t)).sort();
    const tambah = baru.filter(t => !lama.includes(t)).sort();
    if (!hapus.length && !tambah.length) return {};
    if (lama.length === baru.length && hapus.length === tambah.length)
        return { deliveryTimeChanges: hapus.map((from, i) => ({ from, to: tambah[i] })) };
    return { deliveryTimes: baru };
}

async function kirim(changeReason) {
    const body = { ...bodyTerakhir };
    if (changeReason) body.changeReason = changeReason;
    try {
        const foto = $("#foto").files[0];
        if (foto && !fotoTerunggah) fotoTerunggah = (await upload("packages", foto)).key;
        if (fotoTerunggah) body.photoKey = fotoTerunggah;
        if (sedangUbah) await api(`/admin/packages/${sedangUbah.id}`, { method: "PATCH", body });
        else await api("/admin/packages", { method: "POST", body });
        fotoTerunggah = null;
        toast(changeReason ? "Paket disimpan. Pelanggan diberi tahu." : "Paket disimpan.");
        $("#form").hidden = true;
        muat();
    } catch (error) {
        if (needsChangeReason(error) && !changeReason) return askChangeReason($("#alasan"), kirim);
        galat(error);
        if (changeReason) throw error;
    }
}

$("#tambah").onclick = () => bukaForm(null);
$("#batal").onclick = () => {
    $("#form").hidden = true;
};
$("#form").onsubmit = async event => {
    event.preventDefault();
    const harga = Number($("#h").value);
    const periode = [...document.querySelectorAll("#periode input:checked")].map(c => c.value);
    const jam = $("#w")
        .value.split(",")
        .map(x => x.trim())
        .filter(Boolean);
    const jamValid = jam.length > 0 && jam.every(x => /^([01]\d|2[0-3]):[0-5]\d$/.test(x));
    const urut = !$("#m").value || !$("#s").value || $("#s").value >= $("#m").value;
    const foto = $("#foto").files[0];
    if (
        !periksa([
            [$("#n"), $("#n").value.trim() !== ""],
            [$("#d"), $("#d").value.trim() !== ""],
            [$("#h"), harga > 0],
            [document.querySelector("#periode input"), periode.length > 0, $("#fPeriode")],
            [$("#w"), jamValid],
            [$("#s"), urut],
            [$("#foto"), Boolean(sedangUbah || foto)],
        ])
    )
        return;
    const body = {
        name: $("#n").value.trim(),
        description: $("#d").value.trim(),
        basePrice: harga,
        periods: periode,
        deliveryFreeRadius: angkaAtauNull("r1"),
        deliveryMaxDistance: angkaAtauNull("r2"),
        deliveryPricePerKm: angkaAtauNull("r3"),
    };
    Object.assign(
        body,
        sedangUbah
            ? perubahanJam(
                  sedangUbah.deliveryTimes.map(t => t.time),
                  jam,
              )
            : { deliveryTimes: jam },
    );
    if ($("#m").value) body.startAt = iso($("#m").value);
    body.endAt = $("#s").value ? iso($("#s").value, true) : null;
    bodyTerakhir = body;
    const tombol = $("#simpan");
    tombol.disabled = true;
    galat(null);
    try {
        await kirim();
    } finally {
        tombol.disabled = false;
    }
};
muat();
