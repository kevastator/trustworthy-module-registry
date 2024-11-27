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
exports.uploadPackage = uploadPackage;
exports.checkPrefixExists = checkPrefixExists;
exports.reset = reset;
exports.getByID = getByID;
exports.versionGreaterThan = versionGreaterThan;
exports.checkValidVersion = checkValidVersion;
const AWS = __importStar(require("aws-sdk"));
const dotenv_1 = __importDefault(require("dotenv"));
const fs = __importStar(require("fs"));
dotenv_1.default.config();
if (!process.env.AWS_REGION) {
    console.error(JSON.stringify({ error: "AWS_REGION environment variable is not set" }));
    process.exit(1);
}
if (process.env.AWS_SECRET_ACCESS_KEY && process.env.AWS_ACCESS_KEY) {
    AWS.config.update({
        accessKeyId: process.env.AWS_ACCESS_KEY,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION,
    });
}
const s3 = new AWS.S3({
    signatureVersion: 'v4'
});
const delimeter = "/";
const bucketName = "trust-repository";
const exampleKey = "MyName" + delimeter + "1.0.0" + delimeter + "MyName-1" + delimeter + "zip";
async function uploadPackage(dir, name) {
    try {
        const fileStreamZip = fs.createReadStream(dir + ".zip");
        const id = await getUniqueID(name);
        const pathName = name + delimeter + "1.0.0" + delimeter + id;
        const paramsZip = {
            Bucket: bucketName,
            Key: pathName + delimeter + "zip", // The S3 key (file name) where you want to store the file
            Body: fileStreamZip
        };
        const uploadResultZip = await s3.upload(paramsZip).promise();
        const fileStreamJson = fs.createReadStream(dir + ".json");
        const paramsJson = {
            Bucket: bucketName,
            Key: pathName + delimeter + "json", // The S3 key (file name) where you want to store the file
            Body: fileStreamJson
        };
        const uploadResultJson = await s3.upload(paramsJson).promise();
        return id;
    }
    catch (err) {
        console.log(err);
        return "err";
    }
}
async function getUniqueID(packageName) {
    const params = {
        Bucket: bucketName,
        Prefix: packageName + "/",
    };
    const keys = [];
    let continuationToken = undefined;
    let isTruncated = true; // To check if there are more objects to list
    while (isTruncated) {
        try {
            if (continuationToken) {
                params.ContinuationToken = continuationToken; // Set continuation token for pagination
            }
            const data = await s3.listObjectsV2(params).promise();
            if (data.Contents) {
                data.Contents.forEach((object) => {
                    keys.push(object.Key || '');
                });
            }
            isTruncated = data.IsTruncated;
            continuationToken = data.NextContinuationToken;
        }
        catch (err) {
            console.log(err);
            break;
        }
    }
    let max = 0;
    keys.forEach(key => {
        let testNum = Number(key.split(delimeter)[2].replace(packageName + "-", ""));
        if (testNum > max) {
            max = testNum;
        }
    });
    return packageName + "-" + String(max + 1);
}
async function checkPrefixExists(packageName) {
    const params = {
        Bucket: bucketName,
        Prefix: packageName + "/",
        MaxKeys: 1
    };
    try {
        const data = await s3.listObjectsV2(params).promise();
        if (data.Contents && data.Contents.length > 0) {
            return true;
        }
        else {
            return false;
        }
    }
    catch (err) {
        console.error('Error checking prefix:', err);
        return false;
    }
}
async function reset() {
    const params = {
        Bucket: bucketName,
    };
    let continuationToken = undefined;
    let isTruncated = true; // To check if there are more objects to list
    const deleteParams = {
        Bucket: bucketName,
        Delete: { Objects: [] }, // Array of objects to delete
    };
    try {
        while (isTruncated) {
            if (continuationToken) {
                params.ContinuationToken = continuationToken;
            }
            const data = await s3.listObjectsV2(params).promise();
            if (data.Contents) {
                data.Contents.forEach((object) => {
                    if (object.Key) {
                        deleteParams.Delete.Objects.push({ Key: object.Key });
                    }
                });
            }
            if (deleteParams.Delete.Objects.length >= 1000) {
                await s3.deleteObjects(deleteParams).promise();
                deleteParams.Delete.Objects = [];
            }
            isTruncated = data.IsTruncated;
            continuationToken = data.NextContinuationToken;
        }
        if (deleteParams.Delete.Objects.length > 0) {
            await s3.deleteObjects(deleteParams).promise();
        }
    }
    catch (err) {
        console.log(err);
    }
}
async function getByID(packageID) {
    const lastUnder = packageID.lastIndexOf("-");
    const packageName = packageID.slice(0, lastUnder);
    if (lastUnder == -1) {
        return {
            Content: "",
            Name: "",
            ID: "",
            Version: ""
        };
    }
    const params = {
        Bucket: bucketName,
        Prefix: packageName + "/",
    };
    let continuationToken = undefined;
    let isTruncated = true; // To check if there are more objects to list
    while (isTruncated) {
        try {
            if (continuationToken) {
                params.ContinuationToken = continuationToken; // Set continuation token for pagination
            }
            const data = await s3.listObjectsV2(params).promise();
            if (data.Contents) {
                data.Contents.forEach(async (object) => {
                    if (object.Key?.split(delimeter)[2] == packageID && object.Key?.split(delimeter)[3] == "zip") {
                        const getObjectCommand = {
                            Bucket: bucketName,
                            Key: object.Key,
                        };
                        const obData = await s3.getObject(getObjectCommand).promise();
                        const stream = obData.Body;
                        const chunks = [];
                        for await (let chunk of stream) {
                            chunks.push(Buffer.from(chunk));
                        }
                        const buffer = Buffer.concat(chunks);
                        const base64 = buffer.toString('base64');
                        return {
                            Content: base64,
                            Name: packageName,
                            ID: packageID,
                            Version: object.Key?.split(delimeter)[1]
                        };
                    }
                });
            }
            isTruncated = data.IsTruncated;
            continuationToken = data.NextContinuationToken;
        }
        catch (err) {
            console.log(err);
            break;
        }
    }
    return {
        Content: "",
        Name: "",
        ID: "",
        Version: ""
    };
}
function versionGreaterThan(versionG, versionL) {
    let versionG1 = Number(versionG.split(".")[0]);
    let versionG2 = Number(versionG.split(".")[1]);
    let versionG3 = Number(versionG.split(".")[2]);
    let versionL1 = Number(versionL.split(".")[0]);
    let versionL2 = Number(versionL.split(".")[1]);
    let versionL3 = Number(versionL.split(".")[2]);
    if (versionG1 > versionL1) {
        return true;
    }
    else if (versionG2 > versionL2) {
        return true;
    }
    else if (versionG3 > versionL3) {
        return true;
    }
    return false;
}
function checkValidVersion(versionString) {
    const versionRegex = /^(?:(\^|\~)?\d+\.\d+\.\d+)(?:-(\d+\.\d+\.\d+))?$/;
    const regex = versionRegex.test(versionString);
    const isRangeWithCaretOrTilde = versionString.includes('-') && (versionString.startsWith('^') || versionString.startsWith('~'));
    return regex && !isRangeWithCaretOrTilde;
}
