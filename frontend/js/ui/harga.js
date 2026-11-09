import { el } from "./dom.js";
import { rp } from "./format.js";

export function barisHarga(label, nilai, diskon) {
    const row = el("div", `price-row${diskon ? " price-row--discount" : ""}`);
    row.append(el("span", "", label), el("span", "", diskon ? `−${rp(nilai)}` : rp(nilai)));
    return row;
}
