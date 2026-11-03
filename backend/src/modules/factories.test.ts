import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

type Build = (overrides?: Record<string, unknown>) => Record<string, unknown>;

const modulesDir = import.meta.dirname;
const factoryPaths = readdirSync(modulesDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => join(modulesDir, entry.name, "test-utils", "factory", `${entry.name}.factory.ts`))
    .filter(path => existsSync(path));

const factories: (readonly [string, Build])[] = [];
for (const path of factoryPaths) {
    const mod = (await import(path)) as Record<string, Build>;
    for (const [name, build] of Object.entries(mod)) factories.push([name, build]);
}

describe("module test factories (unit)", () => {
    it("finds a factory file for every module", () => {
        expect(factoryPaths).toHaveLength(14);
    });

    it.each(factories)("%s builds an object and applies overrides", (_, build) => {
        const built = build();
        expect(built).toBeTypeOf("object");
        const [key] = Object.keys(built);
        if (key !== undefined) expect(build({ [key]: "override" })[key]).toBe("override");
    });
});
