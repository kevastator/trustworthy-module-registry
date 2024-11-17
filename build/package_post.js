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
const simple_git_1 = __importDefault(require("simple-git"));
const fs_1 = require("fs");
const archiver_1 = __importDefault(require("archiver"));
const unzipper = __importStar(require("unzipper"));
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
    if ((url == undefined && content == undefined) || (url != undefined && content != undefined) || JS == undefined) {
        return Err400;
    }
    try {
        // URL Proceedure
        if (url != undefined) {
            return urlExtract(url, "/tmp/repo", JS);
        }
        // Content Proceedure
        else {
            const Name = event.Name;
            if (Name == undefined) {
                return Err400;
            }
            return contentExtract(content, "/tmp/repo", JS, Name);
        }
    }
    catch {
        return Err400;
    }
};
exports.handler = handler;
async function urlExtract(testurl, dir, JSProgram) {
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
    const ratedResult = (await (0, rate_1.processURL)(validURL)).NetScore;
    if (ratedResult < 0.5) {
        return Err424;
    }
    // Ensure the directory exists
    if (!(0, fs_1.existsSync)(dir)) {
        (0, fs_1.mkdirSync)(dir, { recursive: true });
    }
    // Clone the repository
    try {
        await (0, simple_git_1.default)().clone(validURL, dir);
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
    const zipBuffer = (0, fs_1.readFileSync)(zipdir);
    const base64 = zipBuffer.toString('base64');
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
                URL: validURL,
                JSProgram: JSProgram
            }
        }
    };
    return result;
}
async function contentExtract(content, dir, JSProgram, Name) {
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
    // TODO RATE
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
                Content: content,
                JSProgram: JSProgram
            }
        }
    };
    return result;
}
