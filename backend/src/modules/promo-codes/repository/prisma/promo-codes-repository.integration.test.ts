import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadConfig } from "../../../../config/index.js";
import { trackCreated, type CreatedRows } from "../../../../infrastructure/database/prisma/cleanup.js";
import { loadDatabase, type Db } from "../../../../infrastructure/database/prisma/db.js";
import {
    PromoCodeAlreadyExistsError,
    type NewPromoCodeRecord,
} from "../../service/interfaces/promo-codes.repository.js";
import { PrismaPromoCodesRepository } from "./promo-codes-repository.js";

const at = (value: string) => Temporal.PlainDateTime.from(value);

describe("PrismaPromoCodesRepository (integration)", () => {
    let db: Db;
    let repository: PrismaPromoCodesRepository;
    let rows: CreatedRows;
    const tag = randomUUID().slice(0, 8).toUpperCase();

    const newPromoCode = (overrides: Partial<NewPromoCodeRecord> = {}): NewPromoCodeRecord => ({
        code: `ZZ${tag}${randomUUID().slice(0, 6).toUpperCase()}`,
        discountType: "Persen",
        discountValue: 12.5,
        minPurchase: 25000,
        allowStackWithTier: false,
        validUntil: at("2027-01-01T00:00:00"),
        quota: 10,
        isActive: true,
        ...overrides,
    });

    async function createPromoCode(overrides: Partial<NewPromoCodeRecord> = {}) {
        const promoCode = await repository.createPromoCode(newPromoCode(overrides));
        rows.track("PromoCode", promoCode.id);
        return promoCode;
    }

    beforeAll(async () => {
        db = await loadDatabase(loadConfig().DATABASE);
        repository = new PrismaPromoCodesRepository(db);
        rows = trackCreated(db);
    });

    afterAll(async () => {
        await rows?.cleanup();
        await db?.close();
    });

    describe("create and find", () => {
        it("creates a code and reads it back by id and by code, with numbers as numbers", async () => {
            const created = await createPromoCode({ discountValue: 12.345, minPurchase: 0 });

            expect(created).toMatchObject({
                discountType: "Persen",
                discountValue: 12.35,
                minPurchase: 0,
                allowStackWithTier: false,
                validUntil: at("2027-01-01T00:00:00"),
                quota: 10,
                isActive: true,
            });
            expect(await repository.findPromoCodeById(created.id)).toEqual(created);
            expect(await repository.findPromoCodeByCode(created.code)).toEqual(created);
        });

        it("answers null for an unknown id or code, and finds codes by their stored uppercase form only", async () => {
            const created = await createPromoCode();

            expect(await repository.findPromoCodeById(randomUUID())).toBeNull();
            expect(await repository.findPromoCodeByCode("ZZ-NO-SUCH-CODE")).toBeNull();
            expect(await repository.findPromoCodeByCode(created.code.toLowerCase())).toBeNull();
        });

        it("throws PromoCodeAlreadyExistsError on a duplicate code", async () => {
            const created = await createPromoCode();

            await expect(repository.createPromoCode(newPromoCode({ code: created.code }))).rejects.toBeInstanceOf(
                PromoCodeAlreadyExistsError,
            );
        });
    });

    describe("updatePromoCode", () => {
        it("changes only the given fields", async () => {
            const created = await createPromoCode();

            const updated = await repository.updatePromoCode(created.id, { isActive: false, quota: 0 });

            expect(updated).toMatchObject({ isActive: false, quota: 0, discountValue: 12.5, code: created.code });
        });

        it("returns the row unchanged for an empty change and null for a missing id", async () => {
            const created = await createPromoCode();

            expect(await repository.updatePromoCode(created.id, {})).toEqual(created);
            expect(await repository.updatePromoCode(randomUUID(), { isActive: false })).toBeNull();
        });

        it("throws PromoCodeAlreadyExistsError when the new code is taken", async () => {
            const first = await createPromoCode();
            const second = await createPromoCode();

            await expect(repository.updatePromoCode(second.id, { code: first.code })).rejects.toBeInstanceOf(
                PromoCodeAlreadyExistsError,
            );
        });
    });

    describe("deletePromoCode", () => {
        it("deletes a code once and answers false afterwards", async () => {
            const created = await createPromoCode();

            expect(await repository.deletePromoCode(created.id)).toBe(true);
            expect(await repository.deletePromoCode(created.id)).toBe(false);
            expect(await repository.findPromoCodeById(created.id)).toBeNull();
        });
    });

    describe("listPromoCodes", () => {
        it("filters by search and isActive, escapes like patterns, and pages with a total", async () => {
            const active = await createPromoCode({ code: `ZZ${tag}-LIST-A` });
            const inactive = await createPromoCode({ code: `ZZ${tag}-LIST-B`, isActive: false });
            await createPromoCode({ code: `ZZ${tag}%LIST` });

            const all = await repository.listPromoCodes({ search: `${tag}-LIST`, skip: 0, take: 10 });
            const onlyActive = await repository.listPromoCodes({
                search: `${tag}-LIST`,
                isActive: true,
                skip: 0,
                take: 10,
            });
            const onlyInactive = await repository.listPromoCodes({
                search: `${tag}-LIST`,
                isActive: false,
                skip: 0,
                take: 10,
            });
            const percent = await repository.listPromoCodes({ search: "%LIST", skip: 0, take: 10 });
            const secondPage = await repository.listPromoCodes({ search: `${tag}-LIST`, skip: 1, take: 1 });

            expect(all.items.map(item => item.id).sort()).toEqual([active.id, inactive.id].sort());
            expect(all.total).toBe(2);
            expect(onlyActive.items.map(item => item.id)).toEqual([active.id]);
            expect(onlyInactive.items.map(item => item.id)).toEqual([inactive.id]);
            expect(percent.items.map(item => item.code)).toEqual([`ZZ${tag}%LIST`]);
            expect(secondPage.items).toHaveLength(1);
            expect(secondPage.total).toBe(2);
        });
    });
});
