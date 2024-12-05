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
exports.delimeter = void 0;
exports.uploadPackage = uploadPackage;
exports.checkPrefixExists = checkPrefixExists;
exports.reset = reset;
exports.getByID = getByID;
exports.getRatingByID = getRatingByID;
exports.checkIfUploadByContent = checkIfUploadByContent;
exports.getCostByID = getCostByID;
exports.getPrefixParamsByID = getPrefixParamsByID;
exports.getRegexArray = getRegexArray;
exports.getPackagesArray = getPackagesArray;
exports.versionGreaterThan = versionGreaterThan;
exports.checkValidVersionRegex = checkValidVersionRegex;
exports.checkValidVersion = checkValidVersion;
exports.versionQualifyCheck = versionQualifyCheck;
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
exports.delimeter = "/";
const bucketName = "trust-repository";
const exampleKey = "MyName" + exports.delimeter + "1.0.0" + exports.delimeter + "MyName-1" + exports.delimeter + "zip";
const maxObReturn = 500;
async function uploadPackage(dir, name, version, debloat) {
    try {
        if (debloat) {
            var fileStreamZip = fs.createReadStream(dir + "-debloated.zip");
        }
        else {
            var fileStreamZip = fs.createReadStream(dir + ".zip");
        }
        const id = await getUniqueID(name);
        const pathName = name + exports.delimeter + version + exports.delimeter + id;
        const paramsZip = {
            Bucket: bucketName,
            Key: pathName + exports.delimeter + "zip", // The S3 key (file name) where you want to store the file
            Body: fileStreamZip
        };
        const uploadResultZip = await s3.upload(paramsZip).promise();
        const fileStreamJson = fs.createReadStream(dir + ".json");
        const paramsJson = {
            Bucket: bucketName,
            Key: pathName + exports.delimeter + "json", // The S3 key (file name) where you want to store the file
            Body: fileStreamJson
        };
        const uploadResultJson = await s3.upload(paramsJson).promise();
        try {
            const fileStreamRead = fs.createReadStream(dir + "/README.md");
            const paramsRead = {
                Bucket: bucketName,
                Key: pathName + exports.delimeter + "READ", // The S3 key (file name) where you want to store the file
                Body: fileStreamRead
            };
            const uploadResultRead = await s3.upload(paramsRead).promise();
        }
        catch (err) {
            console.log(err);
        }
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
        let testNum = Number(key.split(exports.delimeter)[2].replace(packageName + "-", ""));
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
    // const lastUnder: number = packageID.lastIndexOf("-");
    // const packageName: string = packageID.slice(0, lastUnder);
    // if (lastUnder == -1)
    // {
    //     return {
    //         Content: "",
    //         Name: "",
    //         ID: "",
    //         Version: ""
    //     }
    // }
    // const params: AWS.S3.ListObjectsV2Request = {
    //     Bucket: bucketName,
    //     Prefix: packageName + "/",
    // };
    // let continuationToken: string | undefined = undefined;
    // let isTruncated = true;  // To check if there are more objects to list
    // while (isTruncated)
    // {
    //     try
    //     {
    //         if (continuationToken) {
    //             params.ContinuationToken = continuationToken;  // Set continuation token for pagination
    //         }
    //         // Get object list
    //         const data = await s3.listObjectsV2(params).promise();
    //         if (data.Contents)
    //         {
    //             for (let object of data.Contents)
    //             {
    //                 if (object.Key?.split(delimeter)[2] == packageID && object.Key?.split(delimeter)[3] == "zip")
    //                 {
    //                     // Get the associated object and convert to base64
    //                     const getObjectCommand: AWS.S3.GetObjectRequest = {
    //                         Bucket: bucketName,
    //                         Key: object.Key,
    //                     };
    //                     const obData = await s3.getObject(getObjectCommand).promise();
    //                     const stream = obData.Body 
    //                     const base64 = stream?.toString('base64');
    //                     // Check if this needs a URL in it by getting the JSON file
    //                     const getObjectJsonCommand: AWS.S3.GetObjectRequest = {
    //                         Bucket: bucketName,
    //                         Key: object.Key.slice(0, object.Key.lastIndexOf(delimeter)) + delimeter + "json",
    //                     };
    //                     const obJData = await s3.getObject(getObjectJsonCommand).promise();
    //                     const streamJ = obJData.Body 
    //                     const data = JSON.parse(streamJ?.toString('utf-8')!);
    //                     // Format our results
    //                     const result: any =  {
    //                         Content: base64,
    //                         Name: packageName,
    //                         ID: packageID,
    //                         Version: object.Key?.split(delimeter)[1]
    //                     }
    //                     // Add the URL if Needed
    //                     if (!data.ByContent)
    //                     {
    //                         result.URL = data.URL;
    //                     }
    //                     // Return Result
    //                     return result;
    //                 }
    //             }
    //         }
    //         isTruncated = data.IsTruncated as boolean;
    //         continuationToken = data.NextContinuationToken;
    //     }
    //     catch (err)
    //     {
    //         console.log(err);
    //         break;
    //     }
    // }
    // return {
    //     Content: "",
    //     Name: "",
    //     ID: "",
    //     Version: ""
    // }
    const prefix = await getPrefixByID(packageID);
    if (prefix == undefined) {
        return {
            Content: "",
            Name: "",
            ID: "",
            Version: ""
        };
    }
    // Get the associated object and convert to base64
    const getObjectCommand = {
        Bucket: bucketName,
        Key: prefix + exports.delimeter + "zip",
    };
    const obData = await s3.getObject(getObjectCommand).promise();
    const stream = obData.Body;
    const base64 = stream?.toString('base64');
    // Check if this needs a URL in it by getting the JSON file
    const getObjectJsonCommand = {
        Bucket: bucketName,
        Key: prefix + exports.delimeter + "json",
    };
    const obJData = await s3.getObject(getObjectJsonCommand).promise();
    const streamJ = obJData.Body;
    const data = JSON.parse(streamJ?.toString('utf-8'));
    const lastUnder = packageID.lastIndexOf("-");
    const packageName = packageID.slice(0, lastUnder);
    // Format our results
    const result = {
        Content: base64,
        Name: packageName,
        ID: packageID,
        Version: prefix.split(exports.delimeter)[1]
    };
    // Add the URL if Needed
    if (!data.ByContent) {
        result.URL = data.URL;
    }
    // Return Result
    return result;
}
async function getRatingByID(packageID) {
    // const lastUnder: number = packageID.lastIndexOf("-");
    // const packageName: string = packageID.slice(0, lastUnder);
    // if (lastUnder == -1)
    // {
    //     return {
    //         BusFactor: undefined,
    //         BusFactorLatency: undefined,
    //         Correctness: undefined,
    //         CorrectnessLatency: undefined,
    //         RampUp: undefined,
    //         RampUpLatency: undefined,
    //         ResponsiveMaintainer: undefined,
    //         ResponsiveMaintainerLatency: undefined,
    //         LicenseScore: undefined,
    //         LicenseScoreLatency: undefined,
    //         GoodPinningPractice: undefined,
    //         GoodPinningPracticeLatency: undefined,
    //         PullRequest: undefined,
    //         PullRequestLatency: undefined,
    //         NetScore: undefined,
    //         NetScoreLatency: -1
    //     }
    // }
    // const params: AWS.S3.ListObjectsV2Request = {
    //     Bucket: bucketName,
    //     Prefix: packageName + "/",
    // };
    // let continuationToken: string | undefined = undefined;
    // let isTruncated = true;  // To check if there are more objects to list
    // while (isTruncated)
    // {
    //     try
    //     {
    //         if (continuationToken) {
    //             params.ContinuationToken = continuationToken;  // Set continuation token for pagination
    //         }
    //         const data = await s3.listObjectsV2(params).promise();
    //         if (data.Contents)
    //         {
    //             for (let object of data.Contents)
    //             {
    //                 if (object.Key?.split(delimeter)[2] == packageID && object.Key?.split(delimeter)[3] == "json")
    //                 {
    //                     const getObjectCommand: AWS.S3.GetObjectRequest = {
    //                         Bucket: bucketName,
    //                         Key: object.Key,
    //                     };
    //                     const obData = await s3.getObject(getObjectCommand).promise();
    //                     const stream = obData.Body 
    //                     const rating = JSON.parse(stream?.toString('utf-8')!);
    //                     return {
    //                         BusFactor: rating.BusFactor,
    //                         BusFactorLatency: rating.BusFactor_Latency,
    //                         Correctness: rating.Correctness,
    //                         CorrectnessLatency: rating.Correctness_Latency,
    //                         RampUp: rating.RampUp,
    //                         RampUpLatency: rating.RampUp_Latency,
    //                         ResponsiveMaintainer: rating.ResponsiveMaintainer,
    //                         ResponsiveMaintainerLatency: rating.ResponsiveMaintainer_Latency,
    //                         LicenseScore: rating.License,
    //                         LicenseScoreLatency: rating.License_Latency,
    //                         GoodPinningPractice: rating.FractionalDependency,
    //                         GoodPinningPracticeLatency: rating.FractionalDependency_Latency,
    //                         PullRequest: rating.PullRequest,
    //                         PullRequestLatency: rating.PullRequest_Latency,
    //                         NetScore: rating.NetScore,
    //                         NetScoreLatency: rating.NetScore_Latency
    //                     }
    //                 }
    //             }
    //         }
    //         isTruncated = data.IsTruncated as boolean;
    //         continuationToken = data.NextContinuationToken;
    //     }
    //     catch (err)
    //     {
    //         console.log(err);
    //         break;
    //     }
    // }
    // return {
    //     BusFactor: undefined,
    //     BusFactorLatency: undefined,
    //     Correctness: undefined,
    //     CorrectnessLatency: undefined,
    //     RampUp: undefined,
    //     RampUpLatency: undefined,
    //     ResponsiveMaintainer: undefined,
    //     ResponsiveMaintainerLatency: undefined,
    //     LicenseScore: undefined,
    //     LicenseScoreLatency: undefined,
    //     GoodPinningPractice: undefined,
    //     GoodPinningPracticeLatency: undefined,
    //     PullRequest: undefined,
    //     PullRequestLatency: undefined,
    //     NetScore: undefined,
    //     NetScoreLatency: -1
    // }
    const prefix = await getPrefixByID(packageID);
    if (prefix == undefined) {
        return {
            BusFactor: undefined,
            BusFactorLatency: undefined,
            Correctness: undefined,
            CorrectnessLatency: undefined,
            RampUp: undefined,
            RampUpLatency: undefined,
            ResponsiveMaintainer: undefined,
            ResponsiveMaintainerLatency: undefined,
            LicenseScore: undefined,
            LicenseScoreLatency: undefined,
            GoodPinningPractice: undefined,
            GoodPinningPracticeLatency: undefined,
            PullRequest: undefined,
            PullRequestLatency: undefined,
            NetScore: undefined,
            NetScoreLatency: -1
        };
    }
    // Get JSON
    const getObjectCommand = {
        Bucket: bucketName,
        Key: prefix + exports.delimeter + "json",
    };
    const obData = await s3.getObject(getObjectCommand).promise();
    const stream = obData.Body;
    const rating = JSON.parse(stream?.toString('utf-8'));
    return {
        BusFactor: rating.BusFactor,
        BusFactorLatency: rating.BusFactor_Latency,
        Correctness: rating.Correctness,
        CorrectnessLatency: rating.Correctness_Latency,
        RampUp: rating.RampUp,
        RampUpLatency: rating.RampUp_Latency,
        ResponsiveMaintainer: rating.ResponsiveMaintainer,
        ResponsiveMaintainerLatency: rating.ResponsiveMaintainer_Latency,
        LicenseScore: rating.License,
        LicenseScoreLatency: rating.License_Latency,
        GoodPinningPractice: rating.FractionalDependency,
        GoodPinningPracticeLatency: rating.FractionalDependency_Latency,
        PullRequest: rating.PullRequest,
        PullRequestLatency: rating.PullRequest_Latency,
        NetScore: rating.NetScore,
        NetScoreLatency: rating.NetScore_Latency
    };
}
async function checkIfUploadByContent(packageID) {
    const prefix = await getPrefixByID(packageID);
    if (prefix == undefined) {
        return false;
    }
    const getObjectJsonCommand = {
        Bucket: bucketName,
        Key: prefix + exports.delimeter + "json",
    };
    const obJData = await s3.getObject(getObjectJsonCommand).promise();
    const streamJ = obJData.Body;
    const data = JSON.parse(streamJ?.toString('utf-8'));
    return data.ByContent;
}
async function getCostByID(packageID, rootID, dependencies, returnObj) {
    const prefix = await getPrefixByID(packageID);
    if (prefix == undefined) {
        returnObj[packageID] = undefined;
        return returnObj;
    }
    // Get JSON
    const getObjectCommand = {
        Bucket: bucketName,
        Key: prefix + exports.delimeter + "json",
    };
    const obData = await s3.getObject(getObjectCommand).promise();
    const stream = obData.Body;
    const rating = JSON.parse(stream?.toString('utf-8'));
    if (!dependencies) {
        returnObj[packageID] = {
            totalCost: rating.Cost
        };
        return returnObj;
    }
    else {
        const dependencies = rating.Dependencies;
        const dependency_id = [];
        let totalCost = rating.Cost;
        returnObj[packageID] = {
            standaloneCost: rating.Cost
        };
        for (const key in dependencies) {
            const dep_data = await getPackagesArray([
                {
                    Name: key,
                    Version: dependencies[key]
                }
            ]);
            let dep_id = undefined;
            if (dep_data != undefined && dep_data.length != 0) {
                dep_id = dep_data[0].ID;
            }
            if (dep_id != undefined && !(dep_id in returnObj)) {
                const costful = await getCostByID(dep_id, rootID, true, returnObj);
                dependency_id.push(dep_id);
                totalCost += costful[dep_id]["totalCost"];
            }
        }
        returnObj[packageID]["totalCost"] = totalCost;
        if (packageID == rootID) {
            for (const key in returnObj) {
                if (!dependency_id.includes(key) && key != packageID) {
                    delete returnObj[key];
                }
            }
        }
        return returnObj;
    }
    returnObj[packageID] = undefined;
    return returnObj;
}
async function getPrefixByID(packageID) {
    const lastUnder = packageID.lastIndexOf("-");
    const packageName = packageID.slice(0, lastUnder);
    if (lastUnder == -1) {
        return undefined;
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
                for (let object of data.Contents) {
                    if (object.Key?.split(exports.delimeter)[2] == packageID && object.Key?.split(exports.delimeter)[3] == "zip") {
                        return object.Key.slice(0, object.Key.lastIndexOf(exports.delimeter));
                    }
                }
            }
            isTruncated = data.IsTruncated;
            continuationToken = data.NextContinuationToken;
        }
        catch (err) {
            console.log(err);
            break;
        }
    }
    return undefined;
}
async function getPrefixParamsByID(packageID) {
    const prefix = await getPrefixByID(packageID);
    if (prefix == undefined) {
        return {
            Name: "",
            Version: "",
            ID: ""
        };
    }
    else {
        const prefixArray = prefix.split(exports.delimeter);
        return {
            Name: prefixArray[0],
            Version: prefixArray[1],
            ID: prefixArray[2]
        };
    }
}
async function getRegexArray(regexOb) {
    const params = {
        Bucket: bucketName
    };
    let continuationToken = undefined;
    let isTruncated = true; // To check if there are more objects to list
    let returnArray = [];
    while (isTruncated) {
        try {
            if (continuationToken) {
                params.ContinuationToken = continuationToken; // Set continuation token for pagination
            }
            const data = await s3.listObjectsV2(params).promise();
            if (data.Contents) {
                for (let object of data.Contents) {
                    if (object.Key?.split(exports.delimeter)[3] == "zip") {
                        if (regexOb.test(object.Key?.split(exports.delimeter)[0])) {
                            returnArray.push({
                                Version: object.Key?.split(exports.delimeter)[1],
                                Name: object.Key?.split(exports.delimeter)[0],
                                ID: object.Key?.split(exports.delimeter)[2],
                            });
                        }
                        else {
                            const testPrefix = object.Key?.slice(0, object.Key?.lastIndexOf(exports.delimeter));
                            const getObjectREADCommand = {
                                Bucket: bucketName,
                                Key: testPrefix + exports.delimeter + "READ",
                            };
                            try {
                                const obData = await s3.getObject(getObjectREADCommand).promise();
                                const stream = obData.Body;
                                const readMeBody = stream?.toString('utf-8');
                                if (regexOb.test(readMeBody)) {
                                    returnArray.push({
                                        Version: object.Key?.split(exports.delimeter)[1],
                                        Name: object.Key?.split(exports.delimeter)[0],
                                        ID: object.Key?.split(exports.delimeter)[2],
                                    });
                                }
                            }
                            catch {
                                // READ Me does not exist for this repo so we don't care!
                            }
                        }
                    }
                }
            }
            isTruncated = data.IsTruncated;
            continuationToken = data.NextContinuationToken;
        }
        catch (err) {
            console.log(err);
        }
    }
    return returnArray;
}
async function getPackagesArray(queries) {
    const params = {
        Bucket: bucketName
    };
    let continuationToken = undefined;
    let isTruncated = true; // To check if there are more objects to list
    let returnArray = [];
    let counter = 0; // Return at most 500 objects
    while (isTruncated) {
        try {
            if (continuationToken) {
                params.ContinuationToken = continuationToken; // Set continuation token for pagination
            }
            const data = await s3.listObjectsV2(params).promise();
            if (data.Contents) {
                for (let object of data.Contents) {
                    if (object.Key?.split(exports.delimeter)[3] == "zip") {
                        const testName = object.Key?.split(exports.delimeter)[0];
                        const testVersion = object.Key?.split(exports.delimeter)[1];
                        const testID = object.Key?.split(exports.delimeter)[2];
                        for (let i = 0; i < queries.length; i++) {
                            if (queries[i].Name == "*" || (testName == queries[i].Name && (queries[i].Version == "" || queries[i].Version == undefined || versionQualifyCheck(queries[i].Version, testVersion)))) {
                                returnArray.push({
                                    Version: testVersion,
                                    Name: testName,
                                    ID: testID
                                });
                                counter++;
                                break;
                            }
                        }
                        if (counter > maxObReturn) {
                            return [{ Err: "TOO MANY" }];
                        }
                    }
                }
            }
            isTruncated = data.IsTruncated;
            continuationToken = data.NextContinuationToken;
        }
        catch (err) {
            console.log(err);
        }
    }
    return returnArray;
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
    else if (versionG2 > versionL2 && versionG1 == versionL1) {
        return true;
    }
    else if (versionG3 > versionL3 && versionG1 == versionL1 && versionG2 == versionL2) {
        return true;
    }
    return false;
}
function checkValidVersionRegex(versionString) {
    const versionRegex = /^(?:(\^|\~)?\d+\.\d+\.\d+)(?:-(\d+\.\d+\.\d+))?$/;
    const regex = versionRegex.test(versionString);
    const isRangeWithCaretOrTilde = versionString.includes('-') && (versionString.startsWith('^') || versionString.startsWith('~'));
    if (versionString.includes("-") && versionGreaterThan(versionString.split("-")[0], versionString.split("-")[1])) {
        return false;
    }
    return regex && !isRangeWithCaretOrTilde;
}
function checkValidVersion(versionString) {
    const versionRegex = /^\d+\.\d+\.\d+$/;
    const regex = versionRegex.test(versionString);
    return regex;
}
function versionQualifyCheck(versionTester, version) {
    if (versionTester == undefined || version == undefined) {
        return false;
    }
    if (versionTester.includes("-")) {
        // Check version within range
        let lowerBound = versionTester.split("-")[0];
        let upperBound = versionTester.split("-")[1];
        return (version == lowerBound || version == upperBound || (versionGreaterThan(version, lowerBound) && !versionGreaterThan(version, upperBound)));
    }
    else if (versionTester.includes("^")) {
        // Check version carat notation
        versionTester = versionTester.replace("^", "");
        let versionT1 = Number(versionTester.split(".")[0]);
        let versionT2 = Number(versionTester.split(".")[1]);
        let versionT3 = Number(versionTester.split(".")[1]);
        let version1 = Number(version.split(".")[0]);
        let version2 = Number(version.split(".")[1]);
        let version3 = Number(version.split(".")[1]);
        return (versionT1 == version1 && versionT2 <= version2 && (versionT3 <= version3 || versionT2 < version2));
    }
    else if (versionTester.includes("~")) {
        // Check version tilde notation
        versionTester = versionTester.replace("~", "");
        let versionT1 = Number(versionTester.split(".")[0]);
        let versionT2 = Number(versionTester.split(".")[1]);
        let versionT3 = Number(versionTester.split(".")[1]);
        let version1 = Number(version.split(".")[0]);
        let version2 = Number(version.split(".")[1]);
        let version3 = Number(version.split(".")[1]);
        return (versionT1 == version1 && versionT2 == version2 && versionT3 <= version3);
    }
    else {
        return version == versionTester;
    }
}
