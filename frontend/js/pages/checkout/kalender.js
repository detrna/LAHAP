import { $, el } from "../../ui/dom.js";
import { awalMinggu, formatTanggal, hariIni, tambahHari } from "../../ui/format.js";
import { waktu } from "./rincian.js";

let mingguTampil = null;

function letak(node, h, w) {
    node.style.setProperty("--h", h);
    node.style.setProperty("--w", w);
    return node;
}

function tombol(className, label) {
    const node = el("button", className);
    node.type = "button";
    node.setAttribute("aria-label", label);
    return node;
}

function daftarJam(waktuPaket, jadwal) {
    const rentang = new Map();
    for (const t of waktuPaket) rentang.set(waktu(t), t.range || "");
    for (const j of jadwal) {
        if (!rentang.has(j.deliveryTime.time)) rentang.set(j.deliveryTime.time, j.deliveryTime.range || "");
    }
    return [...rentang].sort(([a], [b]) => a.localeCompare(b)).map(([jam, range]) => ({ jam, range }));
}

function rentangMinggu(awal) {
    const akhir = tambahHari(awal, 6);
    return awal.slice(0, 7) === akhir.slice(0, 7)
        ? `${Number(awal.slice(8))}–${formatTanggal(akhir, "pendek")}`
        : `${formatTanggal(awal, "pendek")} – ${formatTanggal(akhir, "pendek")}`;
}

function namaMinggu(awal) {
    const ini = awalMinggu(hariIni());
    if (awal === ini) return "Minggu ini";
    if (awal === tambahHari(ini, 7)) return "Minggu depan";
    return "";
}

function judul(awal) {
    const nama = namaMinggu(awal);
    const rentang = rentangMinggu(awal);
    return nama ? [el("strong", "", nama), el("span", "t-muted", rentang)] : [el("strong", "", rentang)];
}

function sel(jadwal, jam, dipilih) {
    const wrap = el("label", "chip kal-sel");
    const input = el("input");
    input.type = "checkbox";
    input.name = "hari";
    input.value = jadwal.id;
    input.checked = dipilih.has(jadwal.id);
    input.dataset.tanggal = jadwal.date;
    input.dataset.jam = jam;
    input.setAttribute("aria-label", `${formatTanggal(jadwal.date, "hari")} · ${jam}`);
    wrap.append(input, jam);
    return wrap;
}

function bagianMinggu(awal, perTanggal, jamJam, dipilih) {
    const rentang = rentangMinggu(awal);
    const grid = el("div", "kal-grid");
    grid.setAttribute("role", "group");
    grid.setAttribute("aria-label", `${namaMinggu(awal) || "Minggu"} ${rentang}`);
    grid.style.setProperty("--n", jamJam.length);
    const sudut = letak(el("span", "kal-sudut"), 0, 0);
    sudut.setAttribute("aria-hidden", "true");
    grid.append(sudut);
    jamJam.forEach(({ jam, range }, j) => {
        const kepala = tombol("kal-waktu", `Pilih semua jam ${jam} pada minggu ${rentang}`);
        kepala.dataset.jam = jam;
        kepala.append(el("span", "kal-jam", jam));
        if (range) kepala.append(el("span", "kal-rentang", range));
        grid.append(letak(kepala, 0, j + 1));
    });
    for (let i = 0; i < 7; i++) {
        const tanggal = tambahHari(awal, i);
        const slot = perTanggal.get(tanggal) || [];
        const kepala = tombol(
            i >= 5 ? "kal-hari kal-akhir" : "kal-hari",
            `Pilih semua ${formatTanggal(tanggal, "hari")}`,
        );
        kepala.dataset.tanggal = tanggal;
        kepala.disabled = !slot.length;
        kepala.append(
            el("span", "kal-nama", formatTanggal(tanggal, { weekday: "short" })),
            el("span", "kal-angka", String(Number(tanggal.slice(8)))),
        );
        grid.append(letak(kepala, i + 1, 0));
        jamJam.forEach(({ jam }, j) => {
            const jadwal = slot.find(s => s.deliveryTime.time === jam);
            const isi = jadwal ? sel(jadwal, jam, dipilih) : el("span", "kal-kosong", "–");
            if (!jadwal) isi.setAttribute("aria-hidden", "true");
            grid.append(letak(isi, i + 1, j + 1));
        });
    }
    return grid;
}

function balik(grid, inputs) {
    if (!inputs.length) return;
    const semuaTerpilih = inputs.every(input => input.checked);
    inputs.forEach(input => (input.checked = !semuaTerpilih));
    grid.dispatchEvent(new Event("change", { bubbles: true }));
}

export function isiKalender({ jadwal, waktu: waktuPaket, dipilih }) {
    const perTanggal = new Map();
    for (const j of jadwal) perTanggal.set(j.date, [...(perTanggal.get(j.date) || []), j]);
    const mingguan = [...new Set(jadwal.map(j => awalMinggu(j.date)))].sort();
    const jamJam = daftarJam(waktuPaket, jadwal);
    const bagian = mingguan.map(awal => bagianMinggu(awal, perTanggal, jamJam, dipilih));
    $("#hari").replaceChildren(...bagian);
    let aktif = Math.max(0, mingguan.indexOf(mingguTampil));
    const tampil = i => {
        aktif = i;
        mingguTampil = mingguan[i];
        bagian.forEach((b, k) => (b.hidden = k !== i));
        $("#judulMinggu").replaceChildren(...judul(mingguan[i]));
        $("#mingguLalu").disabled = i === 0;
        $("#mingguDepan").disabled = i >= mingguan.length - 1;
    };
    $("#mingguLalu").onclick = () => tampil(aktif - 1);
    $("#mingguDepan").onclick = () => tampil(aktif + 1);
    $("#hari").onclick = event => {
        const kepala = event.target.closest(".kal-hari, .kal-waktu");
        if (!kepala) return;
        const grid = kepala.closest(".kal-grid");
        const kunci = kepala.dataset.tanggal
            ? `[data-tanggal="${kepala.dataset.tanggal}"]`
            : `[data-jam="${kepala.dataset.jam}"]`;
        balik(grid, [...grid.querySelectorAll(`input${kunci}`)]);
    };
    if (mingguan.length) tampil(aktif);
    return mingguan.length;
}
