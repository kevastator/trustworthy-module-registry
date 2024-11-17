"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const handler = async (event, context) => {
    return {
        statusCode: 200,
        body: {
            BusFactor: 0.1,
            BusFactorLatency: 0.1,
            Correctness: 0.1,
            CorrectnessLatency: 0.1,
            RampUp: 0.1,
            RampUpLatency: 0.1,
            ResponsiveMaintainer: 0.1,
            ResponsiveMaintainerLatency: 0.1,
            LicenseScore: 0.1,
            LicenseScoreLatency: 0.1,
            GoodPinningPractice: 0.1,
            GoodPinningPracticeLatency: 0.1,
            PullRequest: 0.1,
            PullRequestLatency: 0.1,
            NetScore: 0.1,
            NetScoreLatency: 0.1
        }
    };
};
exports.handler = handler;
