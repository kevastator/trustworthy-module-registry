"use strict";
/**
 * This file contains the main logic for a GitHub repository analysis tool.
 * It calculates various metrics for GitHub repositories, including:
 * - Ramp Up Time
 * - Correctness
 * - Bus Factor
 * - Responsive Maintainer
 * - License
 *
 * The tool can process multiple URLs, resolve npm packages to GitHub repositories,
 * and output the results in NDJSON format.
 * CD TEST NEW 1
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FractionalDependency = exports.PullRequest = exports.License = exports.ResponsiveMaintainer = exports.BusFactor = exports.Correctness = exports.RampUp = exports.Metric = exports.URLHandler = exports.handler = void 0;
exports.processURL = processURL;
exports.isValidUrl = isValidUrl;
exports.processURLs = processURLs;
exports.getGithubRepoFromNpm = getGithubRepoFromNpm;
exports.log = log;
const fs_1 = require("fs");
const worker_threads_1 = require("worker_threads");
const child_process_1 = require("child_process");
const path = __importStar(require("path"));
const axios_1 = __importDefault(require("axios"));
const http = __importStar(require("isomorphic-git/http/node"));
const git = __importStar(require("isomorphic-git"));
const { promisify } = require('util');
const { exec } = require('child_process');
const dotenv_1 = __importDefault(require("dotenv"));
const handler = async (event, context) => {
    return processURL("https://www.npmjs.com/package/socket.io");
};
exports.handler = handler;
dotenv_1.default.config();
// Check for required environment variables
if (!process.env.LOG_FILE) {
    console.error(JSON.stringify({ error: "LOG_FILE environment variable is not set" }));
    process.exit(1);
}
if (!process.env.GITHUB_TOKEN) {
    console.error(JSON.stringify({ error: "GITHUB_TOKEN environment variable is not set" }));
    process.exit(1);
}
// 0 means silent, 1 means informational messages, 2 means debug messages). Default log verbosity is 0.
const LOG_FILE = process.env.LOG_FILE;
const LOG_LEVEL = parseInt(process.env.LOG_LEVEL || '0', 10);
/**
 * Logs a message to the specified log file if the message's log level is less than or equal to LOG_LEVEL
 * @param message The message to log
 * @param level The log level of the message (default: 1)
 */
async function log(message, level = 1) {
    if (level <= LOG_LEVEL) {
        // Check if the log file exists
        const logFileExists = await fs_1.promises.access(LOG_FILE)
            .then(() => true)
            .catch(() => false);
        if (!logFileExists) {
            const logDir = path.dirname(LOG_FILE);
            await fs_1.promises.mkdir(logDir, { recursive: true });
        }
        // Format the date
        const now = new Date();
        const formattedDate = now.toLocaleString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        }).replace(/(\d+)\/(\d+)\/(\d+),/, '$3-$1-$2');
        // Append the message to the log file
        const logMessage = `${formattedDate} - ${message}\n`;
        await fs_1.promises.appendFile(LOG_FILE, logMessage);
    }
}
/**
 * Fetches the GitHub repository URL for a given npm package
 * @param packageName The name of the npm package
 * @returns The GitHub repository URL if found, null otherwise
 */
async function getGithubRepoFromNpm(packageName) {
    try {
        // Fetch package metadata from npm Registry
        const response = await axios_1.default.get(`https://registry.npmjs.org/${packageName}`);
        const data = response.data;
        // Extract repository URL from metadata
        const repository = data.repository;
        if (repository && repository.type === 'git') {
            // Return the GitHub repository URL if it's a git repository
            return repository.url.replace(/^git\+/, '').replace(/\.git$/, '');
        }
        // Repository URL is not available or it's not a GitHub URL
        return null;
    }
    catch (error) {
        await log(`Error fetching data for package ${packageName}: ${error}`, 2);
        return null;
    }
}
/**
 * Base Metric class that all specific metrics inherit from
 */
class Metric {
    constructor(url, weight) {
        this.url = url;
        this.weight = weight;
        this.owner = '';
        this.repo = '';
    }
    setUrl(url) {
        this.url = url;
    }
    extractOwnerAndRepo() {
        const urlParts = this.url.split('/');
        this.owner = urlParts[3];
        this.repo = urlParts[4];
    }
    static getWeight() {
        throw new Error("getWeight must be implemented by subclasses");
    }
}
exports.Metric = Metric;
/**
 * FractionalDependency class for calculating the fractional dependency metric
 */
class FractionalDependency extends Metric {
    constructor(url) {
        super(url, 1);
    }
    static getWeight() {
        return 1;
    }
    async getVersionRatio() {
        var versionResponse;
        try {
            versionResponse = await axios_1.default.get(`https://raw.githubusercontent.com/${this.owner}/${this.repo}/master/package.json`);
        }
        catch (error) {
            try {
                versionResponse = await axios_1.default.get(`https://raw.githubusercontent.com/${this.owner}/${this.repo}/main/package.json`);
            }
            catch (error) {
                return 1;
            }
        }
        const totalDepObj = versionResponse.data.dependencies;
        let total = 0;
        let correct = 0;
        for (const key in totalDepObj) {
            if (totalDepObj[key][0] == "~") {
                correct++;
            }
            total++;
        }
        //console.log(correct);
        //console.log(total);
        if (total > 0) {
            return correct / total;
        }
        else {
            return 1;
        }
    }
    async calculate() {
        const startTime = Date.now();
        this.extractOwnerAndRepo();
        let score = 0;
        try {
            score = await this.getVersionRatio();
        }
        catch (error) {
            await log(`Error checking discussions for ${this.url}: ${error}`, 2);
        }
        const latency = (Date.now() - startTime) / 1000; // Convert to seconds
        return { score, latency };
    }
}
exports.FractionalDependency = FractionalDependency;
/**
 * PullRequest class for calculating the pull request metric
 */
class PullRequest extends Metric {
    constructor(url) {
        super(url, 1);
    }
    static getWeight() {
        return 1;
    }
    async getNumCommits() {
        const commitResponse = await axios_1.default.get(`https://api.github.com/repos/${this.owner}/${this.repo}/commits`, {
            headers: {
                'Authorization': `token ${process.env.GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        let commitSet = new Set();
        const numPullCommits = (commitResponse.data).length;
        for (let j = 0; j < numPullCommits; j++) {
            const commitId = commitResponse.data[j].sha;
            if (!commitSet.has(commitId)) {
                commitSet.add(commitId);
            }
        }
        const commitVal = [...commitSet];
        let commitPullSum = 0;
        for (let i = 0; i < commitVal.length; i++) {
            const commitPullResponse = await axios_1.default.get(`https://api.github.com/repos/${this.owner}/${this.repo}/commits/${commitVal[i]}/pulls?state=closed`, {
                headers: {
                    'Authorization': `token ${process.env.GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            if ((commitPullResponse.data).length > 0) {
                commitPullSum++;
            }
        }
        return commitPullSum / commitSet.size;
    }
    async calculate() {
        const startTime = Date.now();
        this.extractOwnerAndRepo();
        let score = 0;
        try {
            score = await this.getNumCommits();
        }
        catch (error) {
            await log(`Error checking discussions for ${this.url}: ${error}`, 2);
        }
        const latency = (Date.now() - startTime) / 1000; // Convert to seconds
        return { score, latency };
    }
}
exports.PullRequest = PullRequest;
/**
 * RampUp class for calculating the ramp-up time metric
 */
class RampUp extends Metric {
    constructor(url) {
        super(url, 1);
        this.discussionCount = 0;
        this.score_calculation = 0;
        this.lenREADME = 0;
    }
    static getWeight() {
        return 1;
    }
    /**
     * Fetches the number of discussions in the repository
     */
    async getNumDiscussions() {
        const discussionResponse = await axios_1.default.get(`https://api.github.com/repos/${this.owner}/${this.repo}/discussions`, {
            headers: {
                'Authorization': `token ${process.env.GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        return Object.keys(discussionResponse.data).length;
    }
    /**
     * Fetches the length of the README file
     */
    async getLenREADME() {
        const README_response = await axios_1.default.get(`https://api.github.com/repos/${this.owner}/${this.repo}/readme`, {
            headers: {
                'Authorization': `token ${process.env.GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        return README_response.data.content.length;
    }
    /**
     * Calculates the ramp-up score based on discussions and README length
     */
    async calculate() {
        const startTime = Date.now();
        this.discussionCount = 0;
        this.score_calculation = 0;
        this.extractOwnerAndRepo();
        try {
            this.discussionCount = await this.getNumDiscussions();
        }
        catch (error) {
            this.discussionCount = 0;
            if (axios_1.default.isAxiosError(error) && error.response?.status === 410) {
                // 410 means discussions are disabled
                await log(`Discussions disabled on ${this.url}`, 2);
            }
            else if (axios_1.default.isAxiosError(error) && error.response?.status === 404) {
                // 404 means no discussions present
                await log(`No discussions on ${this.url}`, 2);
            }
            else {
                // For any other error, log it and return a score of 0
                await log(`Error checking discussions for ${this.url}: ${error}`, 2);
            }
        }
        // README check
        try {
            this.lenREADME = await this.getLenREADME();
        }
        catch (error) {
            await log(`Error checking discussions for ${this.url}: ${error}`, 2);
            this.lenREADME = 0;
        }
        // Calculate latency
        const latency = (Date.now() - startTime) / 1000; // Convert to seconds
        //discussion calculation
        if (this.discussionCount >= 10) {
            this.score_calculation += 0.5;
        }
        else {
            this.score_calculation += this.discussionCount / 10;
        }
        // readme calculation
        if (this.lenREADME != 0) {
            // good length /  too short
            if (this.lenREADME <= 5000) {
                this.score_calculation += 0.75 * (this.lenREADME / 5000);
            }
            // too long
            else {
                this.score_calculation += 0.75 * (10000 / this.lenREADME);
            }
        }
        else {
            this.score_calculation += 0; // no README
        }
        return { score: this.score_calculation > 1 ? 1 : this.score_calculation, latency };
    }
}
exports.RampUp = RampUp;
/**
 * Correctness class for calculating the correctness metric
 * This metric is based on two sub-metrics:
 * 1. Last CI job status (50% weight)
 *    The last CI job status is determined by the conclusion of the latest GitHub Actions run.
 * 2. Pull request fix ratio (50% weight)
 *    The pull request fix ratio is calculated as the ratio of open pull requests that contain 'fix' 'bug' or 'issue' in the title.
 * The final score is a weighted average of the two sub-metrics.
 */
class Correctness extends Metric {
    constructor(url) {
        super(url, 1);
    }
    static getWeight() {
        return 1;
    }
    async isLastJobSuccessful() {
        // TODO: can we only call the latest run? (instaed of calling all then only using the last one)
        // getting last run id
        try {
            const run_id_response = await axios_1.default.get(`https://api.github.com/repos/${this.owner}/${this.repo}/actions/runs`, {
                headers: {
                    'Authorization': `token ${process.env.GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            // if no CI are present (not as good as if they had made some and passed)
            if (run_id_response.data.total_count == 0) {
                return .75;
            }
            const run_id = run_id_response.data.workflow_runs[0].id;
            // getting last job status from last run id
            const runID_jobs_response = await axios_1.default.get(`https://api.github.com/repos/${this.owner}/${this.repo}/actions/runs/${run_id}/jobs`, {
                headers: {
                    'Authorization': `token ${process.env.GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            // if no jobs are present (not as good as if they had made some and passed)
            if (runID_jobs_response.data.total_count == 0) {
                return 0.75;
            }
            // main return value
            return runID_jobs_response.data.jobs[0].conclusion == 'success' ? 1 : 0;
        }
        catch (error) {
            await log(`Error checking CI job status for ${this.url}: ${error}`, 2);
            return 0;
        }
    }
    async getPullRequestFixRatio() {
        // Listing pull requests
        try {
            let numOpenPullFixes = 0;
            const pullsListResponse = await axios_1.default.get(`https://api.github.com/repos/${this.owner}/${this.repo}/pulls`, {
                headers: {
                    'Authorization': `token ${process.env.GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            // using results from API call to get number of pull requests
            const numPullRequests = pullsListResponse.data.length > 30 ? 30 : pullsListResponse.data.length;
            for (let i = 0; i < numPullRequests; i++) {
                // checks if pull request is open and contains 'fix' or 'bug' in title
                const pullData = pullsListResponse.data[i];
                if (pullData.state == 'open') {
                    if (pullData.title.includes('fix') || pullData.title.includes('bug') || pullData.title.includes('issue')) {
                        numOpenPullFixes++;
                    }
                }
            }
            // return the ratio of open pull requests that are fixes
            if (numPullRequests == 0) {
                return 0.75;
            }
            return (numPullRequests - numOpenPullFixes) / numPullRequests;
        }
        catch (error) {
            await log(`Error checking pull request info for ${this.url}: ${error}`, 2);
            return 0;
        }
    }
    async calculate() {
        this.extractOwnerAndRepo();
        const startTime = Date.now();
        // getting last job status (error handling in function)
        const lastJobStatus = await this.isLastJobSuccessful();
        // try getting pull request info (error handling in function)
        const getPullRequestFixRatio = await this.getPullRequestFixRatio();
        const latency = (Date.now() - startTime) / 1000; // Convert to seconds
        return { score: 0.5 * lastJobStatus + 0.5 * getPullRequestFixRatio, latency };
    }
}
exports.Correctness = Correctness;
/**
 * BusFactor class for calculating the bus factor metric
 */
class BusFactor extends Metric {
    constructor(url) {
        super(url, 3); // weight
    }
    static getWeight() {
        return 3;
    }
    /**
     * Calculates the bus factor score based on the number of contributors
     */
    async calculate() {
        const startTime = Date.now();
        try {
            // Extract owner and repo from the GitHub URL
            this.extractOwnerAndRepo();
            // Make a request to the GitHub API to get the contributors
            const response = await axios_1.default.get(`https://api.github.com/repos/${this.owner}/${this.repo}/contributors`, {
                headers: {
                    'Authorization': `token ${process.env.GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            const contributors = response.data;
            const contributorCount = contributors.length;
            // Calculate latency
            const latency = (Date.now() - startTime) / 1000; // Convert to seconds
            // Define thresholds for scoring based on the number of contributors
            let score = 0;
            if (contributorCount >= 30) {
                score = 1; // Very healthy project
            }
            else {
                score = contributorCount / 30; // Linear scaling for projects with less than 30 contributors
            }
            return { score, latency };
        }
        catch (error) {
            const latency = (Date.now() - startTime) / 1000;
            // Handle errors, such as a repository with no contributors or API errors
            if (axios_1.default.isAxiosError(error)) {
                await log(`Error retrieving contributors for ${this.url}: ${error}`, 2);
            }
            // Return a score of 0 in case of any error
            return { score: 0, latency };
        }
    }
}
exports.BusFactor = BusFactor;
/**
 * ResponsiveMaintainer Class
 *
 * This class extends the Metric class and is designed to calculate a responsiveness score
 * for a GitHub repository maintainer. It assesses the repository's maintenance quality
 * based on three main factors:
 *
 * 1. Issue handling (40% of the score)
 * 2. Pull request management (40% of the score)
 * 3. Commit frequency (20% of the score)
 *
 * The class uses the GitHub API to fetch relevant data and calculates individual scores
 * for each factor, which are then combined into an overall weighted score.
 */
class ResponsiveMaintainer extends Metric {
    constructor(url) {
        super(url, 2); // NetScore weight is 2
    }
    static getWeight() {
        return 2;
    }
    /**
     * Calculates the overall responsiveness score for the repository
     * @returns A Promise resolving to a MetricResult object containing the score and latency
     */
    async calculate() {
        const startTime = Date.now();
        // Extract owner and repo from the URL
        this.extractOwnerAndRepo();
        try {
            // Fetch all required metrics concurrently
            const [issueMetrics, pullRequestMetrics, commitFrequency] = await Promise.all([
                this.getIssueMetrics(),
                this.getPullRequestMetrics(),
                this.getCommitFrequency()
            ]);
            // Calculate individual scores
            const issueScore = this.calculateIssueScore(issueMetrics);
            const prScore = this.calculatePRScore(pullRequestMetrics);
            const commitScore = this.calculateCommitScore(commitFrequency);
            // Calculate overall score (weighted average)
            const overallScore = (issueScore * 0.4 + prScore * 0.4 + commitScore * 0.2);
            const latency = (Date.now() - startTime) / 1000; // Convert to seconds
            return { score: overallScore, latency };
        }
        catch (error) {
            await log(`Error calculating ResponsiveMaintainer score for ${this.url}: ${error}`, 2);
            return { score: 0, latency: (Date.now() - startTime) / 1000 };
        }
    }
    /**
     * Fetches issue-related metrics from the GitHub API
     * @returns An object containing average resolution time and open issues ratio
     */
    async getIssueMetrics() {
        try {
            const response = await axios_1.default.get(`https://api.github.com/repos/${this.owner}/${this.repo}/issues?state=all&per_page=100`, {
                headers: { 'Authorization': `token ${process.env.GITHUB_TOKEN}` }
            });
            const issues = response.data;
            const closedIssues = issues.filter((issue) => issue.state === 'closed');
            const totalIssues = issues.length;
            // Calculate average resolution time in days
            const resolutionTimes = closedIssues.map((issue) => {
                const createdAt = new Date(issue.created_at);
                const closedAt = new Date(issue.closed_at);
                return (closedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
            });
            const avgResolutionTime = resolutionTimes.length > 0 ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length : Infinity;
            const openIssuesRatio = totalIssues > 0 ? (totalIssues - closedIssues.length) / totalIssues : 1;
            return { avgResolutionTime, openIssuesRatio };
        }
        catch (error) {
            await this.handleApiError('getIssueMetrics', error);
            return { avgResolutionTime: Infinity, openIssuesRatio: 1 }; // Worst case scenario
        }
    }
    /**
     * Fetches pull request-related metrics from the GitHub API
     * @returns An object containing average merge time and open PRs ratio
     */
    async getPullRequestMetrics() {
        try {
            const response = await axios_1.default.get(`https://api.github.com/repos/${this.owner}/${this.repo}/pulls?state=all&per_page=100`, {
                headers: { 'Authorization': `token ${process.env.GITHUB_TOKEN}` }
            });
            const prs = response.data;
            const mergedPRs = prs.filter((pr) => pr.merged_at);
            const totalPRs = prs.length;
            // Calculate average merge time in days
            const mergeTimes = mergedPRs.map((pr) => {
                const createdAt = new Date(pr.created_at);
                const mergedAt = new Date(pr.merged_at);
                return (mergedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
            });
            const avgMergeTime = mergeTimes.length > 0 ? mergeTimes.reduce((a, b) => a + b, 0) / mergeTimes.length : Infinity;
            const openPRsRatio = totalPRs > 0 ? (totalPRs - mergedPRs.length) / totalPRs : 1;
            return { avgMergeTime, openPRsRatio };
        }
        catch (error) {
            await this.handleApiError('getPullRequestMetrics', error);
            return { avgMergeTime: Infinity, openPRsRatio: 1 }; // Worst case scenario
        }
    }
    /**
     * Fetches the number of commits made in the last year
     * @returns The number of commits made in the last year
     */
    async getCommitFrequency() {
        try {
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
            const response = await axios_1.default.get(`https://api.github.com/repos/${this.owner}/${this.repo}/commits?since=${oneYearAgo.toISOString()}&per_page=100`, {
                headers: { 'Authorization': `token ${process.env.GITHUB_TOKEN}` }
            });
            return response.data.length;
        }
        catch (error) {
            await this.handleApiError('getCommitFrequency', error);
            return 0; // Worst case scenario: no commits
        }
    }
    /**
     * Calculates the issue handling score based on average resolution time and open issues ratio
     * @param metrics Object containing avgResolutionTime and openIssuesRatio
     * @returns A score between 0 and 1
     */
    calculateIssueScore(metrics) {
        const resolutionScore = metrics.avgResolutionTime === Infinity ? 0 : Math.max(0, 1 - (metrics.avgResolutionTime / 30)); // Assuming 30 days as a limit
        const openIssuesScore = 1 - metrics.openIssuesRatio;
        return (resolutionScore + openIssuesScore) / 2;
    }
    /**
     * Calculates the pull request management score based on average merge time and open PRs ratio
     * @param metrics Object containing avgMergeTime and openPRsRatio
     * @returns A score between 0 and 1
     */
    calculatePRScore(metrics) {
        const mergeScore = metrics.avgMergeTime === Infinity ? 0 : Math.max(0, 1 - (metrics.avgMergeTime / 7)); // Assuming 7 days as a limit
        const openPRsScore = 1 - metrics.openPRsRatio;
        return (mergeScore + openPRsScore) / 2;
    }
    /**
     * Calculates the commit frequency score based on the number of commits in the last year
     * @param commitFrequency Number of commits in the last year
     * @returns A score between 0 and 1
     */
    calculateCommitScore(commitFrequency) {
        // Assuming 52 commits (1 per week) as a good baseline for active maintenance
        return Math.min(1, commitFrequency / 52);
    }
    /**
     * Handles and logs API errors
     * @param method The name of the method where the error occurred
     * @param error The error object
     */
    async handleApiError(method, error) {
        if (axios_1.default.isAxiosError(error)) {
            if (error.response) {
                switch (error.response.status) {
                    case 404:
                        await log(`${method}: Repository not found or API endpoint doesn't exist`, 2);
                        break;
                    case 403:
                        await log(`${method}: API rate limit exceeded or lacking permissions`, 2);
                        break;
                    case 401:
                        await log(`${method}: Unauthorized. Check your GitHub token`, 2);
                        break;
                    default:
                        await log(`${method}: API request failed with status ${error.response.status}`, 2);
                }
            }
            else if (error.request) {
                await log(`${method}: No response received from the server`, 2);
            }
            else {
                await log(`${method}: Error setting up the request`, 2);
            }
        }
        else {
            await log(`${method}: Non-Axios error occurred: ${error}`, 2);
        }
    }
}
exports.ResponsiveMaintainer = ResponsiveMaintainer;
/**
 * License Class
 *
 * This class extends the Metric class and is designed to check if a GitHub repository
 * has a compatible license. It uses the isomorphic-git library to clone the repository
 * The score is binary: 1 if a license is compatible, 0 otherwise.
 * also stores the license (and README if needed) in a local directory for future reference
 * NO API CALLS
 */
class License extends Metric {
    constructor(url) {
        super(url, 1); // License weight is 1
    }
    static getWeight() {
        return 1;
    }
    // clones license from repoURL into dir
    // TODO urls with ssh will not work, sometimes happens with npm packages
    async cloneLicenseFile(repoUrl) {
        const dir = `./repo-licenses/${this.repo}`;
        // Ensure the directory exists
        if (!(0, fs_1.existsSync)(dir)) {
            (0, fs_1.mkdirSync)(dir, { recursive: true });
        }
        // Clone the repository
        await git.clone({
            fs: fs_1.promises,
            http,
            dir,
            url: repoUrl,
            singleBranch: true,
            depth: 1,
            noCheckout: true,
        });
        // Checkout only the LICENSE file
        await git.checkout({
            fs: fs_1.promises,
            dir,
            ref: 'HEAD',
            filepaths: ['LICENSE'],
            force: true,
        });
        // get license from local directory, different extensions used
        const licenseFiles = ['/LICENSE', '/LICENSE.md', '/LICENSE.txt'];
        for (const file of licenseFiles) {
            const licensePathWithFile = path.join(dir, file);
            if ((0, fs_1.existsSync)(licensePathWithFile)) {
                const licenseContent = (0, fs_1.readFileSync)(licensePathWithFile, 'utf8');
                await log(`Found ${file} for: ${repoUrl}`, 2);
                return licenseContent;
            }
        }
        // Could not find LICENSE in local directory
        await log(`LICENSE not found for: ${repoUrl}`, 2);
        return 'null';
    }
    /**
     * Clones the README file from the repository and checks for the word "license"
     * @returns The contents of the README file if it contains the word "license", 'null' otherwise
     * only runs if no LICENSE file is found
     */
    async cloneREADMElicense() {
        const dir = `./repo-readmes/${this.repo}`;
        // Ensure the directory exists
        if (!(0, fs_1.existsSync)(dir)) {
            (0, fs_1.mkdirSync)(dir, { recursive: true });
        }
        // Clone the repository
        await git.clone({
            fs: fs_1.promises,
            http,
            dir,
            url: this.url,
            singleBranch: true,
            depth: 1,
            noCheckout: true,
        });
        // Checkout only the README file
        await git.checkout({
            fs: fs_1.promises,
            dir,
            ref: 'HEAD',
            filepaths: ['README.md'],
            force: true,
        });
        // Read the README file
        const readmePath = path.join(dir, 'README.md');
        if ((0, fs_1.existsSync)(readmePath)) {
            const readmeContent = (0, fs_1.readFileSync)(readmePath, 'utf8');
            if (readmeContent.toLowerCase().includes('license')) {
                await log(`Found "license" in README for: ${this.url}`, 2);
                return readmeContent;
            }
        }
        await log(`"license" not found in README for: ${this.url}`, 2);
        return 'null';
    }
    /**
     * Calculates the license score for the repository
     * @returns A Promise resolving to a MetricResult object containing the score and latency
     */
    async calculate() {
        const startTime = Date.now();
        this.extractOwnerAndRepo();
        // checking for license file
        try {
            // Extract owner and repo from the GitHub URL
            const license = await this.cloneLicenseFile(this.url);
            if (license != 'null') {
                // Calculate latency
                const latency = (Date.now() - startTime) / 1000; // Convert to seconds
                // Return a score of 1 if license is compatable, 0 otherwise
                if (license.includes('MIT') || license.includes('Apache 2.0') || license.includes('GPLv2') || license.includes('GNU')) {
                    return { score: 1, latency };
                }
            }
        }
        catch (error) {
            await log(`Error checking license for ${this.url}: ${error}`, 2);
        }
        // checking for license in README
        // only runs if no LICENSE file is found
        try {
            const READMElicense = await this.cloneREADMElicense();
            if (READMElicense != 'null') {
                const latency = (Date.now() - startTime) / 1000;
                if (READMElicense.includes('MIT') || READMElicense.includes('Apache 2.0') || READMElicense.includes('GPLv2') || READMElicense.includes('GNU')) {
                    return { score: 1, latency };
                }
            }
        }
        catch (error) {
            await log(`Error checking README for license for ${this.url}: ${error}`, 2);
        }
        // return a score of 0 if no license is found or not one of the compatable licenses
        const latency = (Date.now() - startTime) / 1000;
        return { score: 0, latency };
    }
}
exports.License = License;
/**
 * URLHandler Class
 *
 * This class is responsible for processing a given URL, creating instances of various
 * metric classes, calculating their scores, and combining them into a final result.
 * It also handles the conversion of npm package URLs to GitHub repository URLs.
 */
class URLHandler {
    constructor(url) {
        this.url = url;
        this.metricClasses = [RampUp, Correctness, BusFactor, ResponsiveMaintainer, License, PullRequest, FractionalDependency];
    }
    /**
     * Resolves an npm package URL to its corresponding GitHub repository URL
     * @param url The npm package URL
     * @returns A Promise resolving to the GitHub repository URL or the original URL if not found
     */
    async resolveNpmToGithub(url) {
        if (url.includes("npmjs.com")) {
            const packageName = url.split('/').pop();
            if (!packageName) {
                return url;
            }
            const githubRepo = await getGithubRepoFromNpm(packageName);
            if (githubRepo) {
                await log(`Found GitHub repository for package ${packageName}: ${githubRepo}`, 1);
                return githubRepo;
            }
            else {
                return url;
            }
        }
        return url;
    }
    createWorker(MetricClass, url) {
        return new Promise((resolve, reject) => {
            const worker = new worker_threads_1.Worker(__filename, {
                workerData: { metricClassName: MetricClass.name, url }
            });
            worker.on('message', resolve);
            worker.on('error', reject);
            worker.on('exit', (code) => {
                if (code !== 0)
                    reject(new Error(`Worker stopped with exit code ${code}`));
            });
        });
    }
    /**
     * Processes the URL by calculating scores for all metrics and combining them
     * Process the metrics in parallel
     * @returns A Promise resolving to a JSON string containing all metric scores and latencies
     */
    async processURL() {
        const results = {};
        let weightedScoreSum = 0;
        let totalWeight = 0;
        let netScoreLatency = 0;
        const startTime = Date.now();
        // Resolve npm URL to GitHub if necessary
        const resolvedUrl = await this.resolveNpmToGithub(this.url);
        // Create workers for each metric
        const workerPromises = this.metricClasses.map(MetricClass => this.createWorker(MetricClass, resolvedUrl));
        // Wait for all workers to complete
        const metricResults = await Promise.all(workerPromises);
        // Process results
        this.metricClasses.forEach((MetricClass, index) => {
            const { score, latency } = metricResults[index];
            const metricName = MetricClass.name;
            const weight = MetricClass.getWeight();
            results[metricName] = Number(score.toFixed(3));
            results[`${metricName}_Latency`] = Number(latency.toFixed(3));
            weightedScoreSum += score * weight;
            totalWeight += weight;
        });
        netScoreLatency = (Date.now() - startTime) / 1000; // Convert to seconds
        // Calculate NetScore and NetScore_Latency
        const netScore = Number((weightedScoreSum / totalWeight).toFixed(3));
        const netScoreLatencyRounded = Number(netScoreLatency.toFixed(3));
        // Create the final output object with NetScore and NetScore_Latency first
        const finalOutput = {
            URL: this.url,
            NetScore: netScore,
            NetScore_Latency: netScoreLatencyRounded,
            ...results
        };
        return JSON.stringify(finalOutput);
    }
}
exports.URLHandler = URLHandler;
if (!worker_threads_1.isMainThread) {
    const metricClasses = {
        RampUp,
        Correctness,
        BusFactor,
        ResponsiveMaintainer,
        License,
        PullRequest,
        FractionalDependency
    };
    const runMetric = async () => {
        const { metricClassName, url } = worker_threads_1.workerData;
        const MetricClass = metricClasses[metricClassName];
        if (!MetricClass) {
            throw new Error(`Unknown metric class: ${metricClassName}`);
        }
        const metric = new MetricClass(url);
        const result = await metric.calculate();
        if (worker_threads_1.parentPort) {
            worker_threads_1.parentPort.postMessage(result);
        }
        else {
            console.error('parentPort is null');
        }
    };
    runMetric().catch(error => {
        console.error(error);
        process.exit(1);
    });
}
/**
 * Checks if a given string is a valid URL
 * @param url The string to check
 * @returns true if the string is a valid URL, false otherwise
 */
function isValidUrl(url) {
    try {
        new URL(url);
        return true;
    }
    catch (error) {
        return false;
    }
}
async function processURL(url) {
    if (!isValidUrl(url)) {
        await log(`Invalid URL: ${url}`, 2);
        return "ERROR";
    }
    await log(`Processing URL: ${url}`, 1);
    const handler = new URLHandler(url);
    const result = await handler.processURL();
    return result;
}
/**
 * Processes a file containing URLs
 * @param urlFile The path to the file containing URLs
 */
async function processURLs(urlFile) {
    try {
        const urls = await fs_1.promises.readFile(urlFile, 'utf-8');
        const urlList = urls.split('\n').filter(url => url.trim() !== '');
        for (const url of urlList) {
            if (!isValidUrl(url)) {
                await log(`Invalid URL: ${url}`, 2);
                continue;
            }
            await log(`Processing URL: ${url}`, 1);
            const handler = new URLHandler(url);
            const result = await handler.processURL();
            console.log(result); // This will output each result as a separate line in NDJSON format
            await log(`Finished Processing URL: ${url}`, 1);
        }
    }
    catch (error) {
        console.error(JSON.stringify({ error: `Error processing URLs: ${error}` }));
        await log(`Error processing URLs: ${error}`, 2);
        process.exit(1);
    }
}
/**
 * Runs tests and logs the results
 */
async function runTests() {
    log('Running tests', 1);
    try {
        // Run Jest with coverage
        const result = (0, child_process_1.execSync)('npm test', { encoding: 'utf-8' });
        // Parse the Jest output
        const lines = result.split('\n');
        const lineCoverage = lines.find((line) => line.includes('All files'))?.split('|')[4].trim();
        const testSummary = lines.find((line) => line.includes('Tests:'));
        const [, passed, total] = testSummary?.match(/(\d+) passed, (\d+) total/) || [];
        console.log(`Total: ${total}`);
        console.log(`Passed: ${passed}`);
        console.log(`Coverage: ${lineCoverage}%`);
        console.log(`${passed}/${total} test cases passed. ${lineCoverage}% line coverage achieved.`);
        await log('Tests completed', 1);
    }
    catch (error) {
        console.error('Error running tests:', error);
        await log(`Error running tests: ${error}`, 2);
    }
}
/**
 * Main function that handles command-line arguments and executes the appropriate action
 */
async function main() {
    const command = process.argv[2];
    // check if GITHUB_TOKEN is valid
    axios_1.default.get('https://api.github.com', {
        headers: {
            'Authorization': `token ${process.env.GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json'
        }
    }).then(() => {
        log('GITHUB_TOKEN is valid', 2);
    }).catch(() => {
        console.error("GITHUB_TOKEN is invalid");
        log('GITHUB_TOKEN is invalid', 2);
        process.exit(1);
    });
    switch (command) {
        case 'test':
            log('Test Case', 1);
            await runTests();
            break;
        default:
            if (command) {
                log('URL Case', 1);
                await processURLs(command);
            }
            else {
                const errorMessage = 'Invalid command. Usage: ./run [install|test|URL_FILE]';
                console.error(JSON.stringify({ error: errorMessage }));
                await log(`Invalid command ${command}. ${errorMessage}`, 2);
                process.exit(1);
            }
    }
    process.exit(0);
}
// Execute the main function and handle any uncaught errors
if (worker_threads_1.isMainThread) {
    if (require.main === module) {
        main().catch(async (error) => {
            console.error(JSON.stringify({ error: `Fatal error: ${error}` }));
            await log(`Fatal error: ${error}`, 1);
            process.exit(1);
        });
    }
}
