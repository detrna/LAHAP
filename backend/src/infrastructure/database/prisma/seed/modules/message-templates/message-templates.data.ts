import { seedId } from "../../shared/seed-id.js";

export const MESSAGE_TEMPLATES = [
    {
        id: seedId("messageTemplate", 1),
        name: "Win-back dengan kode promo",
        body: "Halo {nama}, sudah {lama_tidak_memesan} kami tidak mengantar {paket_terakhir} untukmu. Pakai kode {kode_promo} untuk potongan pesanan berikutnya di Dapur Lahap ya!",
    },
    {
        id: seedId("messageTemplate", 2),
        name: "Tanya kabar",
        body: "Halo {nama}, terima kasih sudah berlangganan {paket_terakhir} sampai {tanggal_berakhir}. Ada masukan supaya kami bisa melayani lebih baik?",
    },
] as const;
