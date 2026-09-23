import { describe, expect, it } from "vitest";
import {
    addModalToQuery,
    parseModalQueryParam,
    registerModalUrlInstance,
    releaseModalUrlInstance,
    removeModalFromQuery,
    resetModalUrlIdAllocator,
    serializeModalQueryParam
} from "@shared/frontend/modalQuery";

describe("parseModalQueryParam", () => {
    it("parses bracketed lists", () => {
        expect(parseModalQueryParam("[1]")).toEqual([1]);
        expect(parseModalQueryParam("[1,2]")).toEqual([1, 2]);
        expect(parseModalQueryParam("[1, 2]")).toEqual([1, 2]);
    });

    it("parses comma-separated values", () => {
        expect(parseModalQueryParam("1,2")).toEqual([1, 2]);
    });

    it("returns empty for missing or invalid input", () => {
        expect(parseModalQueryParam(undefined)).toEqual([]);
        expect(parseModalQueryParam("")).toEqual([]);
        expect(parseModalQueryParam("[]")).toEqual([]);
        expect(parseModalQueryParam("[x]")).toEqual([]);
    });
});

describe("serializeModalQueryParam", () => {
    it("serializes ids in bracket form", () => {
        expect(serializeModalQueryParam([1])).toBe("[1]");
        expect(serializeModalQueryParam([1, 2])).toBe("[1,2]");
    });
});

describe("registerModalUrlInstance", () => {
    it("returns incrementing ids while instances are registered", () => {
        resetModalUrlIdAllocator(1);
        expect(registerModalUrlInstance()).toBe(1);
        expect(registerModalUrlInstance()).toBe(2);
    });

    it("resets the sequence when the last instance is released", () => {
        resetModalUrlIdAllocator(1);
        const a = registerModalUrlInstance();
        const b = registerModalUrlInstance();
        releaseModalUrlInstance(a);
        releaseModalUrlInstance(b);
        expect(registerModalUrlInstance()).toBe(1);
    });
});

describe("addModalToQuery / removeModalFromQuery", () => {
    it("appends without duplicates and removes by id", () => {
        expect(addModalToQuery([1], 2)).toEqual([1, 2]);
        expect(addModalToQuery([1, 2], 2)).toEqual([1, 2]);
        expect(removeModalFromQuery([1, 2], 1)).toEqual([2]);
    });
});
