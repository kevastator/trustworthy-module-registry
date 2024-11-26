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
const exampleKey = "MyName" + delimeter + "1.0.0" + delimeter + "MyName1" + delimeter + "zip";
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
        let testNum = Number(key.split(delimeter)[2].replace(packageName, ""));
        if (testNum > max) {
            max = testNum;
        }
    });
    return packageName + String(max + 1);
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
