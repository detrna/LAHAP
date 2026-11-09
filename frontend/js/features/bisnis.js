import { api } from "../core/api.js";

let bisnisDimuat = null;

export function muatBisnis() {
    if (!bisnisDimuat)
        bisnisDimuat = api("/business", { auth: false })
            .then(({ data }) => data)
            .catch(() => null);
    return bisnisDimuat;
}
