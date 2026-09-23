import { describe, expect, it } from "vitest";
import {
    isValidWsTopic,
    parseWsMessage,
    serializeWsMessage
} from "@shared/net/wsProtocol";

describe("isValidWsTopic", () => {
    it("accepts namespaced topics", () => {
        expect(isValidWsTopic("empresa:1:superadmin")).toBe(true);
        expect(isValidWsTopic("user:123")).toBe(true);
    });

    it("rejects empty or unsafe topics", () => {
        expect(isValidWsTopic("")).toBe(false);
        expect(isValidWsTopic("a b")).toBe(false);
        expect(isValidWsTopic("../secret")).toBe(false);
    });
});

describe("parseWsMessage / serializeWsMessage", () => {
    it("round-trips an auth message", () => {
        const raw = serializeWsMessage({ op: "auth", token: "abc" });

        expect(parseWsMessage(raw)).toEqual({ op: "auth", token: "abc" });
    });

    it("round-trips an event message", () => {
        const raw = serializeWsMessage({
            op: "event",
            topic: "empresa:1:superadmin",
            payload: { kind: "cadastro", entity: "cliente" }
        });

        expect(parseWsMessage(raw)).toEqual({
            op: "event",
            topic: "empresa:1:superadmin",
            payload: { kind: "cadastro", entity: "cliente" }
        });
    });

    it("returns null for invalid json or unknown ops", () => {
        expect(parseWsMessage("{")).toBeNull();
        expect(parseWsMessage(JSON.stringify({ op: "explode" }))).toBeNull();
        expect(parseWsMessage(JSON.stringify({ op: "auth" }))).toBeNull();
    });
});
