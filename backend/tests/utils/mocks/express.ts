import type { NextFunction, Request, Response } from "express";
import { vi } from "vitest";

export interface MockRequestOptions {
    readonly method?: string;
    readonly path?: string;
    readonly originalUrl?: string;
    readonly headers?: Record<string, string | string[] | undefined>;
    readonly body?: unknown;
    readonly query?: Record<string, unknown>;
    readonly params?: Record<string, string>;
    readonly user?: Request["user"];
    readonly tokenPayload?: Request["tokenPayload"];
    readonly pagination?: Request["pagination"];
}

export interface MockResponseOptions {
    readonly headersSent?: boolean;
}

export type MockResponse = Response & {
    status: ReturnType<typeof vi.fn>;
    json: ReturnType<typeof vi.fn>;
    send: ReturnType<typeof vi.fn>;
    setHeader: ReturnType<typeof vi.fn>;
    end: ReturnType<typeof vi.fn>;
};

export type MockNextFunction = NextFunction & ReturnType<typeof vi.fn<(err?: unknown) => void>>;

/**
 * Creates a mock Express `Request` object.
 * Defines `query` as a getter on the prototype to match Express 5's read-only `req.query` getter.
 */
export function createMockRequest(options: MockRequestOptions = {}): Request {
    const rawQuery = options.query ?? {};
    const rawPath = options.path ?? "/";
    const proto = {
        get query() {
            return rawQuery;
        },
        get path() {
            return rawPath;
        },
    };

    const req = Object.create(proto) as Request;
    req.method = options.method ?? "GET";
    req.originalUrl = options.originalUrl ?? rawPath;
    req.headers = options.headers ?? {};
    req.body = options.body ?? {};
    req.params = (options.params ?? {}) as Request["params"];

    if (options.user !== undefined) {
        req.user = options.user;
    }
    if (options.tokenPayload !== undefined) {
        req.tokenPayload = options.tokenPayload;
    }
    if (options.pagination !== undefined) {
        req.pagination = options.pagination;
    }

    return req;
}

/**
 * Creates a chainable mock Express `Response` object with `vi.fn()` spies.
 */
export function createMockResponse(options: MockResponseOptions = {}): MockResponse {
    const res = {
        headersSent: options.headersSent ?? false,
        status: vi.fn(),
        json: vi.fn(),
        send: vi.fn(),
        setHeader: vi.fn(),
        end: vi.fn(),
    };

    res.status.mockReturnValue(res);
    res.json.mockReturnValue(res);
    res.send.mockReturnValue(res);
    res.setHeader.mockReturnValue(res);
    res.end.mockReturnValue(res);

    return res as unknown as MockResponse;
}

/**
 * Creates a mock Express `NextFunction` spy.
 */
export function createMockNext(): MockNextFunction {
    const fn = vi.fn<(err?: unknown) => void>();
    return Object.assign(fn, {} as NextFunction);
}
