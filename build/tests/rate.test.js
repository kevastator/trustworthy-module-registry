"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rate_1 = require("../rate");
const testURL = 'https://github.com/MadSons/ECE46100-Team';
describe('isValidUrl', () => {
    test('should return true for valid URLs', () => {
        expect((0, rate_1.isValidUrl)('https://www.example.com')).toBe(true);
        expect((0, rate_1.isValidUrl)('http://example.com')).toBe(true);
        expect((0, rate_1.isValidUrl)('https://example.com/path/to/page')).toBe(true);
        expect((0, rate_1.isValidUrl)('https://github.com/MadSons/ECE46100-Team')).toBe(true);
    });
    test('should return false for invalid URLs', () => {
        expect((0, rate_1.isValidUrl)('invalid-url')).toBe(false);
        expect((0, rate_1.isValidUrl)('Not A URL')).toBe(false);
    });
});
describe('RampUp', () => {
    test('should calculate the ramp-up score correctly', async () => {
        const rampUp = new rate_1.RampUp(testURL);
        const result = await rampUp.calculate();
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(1);
    });
    test('should calculate the ramp-up score correctly', async () => {
        const rampUp = new rate_1.RampUp('https://www.npmjs.com/package/express');
        const result = await rampUp.calculate();
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(1);
    });
    test('should calculate the ramp-up score correctly for alternate packages', async () => {
        const rampUp = new rate_1.RampUp('https://www.npmjs.com/package/unlicensed');
        const result = await rampUp.calculate();
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(1);
    });
    test('should calculate the ramp-up score for a popular repository', async () => {
        const rampUp = new rate_1.RampUp('https://github.com/facebook/react');
        const result = await rampUp.calculate();
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(1);
        expect(result.latency).toBeGreaterThan(0);
    });
});
describe('Correctness', () => {
    test('should calculate the correctness score correctly', async () => {
        const correctness = new rate_1.Correctness(testURL);
        const result = await correctness.calculate();
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(1);
    });
    test('should calculate the correctness score correctly', async () => {
        const correctness = new rate_1.Correctness('https://github.com/cloudinary/cloudinary_npm');
        const result = await correctness.calculate();
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(1);
    });
    test('should calculate the correctness score correctly', async () => {
        const correctness = new rate_1.Correctness('https://www.npmjs.com/package/wat4hjs');
        const result = await correctness.calculate();
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(1);
    });
    test('should calculate the correctness score correctly', async () => {
        const correctness = new rate_1.Correctness('https://www.npmjs.com/package/unlicensed');
        const result = await correctness.calculate();
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(1);
    });
    test('should calculate the correctness score for a repository with many contributors', async () => {
        const correctness = new rate_1.Correctness('https://github.com/tensorflow/tensorflow');
        const result = await correctness.calculate();
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(1);
        expect(result.latency).toBeGreaterThan(0);
    });
});
describe('BusFactor', () => {
    test('should calculate the bus factor score correctly', async () => {
        const busFactor = new rate_1.BusFactor(testURL);
        const result = await busFactor.calculate();
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(1);
        expect(result.latency).toBeGreaterThanOrEqual(0);
    });
    test('should calculate the bus factor score for a repository with few contributors', async () => {
        const busFactor = new rate_1.BusFactor('https://github.com/MadSons/ECE46100-Team');
        const result = await busFactor.calculate();
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(0.5);
        expect(result.latency).toBeGreaterThan(0);
    });
});
describe('ResponsiveMaintainer', () => {
    test('should calculate the responsive maintainer score correctly', async () => {
        const responsiveMaintainer = new rate_1.ResponsiveMaintainer(testURL);
        const result = await responsiveMaintainer.calculate();
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(1);
        expect(result.latency).toBeGreaterThanOrEqual(0);
    });
});
describe('License', () => {
    test('should calculate the license score correctly for a repo with a compatible license', async () => {
        const license = new rate_1.License(testURL);
        const result = await license.calculate();
        expect(result.score).toBe(1);
        expect(result.latency).toBeGreaterThanOrEqual(0);
    });
    test('should calculate the license score correctly for a repo without a compatible license', async () => {
        const license = new rate_1.License('https://www.npmjs.com/package/unlicensed');
        const result = await license.calculate();
        expect(result.score).toBe(0);
        expect(result.latency).toBeGreaterThanOrEqual(0);
    });
    test('license for readme', async () => {
        const license = new rate_1.License('https://github.com/cloudinary/cloudinary_npm');
        const result = await license.calculate();
        expect(result.score).toBe(1);
        expect(result.latency).toBeGreaterThanOrEqual(0);
    }, 20000); // Adding a timeout of 10 seconds
});
// New
describe('Fractional Dependency', () => {
    test('should calculate the Fractional Dependency for a Repo with a few dependencies', async () => {
        const fractionalDependency = new rate_1.FractionalDependency(testURL);
        const result = await fractionalDependency.calculate();
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(1);
        expect(result.latency).toBeGreaterThanOrEqual(0);
    });
    test('should calculate the Fractional Dependency for a Repo with no dependencies', async () => {
        const fractionalDependency = new rate_1.FractionalDependency('https://www.npmjs.com/package/unlicensed');
        const result = await fractionalDependency.calculate();
        expect(result.score).toBe(1);
        expect(result.latency).toBeGreaterThanOrEqual(0);
    });
    test('should calculate the Fractional Dependency for a Repo with many dependencies', async () => {
        const fractionalDependency = new rate_1.FractionalDependency('https://github.com/lodash/lodash');
        const result = await fractionalDependency.calculate();
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(1);
        expect(result.latency).toBeGreaterThanOrEqual(0);
    });
});
describe('Pull Requests', () => {
    test('should calculate the fraction of code produced through Pull Requests for a small repo', async () => {
        const pullRequest = new rate_1.PullRequest(testURL);
        const result = await pullRequest.calculate();
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(1);
        expect(result.latency).toBeGreaterThanOrEqual(0);
    });
    test('should calculate the Pull Requests for a repository with 1 line of code', async () => {
        const pullRequest = new rate_1.PullRequest('https://www.npmjs.com/package/unlicensed');
        const result = await pullRequest.calculate();
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(1);
        expect(result.latency).toBeGreaterThanOrEqual(0);
    });
    test('should calculate the Pull Requests for a large repository', async () => {
        const pullRequest = new rate_1.PullRequest('https://www.npmjs.com/package/lodash');
        const result = await pullRequest.calculate();
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(1);
        expect(result.latency).toBeGreaterThanOrEqual(0);
    });
});
// End of New
describe('getGithubRepoFromNpm', () => {
    test('should return GitHub URL for a known npm package', async () => {
        const result = await (0, rate_1.getGithubRepoFromNpm)('express');
        expect(result).toBe('https://github.com/expressjs/express');
    });
    test('should return null for a non-existent package', async () => {
        const packageName = 'this-package-does-not-exist-12345';
        const result = await (0, rate_1.getGithubRepoFromNpm)(packageName);
        expect(result).toBeNull();
    });
});
describe('log', () => {
    test('should log messages based on LOG_LEVEL', async () => {
        const originalLogLevel = process.env.LOG_LEVEL;
        const originalLogFile = process.env.LOG_FILE;
        process.env.LOG_LEVEL = '2';
        process.env.LOG_FILE = 'test.log';
        await (0, rate_1.log)('Test message', 1);
        await (0, rate_1.log)('Debug message', 2);
        process.env.LOG_LEVEL = originalLogLevel;
        process.env.LOG_FILE = originalLogFile;
    });
});
