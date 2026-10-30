import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { errorHandler } from "./error-handler.js";
import {
    validateBody,
    validateParams,
    validateQuery,
    validateRequest,
} from "./validate-request.js";

function createTestApp() {
    const app = express();
    app.use(express.json());

    app.post(
        "/items/:id",
        validateRequest({
            params: z.object({
                id: z.string().uuid("Invalid item ID"),
            }),
            query: z.object({
                page: z.coerce.number().int().positive("Page must be positive").default(1),
                search: z.string().trim().optional(),
            }),
            body: z.object({
                email: z.string().trim().toLowerCase().email("Invalid email address"),
                name: z.string().trim().min(2, "Name must be at least 2 characters"),
                lines: z
                    .array(
                        z.object({
                            quantity: z.number().int().positive("Quantity must be positive"),
                        }),
                    )
                    .optional(),
            }),
        }),
        (req, res) => {
            res.status(200).json({
                params: req.params,
                query: req.query,
                body: req.body,
            });
        },
    );

    app.get(
        "/slugs",
        validateQuery(
            z.object({
                slug: z.string().refine(async val => val !== "reserved", "Slug is reserved"),
            }),
        ),
        (req, res) => {
            res.status(200).json({ slug: req.query.slug });
        },
    );

    app.get(
        "/codes/:code",
        validateParams(
            z.object({
                code: z.string().length(4, "Code must be 4 characters"),
            }),
        ),
        (req, res) => {
            res.status(200).json({ code: req.params.code });
        },
    );

    app.post(
        "/profile",
        validateBody(
            z.object({
                bio: z.string().trim().max(20, "Bio is too long"),
            }),
        ),
        (req, res) => {
            res.status(201).json({ bio: req.body.bio });
        },
    );

    app.use(errorHandler());
    return app;
}

describe("validateRequest middleware (integration)", () => {
    const app = createTestApp();

    it("coerces and transforms params, query, and body and forwards parsed values to the route handler", async () => {
        const res = await request(app)
            .post("/items/550e8400-e29b-41d4-a716-446655440000?page=3&search=%20%20matcha%20%20&extra=ignored")
            .send({
                email: "  USER@Example.COM ",
                name: "  Alice  ",
                extraField: "stripped",
            });

        expect(res.status).toBe(200);
        expect(res.body).toEqual({
            params: { id: "550e8400-e29b-41d4-a716-446655440000" },
            query: { page: 3, search: "matcha" },
            body: { email: "user@example.com", name: "Alice" },
        });
    });

    it("aggregates validation errors across params, query, and body into a 400 VALIDATION_ERROR response", async () => {
        const res = await request(app)
            .post("/items/not-a-uuid?page=0")
            .send({
                email: "invalid-email",
                name: "A",
            });

        expect(res.status).toBe(400);
        expect(res.body).toEqual({
            error: {
                code: "VALIDATION_ERROR",
                message: expect.stringContaining("params.id: Invalid item ID"),
                issues: [
                    expect.objectContaining({
                        target: "params",
                        path: "id",
                        message: "Invalid item ID",
                    }),
                    expect.objectContaining({
                        target: "query",
                        path: "page",
                        message: "Page must be positive",
                    }),
                    expect.objectContaining({
                        target: "body",
                        path: "email",
                        message: "Invalid email address",
                    }),
                    expect.objectContaining({
                        target: "body",
                        path: "name",
                        message: "Name must be at least 2 characters",
                    }),
                ],
            },
        });
    });

    it("formats nested array and object paths in dot notation on validation failure", async () => {
        const res = await request(app)
            .post("/items/550e8400-e29b-41d4-a716-446655440000")
            .send({
                email: "user@example.com",
                name: "Alice",
                lines: [{ quantity: 2 }, { quantity: -3 }],
            });

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe("VALIDATION_ERROR");
        expect(res.body.error.issues).toEqual([
            expect.objectContaining({
                target: "body",
                path: "lines.1.quantity",
                message: "Quantity must be positive",
            }),
        ]);
    });

    it("validates async Zod refinements via validateQuery", async () => {
        const failRes = await request(app).get("/slugs?slug=reserved");
        expect(failRes.status).toBe(400);
        expect(failRes.body.error.issues).toEqual([
            expect.objectContaining({
                target: "query",
                path: "slug",
                message: "Slug is reserved",
            }),
        ]);

        const okRes = await request(app).get("/slugs?slug=available");
        expect(okRes.status).toBe(200);
        expect(okRes.body).toEqual({ slug: "available" });
    });

    it("validates route params via validateParams and request body via validateBody", async () => {
        const badCodeRes = await request(app).get("/codes/AB");
        expect(badCodeRes.status).toBe(400);
        expect(badCodeRes.body.error.issues[0]).toMatchObject({
            target: "params",
            path: "code",
            message: "Code must be 4 characters",
        });

        const okCodeRes = await request(app).get("/codes/ABCD");
        expect(okCodeRes.status).toBe(200);
        expect(okCodeRes.body).toEqual({ code: "ABCD" });

        const okProfileRes = await request(app).post("/profile").send({ bio: "  hello world  " });
        expect(okProfileRes.status).toBe(201);
        expect(okProfileRes.body).toEqual({ bio: "hello world" });
    });
});

