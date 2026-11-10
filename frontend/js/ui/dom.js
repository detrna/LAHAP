export const $ = selector => document.querySelector(selector);

export function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

export function opsi(value, label) {
    const option = el("option", "", label);
    option.value = value;
    return option;
}

export function tautan(href, className, text) {
    const a = el("a", className, text);
    a.href = href;
    return a;
}

export function tautanLuar(href, text) {
    const a = tautan(href, "", text);
    a.target = "_blank";
    a.rel = "noopener";
    return a;
}

export function isiFoto(wadah, url, alt, teksKosong) {
    wadah.textContent = teksKosong;
    wadah.dataset.foto = url || "";
    if (!url) return;
    const img = el("img");
    img.alt = alt;
    img.onload = () => {
        if (wadah.dataset.foto === url) wadah.replaceChildren(img);
    };
    img.onerror = () => {
        if (wadah.dataset.foto === url) wadah.textContent = teksKosong;
    };
    img.src = url;
}

export function gantiThumb(kotak, url, nama) {
    isiFoto(kotak, url, "", (nama || "").trim().charAt(0).toUpperCase());
}

export function thumb(url, nama, className = "") {
    const kotak = el("span", `thumb ${className}`.trim());
    kotak.setAttribute("aria-hidden", "true");
    gantiThumb(kotak, url, nama);
    return kotak;
}
