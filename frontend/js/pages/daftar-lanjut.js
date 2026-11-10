import "../layout/boot.js";
import { currentUser, homeFor, redirectAman } from "../core/session.js";
import { buatFormLanjut, pasangFormLanjut } from "../features/profil-lanjut.js";
import { $ } from "../ui/dom.js";

function tujuan() {
    return redirectAman(new URLSearchParams(location.search).get("redirect")) || homeFor(currentUser());
}

const form = buatFormLanjut();
form.classList.add("card");
$("#lanjut").append(form);
await pasangFormLanjut(form, { selesai: () => location.replace(tujuan()) });
