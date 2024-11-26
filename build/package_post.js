"use strict";
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
exports.handler = void 0;
const rate_1 = require("./rate");
const debloat_1 = require("./debloat");
const s3_repo_1 = require("./s3_repo");
const fs_1 = require("fs");
const archiver_1 = __importDefault(require("archiver"));
const unzipper = __importStar(require("unzipper"));
const http = __importStar(require("isomorphic-git/http/node"));
const git = __importStar(require("isomorphic-git"));
const promises_1 = require("timers/promises");
const Err400 = {
    statusCode: 400,
    body: {
        message: "There is missing field(s) in the PackageData or it is formed improperly (e.g. Content and URL ar both set)"
    }
};
const Err409 = {
    statusCode: 409,
    body: {
        message: "Package exists already."
    }
};
const Err424 = {
    statusCode: 424,
    body: {
        message: "Package is not uploaded due to the disqualified rating."
    }
};
const handler = async (event, context) => {
    const url = event.URL;
    const content = event.Content;
    const JS = event.JSProgram;
    var debloat = event.debloat;
    if (debloat == undefined) {
        debloat = false;
    }
    if ((url == undefined && content == undefined) || (url != undefined && content != undefined) || JS == undefined) {
        return Err400;
    }
    try {
        // URL Proceedure
        if (url != undefined) {
            return urlExtract(url, "/tmp/repo", JS, debloat);
        }
        // Content Proceedure
        else {
            const Name = event.Name;
            if (Name == undefined) {
                return Err400;
            }
            return contentExtract(content, "/tmp/repo", JS, Name, debloat);
        }
    }
    catch {
        return Err400;
    }
};
exports.handler = handler;
async function urlExtract(testurl, dir, JSProgram, debloat) {
    // Check if the url is valid, if not return 400
    if (!(0, rate_1.isValidUrl)(testurl)) {
        return Err400;
    }
    // Convert to a valid repo and define the dir for the cloned repo
    const validURL = await (0, rate_1.resolveNpmToGithub)(testurl);
    const urlStringList = testurl.split("/");
    var Name = urlStringList[urlStringList.length - 1];
    Name = Name[0].toUpperCase() + Name.slice(1);
    // Rate Package
    const rating = await (0, rate_1.processURL)(validURL);
    const ratedResult = rating.NetScore;
    if (ratedResult < 0.5) {
        return Err424;
    }
    // Ensure the directory exists
    if (!(0, fs_1.existsSync)(dir)) {
        (0, fs_1.mkdirSync)(dir, { recursive: true });
    }
    // Clone the repository
    try {
        await git.clone({
            fs: fs_1.promises,
            http,
            dir,
            url: validURL,
        });
    }
    catch {
        return Err400;
    }
    // Use Archiver to create a zip file from this dir
    const zipdir = dir + ".zip";
    const output = (0, fs_1.createWriteStream)(zipdir);
    const archive = (0, archiver_1.default)('zip');
    archive.on('error', function (err) {
        throw err;
    });
    archive.pipe(output);
    archive.directory(dir, false);
    await archive.finalize();
    // Wait 10 ms for finalize and convert to base64
    await (0, promises_1.setTimeout)(10);
    (0, debloat_1.debloatPackage)(zipdir, debloat);
    const zipBuffer = (0, fs_1.readFileSync)(zipdir);
    const base64 = zipBuffer.toString('base64');
    // Send Rating to json
    (0, fs_1.writeFileSync)(dir + ".json", JSON.stringify(rating));
    // Check if the package exists -> Return 409 if not!
    const prefixCheck = await (0, s3_repo_1.checkPrefixExists)(Name);
    if (prefixCheck) {
        return Err409;
    }
    // S3 (Version and ID)
    const id = await (0, s3_repo_1.uploadPackage)(dir, Name);
    const result = {
        statusCode: 201,
        body: {
            metadata: {
                Name: Name,
                Version: "1.0.0",
                ID: id
            },
            data: {
                Content: base64,
                URL: validURL,
                JSProgram: JSProgram
            }
        }
    };
    return result;
}
async function contentExtract(content, dir, JSProgram, Name, debloat) {
    // Create the buffer
    const zipBuffer = Buffer.from(content, 'base64');
    // Ensure the directory exists
    if (!(0, fs_1.existsSync)(dir)) {
        (0, fs_1.mkdirSync)(dir, { recursive: true });
    }
    const zipFileDir = dir + ".zip";
    // Write the file to the zip directory
    (0, fs_1.writeFileSync)(zipFileDir, zipBuffer);
    // Unzip the file
    const extractDir = await unzipper.Open.file(zipFileDir);
    extractDir.extract({ path: dir });
    // Rate and Pass
    try {
        const packageData = await (0, fs_1.readFileSync)(dir + "/package.json", "utf-8");
        const packageJson = JSON.parse(packageData);
        let testurl = "";
        if ("homepage" in packageJson) {
            testurl = packageJson.homepage;
        }
        else if ("repository" in packageJson && "url" in packageJson.repository) {
            testurl = packageJson.repository.url;
            if (testurl.includes("git+")) {
                testurl = testurl.split("git+")[1];
            }
            if (testurl.includes(".git")) {
                testurl = testurl.split(".git")[0];
            }
        }
        if (testurl == "") {
            return Err424;
        }
        // Convert to a valid repo and define the dir for the cloned repo
        const validURL = await (0, rate_1.resolveNpmToGithub)(testurl);
        // Rate Package
        const ratedResult = (await (0, rate_1.processURL)(validURL)).NetScore;
        if (ratedResult < 0.5) {
            return Err424;
        }
        (0, debloat_1.debloatPackage)(zipFileDir, debloat);
        const zipBufferd = (0, fs_1.readFileSync)(zipFileDir);
        var base64 = zipBufferd.toString('base64');
    }
    catch {
        return Err424;
    }
    // TODO UPLOAD TO S3 (Version and ID)
    const result = {
        statusCode: 201,
        body: {
            metadata: {
                Name: Name,
                Version: "1.0.0",
                ID: "1812719"
            },
            data: {
                Content: base64,
                JSProgram: JSProgram
            }
        }
    };
    return result;
}
async function mainTest() {
    const result = await urlExtract("https://github.com/kevastator/461-acme-service", "test/zipTest", "null", false);
    console.log(result);
    try {
        const result2 = await contentExtract(result.body.data.Content, "test/zipTest2", "null", result.body.metadata.Name, false);
        console.log(result2);
    }
    catch {
        console.log("Loopback could not be performed due to no content generated");
    }
}
if (process.env.AWS_SECRET_ACCESS_KEY && process.env.AWS_ACCESS_KEY) {
    mainTest();
}
