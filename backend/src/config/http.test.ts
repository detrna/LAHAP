import { describe, expect, it } from "vitest";
import { loadHttpConfig } from "./http.js";

describe("loadHttpConfig", () => {
    it("uses defaults when nothing is set", () => {
        expect(loadHttpConfig({})).toEqual({
            CORS_ORIGINS: ["http://localhost:3000"],
            TRUST_PROXY: false,
            UPLOAD_MAX_BYTES: 5 * 1024 * 1024,
            AUTH_RATE_LIMIT_MAX: 10,
            AUTH_RATE_LIMIT_WINDOW_SECONDS: 60,
        });
    });

    it("splits and trims a comma-separated CORS_ORIGINS list", () => {
        const config = loadHttpConfig({ CORS_ORIGINS: " https://lahap.id , http://localhost:3000 ," });

        expect(config.CORS_ORIGINS).toEqual(["https://lahap.id", "http://localhost:3000"]);
    });

    it.each(["https://lahap.id/", "https://lahap.id/app", "*", "lahap.id", ","])(
        "rejects the CORS origin %j",
        value => {
            expect(() => loadHttpConfig({ CORS_ORIGINS: value })).toThrow();
        },
    );

    it.each([
        ["true", true],
        ["false", false],
        ["1", 1],
        ["loopback", "loopback"],
        ["10.0.0.0/8, loopback", "10.0.0.0/8, loopback"],
    ] as const)("parses TRUST_PROXY=%j as %j", (raw, expected) => {
        expect(loadHttpConfig({ TRUST_PROXY: raw }).TRUST_PROXY).toBe(expected);
    });

    it("coerces numeric limits and rejects non-positive values", () => {
        const config = loadHttpConfig({
            UPLOAD_MAX_BYTES: "1048576",
            AUTH_RATE_LIMIT_MAX: "5",
            AUTH_RATE_LIMIT_WINDOW_SECONDS: "300",
        });

        expect(config.UPLOAD_MAX_BYTES).toBe(1_048_576);
        expect(config.AUTH_RATE_LIMIT_MAX).toBe(5);
        expect(config.AUTH_RATE_LIMIT_WINDOW_SECONDS).toBe(300);
        expect(() => loadHttpConfig({ AUTH_RATE_LIMIT_MAX: "0" })).toThrow();
        expect(() => loadHttpConfig({ UPLOAD_MAX_BYTES: "-1" })).toThrow();
    });
});
