import "../layout/boot.js";
import { api, fetchAll } from "../core/api.js";
import { $, el, opsi } from "../ui/dom.js";
import { formatTanggal, hariIni } from "../ui/format.js";
import { tampilGalat } from "../ui/forms.js";
import { peringatan } from "../ui/peringatan.js";
import { ALUR_AMBIL, ALUR_ANTAR, badge } from "../ui/status.js";
import { toast } from "../ui/toast.js";

const galat = (isi, teks) => tampilGalat($("#err"), isi, teks);

let pesanan = [],
    kurir = [],
    namaPaket = new Map();
const penerima = o => (o.subscription && o.subscription.recipientName) || "Pelanggan";
const namaKurir = id => (kurir.find(k => k.id === id) || {}).name || "kurir lama";
const jam = o =>
    o.menuSchedule && o.menuSchedule.deliveryTime
        ? `${o.menuSchedule.deliveryTime.range} ${o.menuSchedule.deliveryTime.time}`
        : "";

function tujuanSah(o) {
    const alur = o.isDelivery ? ALUR_ANTAR : ALUR_AMBIL;
    const i = alur.indexOf(o.status);
    const maju = i < 0 ? [] : alur.slice(i + 1);
    if (o.status === "Terjadwal" || o.status === "Disiapkan") maju.push("Dilewati");
    return maju;
}

function tombolDetail(o) {
    const b = el("button", "btn btn-ghost btn-sm", "Detail");
    b.type = "button";
    b.setAttribute("aria-label", `Detail slot ${penerima(o)}`);
    b.onclick = () => bukaDetail(o.id);
    return b;
}

function rekap() {
    const grup = new Map();
    pesanan
        .filter(o => o.status !== "Dilewati")
        .forEach(o => {
            const k = `${o.menuSchedule ? o.menuSchedule.id : "?"}|${o.usesAlternativeMenu}`;
            if (!grup.has(k)) grup.set(k, { o, n: 0, khusus: 0 });
            const g = grup.get(k);
            g.n++;
            if (o.usesAlternativeMenu || (o.subscription && o.subscription.notes)) g.khusus++;
        });
    $("#kosongRekap").hidden = grup.size > 0;
    $("#rekap").replaceChildren(
        ...[...grup.values()].map(({ o, n, khusus }) => {
            const row = el("div", "invoice");
            const kiri = el("div");
            const paket = o.menuSchedule && namaPaket.get(o.menuSchedule.packageId);
            kiri.append(
                el(
                    "p",
                    "label",
                    `${jam(o)}${paket ? ` · ${paket}` : ""}${o.usesAlternativeMenu ? " · menu alternatif" : ""}`,
                ),
                el("p", "t-h3", o.menu ? o.menu.name : "Menu belum diisi"),
            );
            if (khusus) kiri.append(el("p", "t-small t-muted", `${khusus} pesanan beralergi atau punya catatan`));
            row.append(kiri, el("p", "t-h3", `${n} porsi`));
            return row;
        }),
    );
    $("#rekap").removeAttribute("aria-busy");
}

function pilihKurir(nilai, label) {
    const pilih = el("select", "select input w-auto");
    pilih.setAttribute("aria-label", label);
    pilih.append(opsi("", "Tanpa kurir"), ...kurir.map(k => opsi(k.id, k.name)));
    pilih.value = nilai || "";
    return pilih;
}

async function tugas(t) {
    const { data } = await api(`/admin/courier-assignments?from=${t}&to=${t}`);
    $("#kosongTugas").hidden = data.length > 0;
    $("#tugas").replaceChildren(
        ...data.map(x => {
            const row = el("div", "slot");
            const kiri = el("div");
            const status =
                x.unassignedCount === x.deliveryCount
                    ? "belum ada kurir"
                    : x.courier
                      ? `semua oleh ${x.courier.name}`
                      : x.unassignedCount
                        ? `kurir berbeda-beda, ${x.unassignedCount} belum ada kurir`
                        : "kurir berbeda-beda";
            kiri.append(
                el("p", "t-h3", `${x.deliveryTime.range} ${x.deliveryTime.time}`),
                el("p", "t-small t-muted", `${x.deliveryCount} pengantaran · ${status}`),
            );
            const kanan = el("div", "row");
            const pilih = pilihKurir(
                x.courier ? x.courier.id : "",
                `Kurir untuk ${x.deliveryTime.range} ${x.deliveryTime.time}`,
            );
            const simpan = el("button", "btn btn-secondary btn-sm", "Tugaskan");
            simpan.type = "button";
            simpan.onclick = async () => {
                const sudahAda = x.deliveryCount - x.unassignedCount;
                const waktu = `${formatTanggal(x.date, "hari")} · ${x.deliveryTime.range} ${x.deliveryTime.time}`;
                if (!pilih.value && sudahAda > 0) {
                    const ok = await peringatan({
                        judul: "Lepaskan kurir?",
                        akibat: [
                            `${sudahAda} pengantaran ${waktu} tidak punya kurir lagi.`,
                            "Pengantaran itu hilang dari daftar tugas kurirnya.",
                        ],
                        tombol: "Ya, lepaskan",
                        bahaya: true,
                    });
                    if (!ok) return;
                } else if (pilih.value && sudahAda > 0 && !(x.courier && x.courier.id === pilih.value)) {
                    const ok = await peringatan({
                        judul: "Ganti kurir?",
                        akibat: [
                            `Semua ${x.deliveryCount} pengantaran ${waktu} dipindah ke ${namaKurir(pilih.value)}.`,
                            x.courier
                                ? `${x.courier.name} tidak lagi mengantar pesanan ini.`
                                : "Kurir yang sudah ditugaskan di waktu makan ini diganti.",
                        ],
                        tombol: "Ya, ganti",
                    });
                    if (!ok) return;
                }
                simpan.disabled = true;
                galat(null);
                try {
                    const { data: hasil } = await api("/admin/courier-assignments", {
                        method: "PUT",
                        body: { date: x.date, deliveryTime: x.deliveryTime.time, courierId: pilih.value || null },
                    });
                    toast(`${hasil.updatedCount} pengantaran diperbarui.`);
                    muat();
                } catch (error) {
                    simpan.disabled = false;
                    galat(error);
                }
            };
            kanan.append(pilih, simpan);
            row.append(kiri, kanan);
            return row;
        }),
    );
}

function papan() {
    const antar = pesanan.filter(o => o.isDelivery);
    $("#kosongAntar").hidden = antar.length > 0;
    $("#papan").replaceChildren(
        ...antar.map(o => {
            const slot = el("div", "slot");
            const kiri = el("div");
            kiri.append(
                el("p", "t-h3", `${penerima(o)} · ${jam(o)}`),
                el(
                    "p",
                    "t-small t-muted",
                    (o.subscription && o.subscription.deliveryAddress) || "Alamat tidak tersedia",
                ),
            );
            const kanan = el("div", "row");
            const pilih = pilihKurir(o.courierId, `Kurir untuk ${penerima(o)}`);
            pilih.onchange = async () => {
                if (o.courierId) {
                    const ok = await peringatan({
                        judul: pilih.value ? "Ganti kurir?" : "Lepaskan kurir?",
                        akibat: [
                            pilih.value
                                ? `Pengantaran ${penerima(o)} · ${jam(o)} dipindah dari ${namaKurir(o.courierId)} ke ${namaKurir(pilih.value)}.`
                                : `Pengantaran ${penerima(o)} · ${jam(o)} tidak punya kurir lagi.`,
                            `Pengantaran ini hilang dari daftar tugas ${namaKurir(o.courierId)}.`,
                        ],
                        tombol: pilih.value ? "Ya, ganti" : "Ya, lepaskan",
                        bahaya: !pilih.value,
                    });
                    if (!ok) {
                        pilih.value = o.courierId;
                        return;
                    }
                }
                pilih.disabled = true;
                galat(null);
                try {
                    await api("/admin/courier-assignments", {
                        method: "PUT",
                        body: { orderIds: [o.id], courierId: pilih.value || null },
                    });
                    o.courierId = pilih.value || null;
                    toast("Penugasan kurir disimpan.");
                    tugas($("#tgl").value || hariIni()).catch(galat);
                } catch (error) {
                    pilih.value = o.courierId || "";
                    galat(error);
                } finally {
                    pilih.disabled = false;
                }
            };
            kanan.append(badge(o.status), pilih, tombolDetail(o));
            slot.append(kiri, kanan);
            return slot;
        }),
    );
}

function ambil() {
    const daftar = pesanan.filter(o => !o.isDelivery && o.status !== "Dilewati");
    $("#kosongAmbil").hidden = daftar.length > 0;
    $("#ambil").replaceChildren(
        ...daftar.map(o => {
            const slot = el("div", "slot");
            const kiri = el("div");
            kiri.append(
                el("p", "t-h3", `${penerima(o)} · ${jam(o)}`),
                el("p", "t-small t-muted", o.menu ? o.menu.name : "Menu"),
            );
            const kanan = el("div", "row");
            kanan.append(badge(o.status));
            if (o.status === "Siap Diambil") {
                const selesai = el("button", "btn btn-primary btn-sm", "Sudah Diambil");
                selesai.type = "button";
                selesai.setAttribute("aria-label", `Tandai pesanan ${penerima(o)} sudah diambil`);
                selesai.onclick = async () => {
                    const ok = await peringatan({
                        judul: "Tandai sudah diambil?",
                        akibat: [
                            `Pesanan ${penerima(o)} · ${jam(o)} menjadi Selesai.`,
                            "Status tidak bisa dikembalikan.",
                        ],
                        tombol: "Ya, sudah diambil",
                    });
                    if (!ok) return;
                    selesai.disabled = true;
                    galat(null);
                    try {
                        await api(`/admin/orders/${o.id}/complete`, { method: "POST" });
                        toast("Pesanan ditandai sudah diambil.");
                        muat();
                    } catch (error) {
                        selesai.disabled = false;
                        galat(error);
                    }
                };
                kanan.append(selesai);
            }
            kanan.append(tombolDetail(o));
            slot.append(kiri, kanan);
            return slot;
        }),
    );
}

function isiSlot() {
    const sebelum = $("#slot").value;
    $("#slot").replaceChildren(
        ...pesanan.map(o =>
            opsi(o.id, `${penerima(o)} · ${jam(o)} · ${o.isDelivery ? "antar" : "ambil"} · ${o.status}`),
        ),
    );
    if (sebelum && pesanan.some(o => o.id === sebelum)) $("#slot").value = sebelum;
    isiTujuan();
}
function isiTujuan() {
    const o = pesanan.find(x => x.id === $("#slot").value);
    const tujuan = o ? tujuanSah(o) : [];
    $("#st").replaceChildren(...tujuan.map(s => opsi(s, s)));
    $("#hintSt").textContent =
        o && !tujuan.length
            ? "Slot ini sudah di status akhir."
            : "Hanya maju sesuai alur, atau Dilewati sebelum makanan siap.";
    $("#simpanKoreksi").disabled = !tujuan.length;
}

async function bukaDetail(id) {
    galat(null);
    try {
        const { data: o } = await api(`/admin/orders/${id}`);
        const ms = o.menuSchedule;
        $("#dJudul").textContent = `${penerima(o)} · ${jam(o)}`;
        const meta = [
            ["Status", o.status],
            ["Menu", `${o.menu ? o.menu.name : "—"}${o.usesAlternativeMenu ? " (alternatif)" : ""}`],
            ["Paket", ms ? namaPaket.get(ms.packageId) || "—" : "—"],
            [
                "Metode",
                o.isDelivery
                    ? `Diantar${o.courier ? ` oleh ${o.courier.name}` : ", belum ada kurir"}`
                    : "Ambil sendiri",
            ],
        ];
        if (o.isDelivery && o.subscription && o.subscription.deliveryAddress)
            meta.push(["Alamat", o.subscription.deliveryAddress]);
        if (o.subscription && o.subscription.notes) meta.push(["Catatan pelanggan", o.subscription.notes]);
        if (o.skipReason) meta.push(["Alasan skip", o.skipReason]);
        $("#dMeta").replaceChildren(...meta.flatMap(([k, v]) => [el("dt", "", k), el("dd", "", v)]));
        $("#dRiwayat").replaceChildren(
            ...(o.statusHistory || []).map(h => {
                const r = el("div", "invoice");
                const kiri = el("div");
                kiri.append(
                    el("p", "t-h3", `${h.fromStatus ? `${h.fromStatus} → ` : ""}${h.toStatus}`),
                    el(
                        "p",
                        "t-small t-muted",
                        `${formatTanggal(h.changedAt, "waktu")} · ${h.changedBy ? h.changedBy.name : "Sistem"}${h.adminNote ? ` · ${h.adminNote}` : ""}`,
                    ),
                );
                r.append(kiri);
                return r;
            }),
        );
        const kendala = o.obstacles || [];
        $("#dKosongKendala").hidden = kendala.length > 0;
        $("#dKendala").replaceChildren(
            ...kendala.map(k => {
                const r = el("div", "stack");
                r.append(
                    el("p", "", k.note),
                    el(
                        "p",
                        "t-small t-muted",
                        `${formatTanggal(k.createdAt, "waktu")} · ${k.author ? k.author.name : "Kurir"}`,
                    ),
                );
                if (k.photoUrl) {
                    const img = document.createElement("img");
                    img.src = k.photoUrl;
                    img.alt = "Foto kendala";
                    img.style.cssText = "max-height:200px;border-radius:8px";
                    r.append(img);
                }
                return r;
            }),
        );
        $("#dLangganan").href = `admin-langganan.html?id=${o.subscriptionId}`;
        $("#slot").value = o.id;
        isiTujuan();
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

let ke = 0;
async function muat() {
    const ini = ++ke;
    const t = $("#tgl").value || hariIni();
    try {
        const [ord, usr, pak] = await Promise.all([
            fetchAll(`/admin/orders?date=${t}`),
            fetchAll("/admin/users?role=COURIER&isActive=true"),
            fetchAll("/admin/packages"),
        ]);
        if (ini !== ke) return;
        pesanan = ord.sort(
            (a, b) =>
                (a.menuSchedule ? a.menuSchedule.deliveryTime.time : "").localeCompare(
                    b.menuSchedule ? b.menuSchedule.deliveryTime.time : "",
                ) || penerima(a).localeCompare(penerima(b)),
        );
        kurir = usr;
        namaPaket = new Map(pak.map(p => [p.id, p.name]));
        rekap();
        papan();
        ambil();
        isiSlot();
        await tugas(t);
        galat(null);
    } catch (error) {
        if (ini !== ke) return;
        $("#rekap").removeAttribute("aria-busy");
        galat(error);
    }
}

$("#tgl").value = hariIni();
$("#tgl").addEventListener("change", muat);
$("#slot").addEventListener("change", isiTujuan);
$("#koreksi").onsubmit = async event => {
    event.preventDefault();
    const alasan = $("#alasan");
    const ok = alasan.value.trim() !== "";
    $("#fAlasan").classList.toggle("is-error", !ok);
    $("#errAlasan").hidden = ok;
    alasan.setAttribute("aria-invalid", String(!ok));
    if (!ok) return alasan.focus();
    if (!$("#slot").value || !$("#st").value) return toast("Tidak ada slot untuk dikoreksi.", "error");
    const o = pesanan.find(x => x.id === $("#slot").value);
    const baru = $("#st").value;
    const setuju = await peringatan({
        judul: "Koreksi status slot?",
        akibat: [
            o ? `${penerima(o)} · ${jam(o)} · ${o.isDelivery ? "antar" : "ambil"}` : null,
            `${o ? o.status : "Status sekarang"} → ${baru}`,
            ...(baru === "Dilewati" ? ["Slot dilewati tanpa refund.", "Porsinya tidak lagi dihitung dapur."] : []),
            "Status hanya bisa maju, jadi koreksi ini tidak bisa dibatalkan.",
        ],
        tombol: "Ya, koreksi",
        bahaya: true,
    });
    if (!setuju) return;
    const tombol = $("#simpanKoreksi");
    tombol.disabled = true;
    galat(null);
    try {
        await api(`/admin/orders/${$("#slot").value}/status`, {
            method: "PATCH",
            body: { status: $("#st").value, adminNote: alasan.value.trim() },
        });
        toast("Status dikoreksi.");
        alasan.value = "";
        if (!$("#detail").hidden) bukaDetail($("#slot").value);
        muat();
    } catch (error) {
        galat(error);
    } finally {
        tombol.disabled = false;
        isiTujuan();
    }
};
muat();
