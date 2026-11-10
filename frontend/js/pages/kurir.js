import "../layout/boot.js";
import { api, upload } from "../core/api.js";
import { errorMessage } from "../core/errors.js";
import { onRealtime, onRealtimeReconnect } from "../core/realtime.js";
import { $, el } from "../ui/dom.js";
import { hariIni } from "../ui/format.js";
import { pilihBerkas } from "../ui/berkas.js";
import { pesanForm, tampilGalat } from "../ui/forms.js";
import { peringatan } from "../ui/peringatan.js";
import { badge } from "../ui/status.js";
import { toast } from "../ui/toast.js";

const galat = isi => tampilGalat($("#err"), isi);

function kartu(item) {
    const card = el("article", "card task");
    const kepala = el("div", "row-between");
    kepala.append(el("h2", "t-h3", item.recipientName), badge(item.status));
    const catatan = [item.menu.name, item.notes ? `Catatan: ${item.notes}` : ""].filter(Boolean).join(". ");
    card.append(
        el("p", "label", `${item.deliveryTime.range} · ${item.deliveryTime.time}`),
        kepala,
        el("p", "", item.deliveryAddress),
        el("p", "t-muted", catatan),
    );
    // Nama field nomor HP dan koordinat mengikuti pola checkout; hanya tampil bila API mengirimnya.
    const hp = item.recipientPhone || item.phone;
    const lat = item.deliveryLatitude ?? item.latitude;
    const lng = item.deliveryLongitude ?? item.longitude;
    if (hp || (lat != null && lng != null)) {
        const kontak = el("div", "task-actions");
        if (hp) {
            const telp = el("a", "btn btn-secondary", `Telepon ${hp}`);
            telp.href = `tel:${String(hp).replace(/[^\d+]/g, "")}`;
            kontak.append(telp);
        }
        if (lat != null && lng != null) {
            const peta = el("a", "btn btn-secondary", "Buka Peta");
            peta.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`;
            peta.target = "_blank";
            peta.rel = "noopener";
            kontak.append(peta);
        }
        card.append(kontak);
    }
    item.obstacles.forEach(o => {
        const box = el("div", "alert alert--warning");
        box.append(el("span", "alert-title", "Kendala tercatat"), o.note);
        if (o.photoUrl) {
            const link = el("a", "", " Lihat foto");
            link.href = o.photoUrl;
            link.target = "_blank";
            link.rel = "noopener";
            box.append(link);
        }
        card.append(box);
    });

    const aksi = el("div", "task-actions");
    const selesai = el("button", "btn btn-primary", "Selesai");
    selesai.type = "button";
    selesai.disabled = item.status !== "Diantar";
    const kendala = el("button", "btn btn-secondary", "Tulis Kendala");
    kendala.type = "button";
    kendala.disabled = item.status !== "Diantar"; // kendala hanya untuk slot yang sedang diantar
    aksi.append(selesai, kendala);

    const form = el("form", "stack");
    form.hidden = true;
    const field = el("div", "field");
    const area = el("textarea", "textarea");
    area.maxLength = 1000;
    area.id = `kendala-${item.orderId}`;
    area.setAttribute("aria-label", "Catatan kendala");
    const foto = el("input", "file-pick-input");
    foto.type = "file";
    foto.accept = "image/jpeg,image/png,image/webp";
    foto.id = `foto-${item.orderId}`;
    foto.setAttribute("aria-label", "Foto kendala (opsional)");
    const sisa = el("p", "hint", "Maksimal 1000 karakter.");
    area.addEventListener("input", () => {
        sisa.textContent = `${1000 - area.value.length} karakter tersisa.`;
    });
    field.append(area, sisa, foto, el("p", "hint", "Foto opsional: JPEG, PNG, atau WebP."));
    pilihBerkas(foto, { teks: "Pilih foto kendala" });
    const kirim = el("button", "btn btn-primary", "Kirim Kendala");
    kirim.type = "submit";
    form.append(field, kirim);
    card.append(aksi, form);

    kendala.onclick = () => {
        form.hidden = !form.hidden;
    };
    selesai.onclick = async () => {
        const ok = await peringatan({
            judul: "Tandai pengantaran selesai?",
            akibat: [
                `${item.recipientName} · ${item.deliveryAddress}`,
                "Pesanan ini menjadi Selesai.",
                "Status tidak bisa dikembalikan.",
            ],
            tombol: "Ya, selesai",
        });
        if (!ok) return;
        selesai.disabled = true;
        galat("");
        try {
            await api(`/courier/orders/${item.orderId}/complete`, { method: "POST" });
            toast("Pengantaran ditandai selesai.");
            muat();
        } catch (error) {
            selesai.disabled = false;
            galat(errorMessage(error));
        }
    };
    form.onsubmit = async event => {
        event.preventDefault();
        const note = area.value.trim();
        if (!note) return galat("Catatan kendala wajib diisi.");
        kirim.disabled = true;
        galat("");
        try {
            const body = { note };
            if (foto.files.length) body.photoKey = (await upload("obstacles", foto.files[0])).key;
            await api(`/courier/orders/${item.orderId}/obstacles`, { method: "POST", body });
            toast("Kendala tercatat.");
            muat();
        } catch (error) {
            kirim.disabled = false;
            galat(pesanForm(form, error, { note: area.id, photoKey: foto.id }));
        }
    };
    return card;
}

async function muat() {
    try {
        const { data } = await api(`/courier/orders?date=${hariIni()}`);
        // Jangan timpa formulir kendala yang sedang diisi kurir.
        if (document.activeElement && document.activeElement.closest("#daftar form")) return;
        $("#daftar").replaceChildren(...data.map(kartu));
        $("#kosong").hidden = data.length > 0;
        galat("");
    } catch (error) {
        $("#daftar").replaceChildren();
        galat(errorMessage(error));
    } finally {
        $("#daftar").removeAttribute("aria-busy");
    }
}

let tunda;
const muatTertunda = () => {
    clearTimeout(tunda);
    tunda = setTimeout(muat, 300);
};

["slot.status", "slot.menu", "slot.obstacle"].forEach(nama => onRealtime(nama, muatTertunda));
onRealtimeReconnect(muatTertunda);
document.addEventListener("visibilitychange", () => {
    if (!document.hidden) muatTertunda();
});

muat();
