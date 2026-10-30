import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createPaginatedResponse } from "../../shared/response/index.js";
import { errorHandler } from "./error-handler.js";
import { paginate, pagination } from "./paginate.js";

function createTestApp() {
    const app = express();
    app.use(express.json());

    app.get("/items", paginate(), (req, res) => {
        res.status(200).json({
            pagination: req.pagination,
            query: req.query,
        });
    });

    app.get("/custom", paginate({ defaultPage: 2, defaultLimit: 5, maxLimit: 10 }), (req, res) => {
        res.status(200).json({
            pagination: req.pagination,
            query: req.query,
        });
    });

    app.get("/direct", paginate, (req, res) => {
        res.status(200).json({
            pagination: req.pagination,
        });
    });

    app.get("/alias", pagination(), (req, res) => {
        res.status(200).json({
            pagination: req.pagination,
        });
    });

    app.get("/products", paginate({ defaultLimit: 2 }), (req, res) => {
        const allProducts = [
            { id: "p1", name: "Keyboard" },
            { id: "p2", name: "Mouse" },
            { id: "p3", name: "Monitor" },
            { id: "p4", name: "Headset" },
            { id: "p5", name: "Webcam" },
        ];

        const { skip, take, page, limit } = req.pagination!;
        const pagedProducts = allProducts.slice(skip, skip + take);

        const response = createPaginatedResponse(pagedProducts, {
            page,
            limit,
            total: allProducts.length,
        });

        res.status(200).json(response);
    });

    app.use(errorHandler());
    return app;
}

describe("paginate middleware (integration)", () => {
    const app = createTestApp();

    it("parses and attaches default pagination params when no query is passed", async () => {
        const res = await request(app).get("/items");

        expect(res.status).toBe(200);
        expect(res.body).toEqual({
            pagination: {
                page: 1,
                limit: 20,
                offset: 0,
                skip: 0,
                take: 20,
            },
            query: {
                page: 1,
                limit: 20,
            },
        });
    });

    it("parses valid query string values and preserves other query parameters", async () => {
        const res = await request(app).get("/items?page=3&limit=15&search=matcha");

        expect(res.status).toBe(200);
        expect(res.body).toEqual({
            pagination: {
                page: 3,
                limit: 15,
                offset: 30,
                skip: 30,
                take: 15,
            },
            query: {
                page: 3,
                limit: 15,
                search: "matcha",
            },
        });
    });

    it("respects custom options for defaultPage, defaultLimit, and maxLimit", async () => {
        const res = await request(app).get("/custom");

        expect(res.status).toBe(200);
        expect(res.body.pagination).toEqual({
            page: 2,
            limit: 5,
            offset: 5,
            skip: 5,
            take: 5,
        });
    });

    it("works when used directly as middleware without invocation", async () => {
        const res = await request(app).get("/direct?page=2&limit=10");

        expect(res.status).toBe(200);
        expect(res.body.pagination).toEqual({
            page: 2,
            limit: 10,
            offset: 10,
            skip: 10,
            take: 10,
        });
    });

    it("works when used via pagination alias", async () => {
        const res = await request(app).get("/alias?page=1&limit=5");

        expect(res.status).toBe(200);
        expect(res.body.pagination).toEqual({
            page: 1,
            limit: 5,
            offset: 0,
            skip: 0,
            take: 5,
        });
    });

    it("returns 400 VALIDATION_ERROR when query parameters violate schema", async () => {
        const res = await request(app).get("/items?page=0&limit=500");

        expect(res.status).toBe(400);
        expect(res.body).toEqual({
            error: {
                code: "VALIDATION_ERROR",
                message: expect.stringContaining("query.page: page must be at least 1"),
                issues: [
                    expect.objectContaining({
                        target: "query",
                        path: "page",
                        message: "page must be at least 1",
                    }),
                    expect.objectContaining({
                        target: "query",
                        path: "limit",
                        message: "limit must not exceed 100",
                    }),
                ],
            },
        });
    });

    it("integrates seamlessly with createPaginatedResponse", async () => {
        const res = await request(app).get("/products?page=2&limit=2");

        expect(res.status).toBe(200);
        expect(res.body).toEqual({
            data: [
                { id: "p3", name: "Monitor" },
                { id: "p4", name: "Headset" },
            ],
            meta: {
                page: 2,
                limit: 2,
                total: 5,
                totalPages: 3,
                hasNextPage: true,
                hasPrevPage: true,
            },
        });
    });
});
