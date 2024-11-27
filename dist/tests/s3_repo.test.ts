import { versionGreaterThan, checkValidVersion } from "../s3_repo";

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

    it ("Version 1.0.0 should be valid", () => {
        expect(checkValidVersion("1.0.0")).toBe(true);
    });

    it ("Version 12.122.1 should be valid", () => {
        expect(checkValidVersion("12.122.1")).toBe(true);
    });

    it ("Version ~3.4.11 should be valid", () => {
        expect(checkValidVersion("~3.4.11")).toBe(true);
    });

    it ("Version ^7.190.21 should be valid", () => {
        expect(checkValidVersion("^7.190.21")).toBe(true);
    });

    it ("Version 8.5.6-7.8.4 should be valid", () => {
        expect(checkValidVersion("8.5.6-7.8.4")).toBe(true);
    });

    it ("Version ~8.5.6-7.8.4 should be invalid", () => {
        expect(checkValidVersion("~8.5.6-7.8.4")).toBe(false);
    });

    it ("Version 12.122.1.1 should be invalid", () => {
        expect(checkValidVersion("12.122.1.1")).toBe(false);
    });
});