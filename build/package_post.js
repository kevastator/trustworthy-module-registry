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
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify({
        message: "There is missing field(s) in the PackageData or it is formed improperly (e.g. Content and URL ar both set)"
    })
};
const Err409 = {
    statusCode: 409,
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify({
        message: "Package exists already."
    })
};
const Err424 = {
    statusCode: 424,
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify({
        message: "Package is not uploaded due to the disqualified rating."
    })
};
const handler = async (event, context) => {
    let body = undefined;
    try {
        body = JSON.parse(event.body);
    }
    catch {
        return Err400;
    }
    const url = body.URL;
    const content = body.Content;
    var debloat = body.debloat;
    if (debloat == undefined) {
        debloat = false;
    }
    if ((url == undefined && content == undefined) || (url != undefined && content != undefined)) {
        return Err400;
    }
    try {
        // Create random directory with number and make sure it does not exist
        let dir = "/tmp/repo/" + String(Math.floor(Math.random() * (100000 - 1 + 1)) + 1);
        while ((0, fs_1.existsSync)(dir)) {
            dir = "/tmp/repo/" + String(Math.floor(Math.random() * (100000 - 1 + 1)) + 1);
        }
        // URL Proceedure
        if (url != undefined) {
            return urlExtract(url, dir, debloat);
        }
        // Content Proceedure
        else {
            const Name = body.Name;
            // Check formatting of the Name
            if (Name == undefined || Name.includes("/")) {
                return Err400;
            }
            return contentExtract(content, dir, Name, debloat);
        }
    }
    catch {
        return Err400;
    }
};
exports.handler = handler;
async function urlExtract(testurl, dir, debloat) {
    // Check if the url is valid, if not return 400
    if (!(0, rate_1.isValidUrl)(testurl)) {
        return Err400;
    }
    // Convert to a valid repo and define the dir for the cloned repo
    let validURL = await (0, rate_1.resolveNpmToGithub)(testurl);
    // const urlStringList: string[] = testurl.split("/");
    // var Name: string = urlStringList[urlStringList.length - 1];
    // Name = Name[0].toUpperCase() + Name.slice(1);
    // Rate Package
    let rating = await (0, rate_1.processURL)(validURL);
    const ratedResult = rating.NetScore;
    if (ratedResult <= 0.5) {
        return Err424;
    }
    // Ensure the directory exists
    if (!(0, fs_1.existsSync)(dir)) {
        (0, fs_1.mkdirSync)(dir, { recursive: true });
    }
    var Name = "";
    var version = "";
    var dependencies = {};
    // Clone the repository
    try {
        if (validURL.indexOf("git") == 0) {
            validURL = "https" + validURL.slice(3);
        }
        await git.clone({
            fs: fs_1.promises,
            http,
            dir,
            url: validURL,
            singleBranch: true,
            depth: 1
        });
        await (0, promises_1.setTimeout)(100);
        const packageData = await (0, fs_1.readFileSync)(dir + "/package.json", "utf-8");
        const packageJson = JSON.parse(packageData);
        // Check if the name and version are properly in the package json file to be uploaded
        if ("name" in packageJson && "version" in packageJson && !packageJson.name.includes("/") && (0, s3_repo_1.checkValidVersion)(packageJson.version)) {
            Name = packageJson.name;
            version = packageJson.version;
        }
        else if ("name" in packageJson && !packageJson.name.includes("/")) {
            Name = packageJson.name;
            version = "1.0.0";
        }
        else {
            return Err400;
        }
        if ("dependencies" in packageJson) {
            dependencies = packageJson.dependencies;
        }
    }
    catch (err) {
        console.log(err);
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
    rating.Cost = zipBuffer.byteLength / 1000000;
    rating.ByContent = false;
    rating.Dependencies = dependencies;
    var dependencies = {};
    (0, fs_1.writeFileSync)(dir + ".json", JSON.stringify(rating));
    // Check if the package exists -> Return 409 if not!
    const prefixCheck = await (0, s3_repo_1.checkPrefixExists)(Name);
    if (prefixCheck) {
        return Err409;
    }
    // S3 (Version and ID)
    const id = await (0, s3_repo_1.uploadPackage)(dir, Name, version, debloat);
    const result = {
        statusCode: 201,
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            metadata: {
                Name: Name,
                Version: version,
                ID: id
            },
            data: {
                Content: base64,
                URL: validURL
            }
        })
    };
    return result;
}
async function contentExtract(content, dir, Name, debloat) {
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
    // Wait 10 ms for finalize and convert to base64
    await (0, promises_1.setTimeout)(100);
    // Rate and Pass
    try {
        const packageData = await (0, fs_1.readFileSync)(dir + "/package.json", "utf-8");
        const packageJson = JSON.parse(packageData);
        let testurl = "";
        var dependencies = {};
        // Find the Test URL
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
        if ("dependencies" in packageJson) {
            dependencies = packageJson.dependencies;
        }
        // Disqualify Based on no URL present
        if (testurl == "") {
            return Err424;
        }
        // Convert to a valid repo and define the dir for the cloned repo
        const validURL = await (0, rate_1.resolveNpmToGithub)(testurl);
        // Rate Package
        var rating = await (0, rate_1.processURL)(validURL);
        if (rating.NetScore <= 0.5) {
            return Err424;
        }
    }
    catch {
        return Err424;
    }
    // Debloat the package if true
    (0, debloat_1.debloatPackage)(zipFileDir, debloat);
    const zipBufferd = (0, fs_1.readFileSync)(zipFileDir);
    var base64 = zipBufferd.toString('base64');
    // Send Rating to json
    rating.Cost = zipBufferd.byteLength / 1000000;
    rating.ByContent = true;
    rating.Dependencies = dependencies;
    (0, fs_1.writeFileSync)(dir + ".json", JSON.stringify(rating));
    // Check if the package exists -> Return 409 if not!
    const prefixCheck = await (0, s3_repo_1.checkPrefixExists)(Name);
    if (prefixCheck) {
        return Err409;
    }
    // UPLOAD TO S3 (Version and ID)
    const id = await (0, s3_repo_1.uploadPackage)(dir, Name, "1.0.0", debloat);
    const result = {
        statusCode: 201,
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            metadata: {
                Name: Name,
                Version: "1.0.0",
                ID: id
            },
            data: {
                Content: base64
            }
        })
    };
    return result;
}
async function mainTest() {
    const result = await urlExtract("https://www.npmjs.com/package/react", "test/zipTest", false);
    console.log(result);
    try {
        const body = JSON.parse(result.body);
        const result2 = await contentExtract(body.data.Content, "test/zipTest2", body.metadata.Name, false);
        console.log(result2);
    }
    catch (err) {
        console.log(err);
        console.log("Loopback could not be performed due to no content generated");
    }
}
if (process.env.AWS_SECRET_ACCESS_KEY && process.env.AWS_ACCESS_KEY) {
    mainTest();
}
