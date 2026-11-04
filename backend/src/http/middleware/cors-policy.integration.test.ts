import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { corsPolicy } from "./cors-policy.js";

function createTestApp() {
    const app = express();
    app.use(corsPolicy({ origins: ["https://lahap.id", "http://localhost:3000"] }));
    app.post("/api/things", (_req, res) => {
        res.status(201).json({ data: { ok: true } });
    });
    return app;
}

describe("corsPolicy middleware (integration)", () => {
    it("adds CORS headers for an allowed origin", async () => {
        const response = await request(createTestApp()).post("/api/things").set("Origin", "https://lahap.id");

        expect(response.status).toBe(201);
        expect(response.headers["access-control-allow-origin"]).toBe("https://lahap.id");
        expect(response.headers["access-control-expose-headers"]).toBe("X-Request-Id,Retry-After");
        expect(response.headers["access-control-allow-credentials"]).toBe("true");
    });

    it("adds no CORS headers for an unknown origin", async () => {
        const response = await request(createTestApp()).post("/api/things").set("Origin", "https://evil.example");

        expect(response.headers["access-control-allow-origin"]).toBeUndefined();
    });

    it("answers a preflight for an allowed origin with 204", async () => {
        const response = await request(createTestApp())
            .options("/api/things")
            .set("Origin", "http://localhost:3000")
            .set("Access-Control-Request-Method", "POST")
            .set("Access-Control-Request-Headers", "authorization,content-type");

        expect(response.status).toBe(204);
        expect(response.headers["access-control-allow-origin"]).toBe("http://localhost:3000");
        expect(response.headers["access-control-allow-methods"]).toContain("POST");
        expect(response.headers["access-control-allow-headers"]).toBe("authorization,content-type");
        expect(response.headers["access-control-max-age"]).toBe("600");
    });
});
