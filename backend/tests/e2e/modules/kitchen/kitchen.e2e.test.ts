import type { Express } from "express";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { loadConfig } from "../../../../src/config/index.js";
import { trackCreated, type CreatedRows } from "../../../../src/infrastructure/database/prisma/cleanup.js";
import { loadDatabase, type Db } from "../../../../src/infrastructure/database/prisma/db.js";
import { createModules } from "../../../../src/modules/create-modules.js";
import type { Role } from "../../../../src/shared/auth/roles.js";
import type { PaymentGateway } from "../../../../src/shared/ports/payment-gateway/payment-gateway.js";
import { createTestApp, type TestApp } from "../../../utils/app/create-test-app.js";
import { createAuthHeaders } from "../../../utils/factory/jwt/jwt.js";
import { createTestMenu, createTestSchedule } from "../../../utils/fixtures/schedules.js";
import { createTestSlots } from "../../../utils/fixtures/slots.js";
import { createTestPackage } from "../../../utils/fixtures/subscriptions.js";
import { createTestUser } from "../../../utils/fixtures/users.js";

const asRole = (role: Role) => createAuthHeaders({ role, sub: { userId: randomUUID(), name: `E2E ${role}` } });

const DAY_ONE = "2997-06-02";
const DAY_TWO = "2997-06-03";

interface MenuLine {
    readonly menuId: string;
    readonly name: string;
    readonly isAlternative: boolean;
    readonly deliveryTime: { readonly time: string };
    readonly portions: number;
}

interface IngredientLine {
    readonly ingredientId: string;
    readonly name: string;
    readonly totalQuantity: number;
}

interface SpecialEntry {
    readonly orderId: string;
    readonly recipientName: string;
    readonly reasons: readonly string[];
    readonly conflictingAllergies?: readonly { readonly id: string; readonly name: string }[];
    readonly allergyNote?: string;
    readonly note?: string;
    readonly usesAlternativeMenu: boolean;
}

interface Report {
    readonly date: string;
    readonly deliveryTime: { readonly time: string } | null;
    readonly menus: readonly MenuLine[];
    readonly ingredients: readonly IngredientLine[];
    readonly specialCategory: readonly SpecialEntry[];
}

describe("kitchen routes (e2e)", () => {
    let db: Db;
    let rows: CreatedRows;
    let testApp: TestApp;
    let app: Express;
    const tag = randomUUID().slice(0, 8);

    let packageId: string;
    let chickenId: string;
    let riceId: string;
    let peanutId: string;
    let ayamId: string;
    let tahuId: string;
    let sotoId: string;
    let allergicSlotIds: readonly string[];
    let notedSlotIds: readonly string[];

    const toCook = (query: Record<string, string>, headers = asRole("KITCHEN")) =>
        request(app).get("/api/kitchen/to-cook").set(headers).query(query);

    beforeAll(async () => {
        db = await loadDatabase(loadConfig().DATABASE);
        rows = trackCreated(db);
        testApp = await createTestApp({
            db,
            adapters: {
                objectStorage: { getSignedUrl: async (key: string) => `https://storage.test/${key}` },
                paymentGateway: { createTransaction: vi.fn(), verifyNotification: vi.fn() } as PaymentGateway,
            } as never,
            mount: deps => [createModules(deps).kitchen.router],
        });
        app = testApp.app;

        peanutId = rows.track("Allergy", (await db.orm.public.Allergy.create({ name: `Zz E2E ${tag} Kacang` })).id);
        const chicken = await db.orm.public.Ingredient.create({
            name: `Zz E2E ${tag} Dada Ayam`,
            unit: "kg",
            photoKey: "ingredients/test.webp",
        });
        chickenId = rows.track("Ingredient", chicken.id);
        const rice = await db.orm.public.Ingredient.create({
            name: `Zz E2E ${tag} Beras`,
            unit: "kg",
            photoKey: "ingredients/test.webp",
        });
        riceId = rows.track("Ingredient", rice.id);
        await db.orm.public.IngredientAllergy.create({ ingredientId: chickenId, allergyId: peanutId });

        ayamId = await createTestMenu(db, rows, {
            name: `Zz E2E ${tag} Ayam Bakar`,
            ingredients: [
                { ingredientId: chickenId, quantityPerPortion: 0.2 },
                { ingredientId: riceId, quantityPerPortion: 0.1 },
            ],
        });
        tahuId = await createTestMenu(db, rows, {
            name: `Zz E2E ${tag} Tahu Bacem`,
            isAlternative: true,
            ingredients: [{ ingredientId: riceId, quantityPerPortion: 0.15 }],
        });
        sotoId = await createTestMenu(db, rows, {
            name: `Zz E2E ${tag} Soto`,
            ingredients: [{ ingredientId: riceId, quantityPerPortion: 0.05 }],
        });

        packageId = await createTestPackage(db, rows, { deliveryTimes: ["07:00", "12:00"] });
        const morning = await createTestSchedule(db, rows, {
            packageId,
            date: DAY_ONE,
            deliveryTime: "07:00",
            isPublished: true,
            primaryMenuId: ayamId,
            alternativeMenuId: tahuId,
        });
        const noon = await createTestSchedule(db, rows, {
            packageId,
            date: DAY_ONE,
            deliveryTime: "12:00",
            isPublished: true,
            primaryMenuId: sotoId,
        });

        const allergic = await createTestUser(db, rows, { allergyIds: [peanutId] });
        const noted = await createTestUser(db, rows, { allergyNote: "allergic to mango" });
        const plain = await createTestUser(db, rows);
        const skipping = await createTestUser(db, rows);
        const pending = await createTestUser(db, rows);
        const cancelled = await createTestUser(db, rows);

        allergicSlotIds = (
            await createTestSlots(db, rows, {
                userId: allergic,
                packageId,
                status: "Success",
                recipientName: "Aaa Allergic",
                slots: [{ scheduleId: morning }, { scheduleId: noon }],
            })
        ).slotIds;
        notedSlotIds = (
            await createTestSlots(db, rows, {
                userId: noted,
                packageId,
                status: "Success",
                recipientName: "Bbb Noted",
                notes: "no chili",
                slots: [{ scheduleId: morning, usesAlternativeMenu: true }],
            })
        ).slotIds;
        await createTestSlots(db, rows, {
            userId: plain,
            packageId,
            status: "Success",
            recipientName: "Ccc Plain",
            slots: [{ scheduleId: morning, status: "Selesai" }],
        });
        await createTestSlots(db, rows, {
            userId: skipping,
            packageId,
            status: "Success",
            slots: [{ scheduleId: morning, status: "Dilewati", skipReason: "travelling" }],
        });
        await createTestSlots(db, rows, {
            userId: pending,
            packageId,
            status: "Pending",
            slots: [{ scheduleId: morning }],
        });
        await createTestSlots(db, rows, {
            userId: cancelled,
            packageId,
            status: "Dibatalkan",
            slots: [{ scheduleId: morning }],
        });
    });

    afterAll(async () => {
        await rows?.cleanup();
        await testApp?.close();
        await db?.close();
    });

    describe("access", () => {
        it("answers 401 without a token", async () => {
            const response = await request(app).get("/api/kitchen/to-cook");

            expect(response.status).toBe(401);
        });

        it.each<Role>(["CUSTOMER", "COURIER"])("answers 403 for a %s", async role => {
            const response = await toCook({}, asRole(role));

            expect(response.status).toBe(403);
        });

        it.each<Role>(["KITCHEN", "ADMIN"])("lets a %s read the report", async role => {
            const response = await toCook({ from: DAY_ONE }, asRole(role));

            expect(response.status).toBe(200);
        });
    });

    describe("validation", () => {
        it("refuses a range of 8 days", async () => {
            const response = await toCook({ from: "2997-06-02", to: "2997-06-09" });

            expect(response.status).toBe(400);
            expect(response.body.error.code).toBe("VALIDATION_ERROR");
        });

        it("refuses an end before the start", async () => {
            const response = await toCook({ from: "2997-06-03", to: "2997-06-02" });

            expect(response.status).toBe(400);
        });

        it.each([
            ["a bad meal time", { deliveryTime: "7am" }],
            ["a bad date", { from: "02-06-2997" }],
            ["a package id that is not a uuid", { packageId: "nope" }],
        ])("refuses %s", async (_, query) => {
            const response = await toCook(query);

            expect(response.status).toBe(400);
        });
    });

    describe("the report", () => {
        it("counts only paid, not skipped slots and keeps primary and alternative portions apart", async () => {
            const response = await toCook({ from: DAY_ONE, to: DAY_TWO });

            expect(response.status).toBe(200);
            const reports = response.body.data as Report[];
            expect(reports.map(report => report.date)).toEqual([DAY_ONE, DAY_TWO]);
            expect(reports[1]).toEqual({
                date: DAY_TWO,
                deliveryTime: null,
                menus: [],
                ingredients: [],
                specialCategory: [],
            });

            const [first] = reports;
            expect(
                first?.menus.map(({ menuId, isAlternative, portions, deliveryTime }) => [
                    menuId,
                    isAlternative,
                    portions,
                    deliveryTime.time,
                ]),
            ).toEqual([
                [ayamId, false, 2, "07:00"],
                [tahuId, true, 1, "07:00"],
                [sotoId, false, 1, "12:00"],
            ]);
        });

        it("totals the ingredients of the served menus", async () => {
            const response = await toCook({ from: DAY_ONE });

            const [report] = response.body.data as Report[];
            const totals = Object.fromEntries(
                (report?.ingredients ?? []).map(item => [item.ingredientId, item.totalQuantity]),
            );
            expect(totals).toEqual({ [chickenId]: 0.4, [riceId]: 0.4 });
        });

        it("lists the slots that need special handling, with the reasons", async () => {
            const response = await toCook({ from: DAY_ONE });

            const [report] = response.body.data as Report[];
            const entries = report?.specialCategory ?? [];
            expect(entries.map(entry => [entry.orderId, entry.reasons])).toEqual([
                [allergicSlotIds[0], ["ALLERGY_CLASH"]],
                [notedSlotIds[0], ["ALLERGY_NOTE", "NOTE"]],
            ]);
            expect(entries[0]?.conflictingAllergies?.map(allergy => allergy.id)).toEqual([peanutId]);
            expect(entries[1]).toMatchObject({
                recipientName: "Bbb Noted",
                allergyNote: "allergic to mango",
                note: "no chili",
                usesAlternativeMenu: true,
            });
        });

        it("narrows the report to one meal time", async () => {
            const response = await toCook({ from: DAY_ONE, deliveryTime: "12:00" });

            const [report] = response.body.data as Report[];
            expect(report?.deliveryTime).toMatchObject({ time: "12:00" });
            expect(report?.menus.map(menu => menu.menuId)).toEqual([sotoId]);
            expect(report?.specialCategory).toEqual([]);
        });

        it("narrows the report to one package, and answers empty reports for an unknown one", async () => {
            const own = await toCook({ from: DAY_ONE, packageId });
            const unknown = await toCook({ from: DAY_ONE, packageId: randomUUID() });

            expect((own.body.data as Report[])[0]?.menus).toHaveLength(3);
            expect(unknown.status).toBe(200);
            expect((unknown.body.data as Report[])[0]?.menus).toEqual([]);
        });
    });
});
