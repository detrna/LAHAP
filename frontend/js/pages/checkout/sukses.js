import { muatBisnis } from "../../features/bisnis.js";
import { $, el } from "../../ui/dom.js";
import { rp } from "../../ui/format.js";

export async function tampilSukses(data, ke) {
    const b = await muatBisnis();
    const alamat = b && b.address ? ` (${b.address})` : "";
    const lihat = el("a", "btn btn-primary", "Lihat Pesanan");
    lihat.href = ke;
    const kembali = el("a", "btn btn-secondary", "Kembali ke Paket");
    kembali.href = "index.html";
    const aksi = el("div", "row");
    aksi.append(lihat, kembali);
    $("#sukses").replaceChildren(
        el("h2", "t-h2", "Pesanan dibuat"),
        el("p", "", `Bayar ${rp(data.subscription.totalPrice)} tunai di kasir${alamat} secepatnya.`),
        el(
            "p",
            "t-small t-muted",
            "Pesanan yang belum dibayar batal otomatis. Admin memverifikasi pembayaranmu di kasir.",
        ),
        aksi,
    );
    $("#form").hidden = true;
    $("#sukses").hidden = false;
    $("#sukses").scrollIntoView({ block: "nearest", behavior: "smooth" });
}
