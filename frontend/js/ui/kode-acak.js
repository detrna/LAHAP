const HURUF = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const PANJANG = 8;
const BATAS = 256 - (256 % HURUF.length);

export function buatKodeAcak() {
    let kode = "";
    const acak = new Uint8Array(PANJANG * 2);
    while (kode.length < PANJANG) {
        crypto.getRandomValues(acak);
        for (const nilai of acak) {
            if (nilai < BATAS && kode.length < PANJANG) kode += HURUF[nilai % HURUF.length];
        }
    }
    return kode;
}
