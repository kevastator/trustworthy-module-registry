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
const Res200 = {
    statusCode: 200,
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify({
        message: "Version is updated."
    })
};
const Err400 = {
    statusCode: 400,
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify({
        message: "There is missing field(s) in the PackageID or it is formed improperly, or is invalid."
    })
};
const Err404 = {
    statusCode: 404,
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify({
        message: "Package does not exist."
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
    const ID = event.pathParameters.id;
    try {
        body = JSON.parse(event.body);
    }
    catch {
        return Err400;
    }
    //const id = body.metadata.ID;
    const Version = body.metadata.Version;
    const Name = body.metadata.Name;
    const metaID = body.metadata.ID;
    const URL = body.data.URL;
    const Content = body.data.Content;
    const NameData = body.data.Name;
    var debloat = body.data.debloat;
    if (debloat == undefined) {
        debloat = false;
    }
    if ((URL == undefined && Content == undefined) || (URL != undefined && Content != undefined) || ID == undefined || !(0, s3_repo_1.checkValidVersion)(Version) || metaID != ID) {
        return Err400;
    }
    const versionExistCheck = await (0, s3_repo_1.checkPrefixExists)(Name + s3_repo_1.delimeter + Version);
    if (versionExistCheck) {
        return Err409;
    }
    const updateFields = await (0, s3_repo_1.getPrefixParamsByID)(ID);
    if (updateFields.Version == "") {
        return Err404;
    }
    if (updateFields.Name != Name || !(0, s3_repo_1.versionGreaterThan)(Version, updateFields.Version)) {
        return Err400;
    }
    const byContentCheck = await (0, s3_repo_1.checkIfUploadByContent)(ID);
    if ((Content == undefined) == byContentCheck) {
        return Err400;
    }
    try {
        // Create random directory with number and make sure it does not exist
        let dir = "/tmp/repo/" + String(Math.floor(Math.random() * (100000 - 1 + 1)) + 1);
        while ((0, fs_1.existsSync)(dir)) {
            dir = "/tmp/repo/" + String(Math.floor(Math.random() * (100000 - 1 + 1)) + 1);
        }
        // URL Proceedure
        if (URL != undefined) {
            return urlExtract(URL, dir, Name, Version, debloat);
        }
        // Content Proceedure
        else {
            // Check formatting of the Name
            if (Name == undefined || Name.includes("/")) {
                return Err400;
            }
            return contentExtract(Content, dir, Name, Version, debloat);
        }
    }
    catch {
        return Err400;
    }
};
exports.handler = handler;
async function urlExtract(testurl, dir, Name, Version, debloat) {
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
    //const base64 = zipBuffer.toString('base64');
    // Send Rating to json
    rating.Cost = zipBuffer.byteLength / 1000000;
    rating.ByContent = false;
    (0, fs_1.writeFileSync)(dir + ".json", JSON.stringify(rating));
    // S3 (Version and ID)
    const id = await (0, s3_repo_1.uploadPackage)(dir, Name, Version, debloat);
    // OLD RESULTS
    // const result = {
    //     statusCode: 201,
    //     headers: {
    //         "Content-Type": "application/json"
    //     },
    //     body: JSON.stringify({
    //         metadata: {
    //             Name: Name,
    //             Version: version,
    //             ID: id
    //         },
    //         data: {
    //             Content: base64,
    //             URL: validURL
    //         }
    //     })
    // };
    return Res200;
}
async function contentExtract(content, dir, Name, Version, debloat) {
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
    //var base64 = zipBufferd.toString('base64');
    // Send Rating to json
    rating.Cost = zipBufferd.byteLength / 1000000;
    rating.ByContent = true;
    (0, fs_1.writeFileSync)(dir + ".json", JSON.stringify(rating));
    // UPLOAD TO S3 (Version and ID)
    const id = await (0, s3_repo_1.uploadPackage)(dir, Name, Version, debloat);
    // const result = {
    //     statusCode: 201,
    //     headers: {
    //         "Content-Type": "application/json"
    //     },
    //     body: JSON.stringify({
    //         metadata: {
    //             Name: Name,
    //             Version: "1.0.0",
    //             ID: id
    //         },
    //         data: {
    //             Content: base64
    //         }
    //     })
    // };
    return Res200;
}
async function mainTest() {
    const result = await urlExtract("https://github.com/kevastator/461-acme-service", "test/zipTest", "461-acme-service", "2.0.0", true);
    console.log(result);
}
if (process.env.AWS_SECRET_ACCESS_KEY && process.env.AWS_ACCESS_KEY) {
    mainTest();
}
