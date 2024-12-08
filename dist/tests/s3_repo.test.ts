import { versionGreaterThan, checkValidVersionRegex, checkValidVersion, versionQualifyCheck, versionGreaterThanPatch } from "../s3_repo";

describe("Version Testing", () => {
    it ("Version 2.0.0 should be greater than 1.0.0", () => {
        expect(versionGreaterThan("2.0.0", "1.0.0")).toBe(true);
    });

    it ("Version 1.2.0 should be greater than 1.0.0", () => {
        expect(versionGreaterThan("1.2.0", "1.0.0")).toBe(true);
    });

    it ("Version 1.2.2 should be greater than 1.0.0", () => {
        expect(versionGreaterThan("1.2.2", "1.0.0")).toBe(true);
    });

    it ("Version 1.0.1 should be greater than 1.0.0", () => {
        expect(versionGreaterThan("1.0.1", "1.0.0")).toBe(true);
    });

    it ("Version 1.0.0 should not be greater than 2.0.0", () => {
        expect(versionGreaterThan("1.0.0", "2.0.0")).toBe(false);
    });

    it ("Version 1.0.0 should not be greater than 1.3.0", () => {
        expect(versionGreaterThan("1.0.0", "1.3.0")).toBe(false);
    });

    it ("Version 1.0.0 should not be greater than 1.0.12", () => {
        expect(versionGreaterThan("1.0.0", "1.0.12")).toBe(false);
    });

    it ("Version 1.0.0 should greater than patch 1.3.0", () => {
        expect(versionGreaterThanPatch("1.0.0", "1.3.0")).toBe(true);
    });

    it ("Version 1.0.0 should not greater than patch 1.0.1", () => {
        expect(versionGreaterThanPatch("1.0.0", "1.0.1")).toBe(false);
    });

    it ("Version 1.0.2 should greater than patch 1.0.1", () => {
        expect(versionGreaterThanPatch("1.0.2", "1.0.1")).toBe(true);
    });

    it ("Version 1.0.0 should be valid", () => {
        expect(checkValidVersionRegex("1.0.0")).toBe(true);
    });

    it ("Version 12.122.1 should be valid", () => {
        expect(checkValidVersionRegex("12.122.1")).toBe(true);
    });

    it ("Version ~3.4.11 should be valid", () => {
        expect(checkValidVersionRegex("~3.4.11")).toBe(true);
    });

    it ("Version ^7.190.21 should be valid", () => {
        expect(checkValidVersionRegex("^7.190.21")).toBe(true);
    });

    it ("Version 8.5.6-7.8.4 should be invalid", () => {
        expect(checkValidVersionRegex("8.5.6-7.8.4")).toBe(false);
    });

    it ("Version 6.5.6-7.8.4 should be valid", () => {
        expect(checkValidVersionRegex("6.5.6-7.8.4")).toBe(true);
    });

    it ("Version ~8.5.6-7.8.4 should be invalid", () => {
        expect(checkValidVersionRegex("~8.5.6-7.8.4")).toBe(false);
    });

    it ("Version 12.122.1.1 should be invalid", () => {
        expect(checkValidVersionRegex("12.122.1.1")).toBe(false);
    });

    it ("Version 12.122.1.1 should be invalid (single version)", () => {
        expect(checkValidVersion("12.122.1.1")).toBe(false);
    });

    it ("Version ~8.5.6 should be invalid (single version)", () => {
        expect(checkValidVersion("~8.5.6")).toBe(false);
    });

    it ("Version ^7.190.21 should be invalid (single version)", () => {
        expect(checkValidVersion("^7.190.21")).toBe(false);
    });

    it ("Version 1.0.0 should be valid (single version)", () => {
        expect(checkValidVersion("1.0.0")).toBe(true);
    });

    it ("Version 12.5.6 should be valid (single version)", () => {
        expect(checkValidVersion("12.5.6")).toBe(true);
    });

    it ("Version 3.1.2 should qualify for (3.1.2)versionGreaterThan", () => {
        expect(versionQualifyCheck("3.1.2", "3.1.2")).toBe(true);
    });

    it ("Version 3.1.2 should qualify for (1.0.0-4.0.0)", () => {
        expect(versionQualifyCheck("1.0.0-4.0.0", "3.1.2")).toBe(true);
    });

    it ("Version 3.1.2 should qualify for (^3.1.2)", () => {
        expect(versionQualifyCheck("^3.1.2", "3.1.2")).toBe(true);
    });

    it ("Version 3.1.2 should qualify for (~3.1.2)", () => {
        expect(versionQualifyCheck("~3.1.2", "3.1.2")).toBe(true);
    });

    it ("Version 3.1.2 should qualify for (~3.1.1)", () => {
        expect(versionQualifyCheck("~3.1.1", "3.1.2")).toBe(true);
    });

    it ("Version 3.1.2 should qualify for (^3.0.1)", () => {
        expect(versionQualifyCheck("^3.0.1", "3.1.2")).toBe(true);
    });

    it ("Version 3.1.2 should not qualify for (1.0.0-3.0.0)", () => {
        expect(versionQualifyCheck("1.0.0-3.0.0", "3.1.2")).toBe(false);
    });

    it ("Version 3.1.2 should qualify for (1.0.0-3.1.2)", () => {
        expect(versionQualifyCheck("1.0.0-3.1.2", "3.1.2")).toBe(true);
    });
});