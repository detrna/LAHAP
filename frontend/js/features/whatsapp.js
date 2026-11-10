export async function bukaWhatsapp(ambilUrl) {
    const tab = window.open("", "_blank");
    if (tab) {
        tab.opener = null;
        try {
            tab.document.title = "Membuka WhatsApp…";
            tab.document.body.textContent = "Membuka WhatsApp…";
        } catch {}
    }
    try {
        const url = await ambilUrl();
        if (tab && !tab.closed) tab.location.href = url;
        else location.assign(url);
    } catch (error) {
        if (tab) tab.close();
        throw error;
    }
}
