import { describe, expect, it } from "vitest";
import { JWT_SECRET_PLACEHOLDER, resolveJwtSecret } from "../src/config/env.js";

describe("resolveJwtSecret", () => {
    it("exige JWT_SECRET", () => {
        expect(() => resolveJwtSecret(undefined, "development")).toThrow(/JWT_SECRET/);
        expect(() => resolveJwtSecret("", "development")).toThrow(/JWT_SECRET/);
        expect(() => resolveJwtSecret("   ", "production")).toThrow(/JWT_SECRET/);
    });

    it("recusa o placeholder em produção", () => {
        expect(() => resolveJwtSecret(JWT_SECRET_PLACEHOLDER, "production")).toThrow(
            /produção/
        );
    });

    it("aceita o placeholder só fora de produção", () => {
        expect(resolveJwtSecret(JWT_SECRET_PLACEHOLDER, "development")).toBe(
            JWT_SECRET_PLACEHOLDER
        );
        expect(resolveJwtSecret("um-segredo-unico", "production")).toBe("um-segredo-unico");
    });
});
