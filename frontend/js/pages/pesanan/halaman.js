import { $ } from "../../ui/dom.js";
import { tampilGalat } from "../../ui/forms.js";

let segarkan = () => Promise.resolve();

export const galat = isi => tampilGalat($("#err"), isi);

export const muatUlang = () => segarkan();

export function aturMuatUlang(fn) {
    segarkan = fn;
}
