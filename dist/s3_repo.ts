import * as AWS from 'aws-sdk';
import { error } from 'console';
import dotenv from 'dotenv';
import * as fs from 'fs';

// CHECK IF ENV VARIABLES ARE PRESENT FOR TESTING ON NON LAMBDA MACHINES
dotenv.config();

if (!process.env.AWS_REGION) {
    console.error(JSON.stringify({ error: "AWS_REGION environment variable is not set" }));
    process.exit(1);
}

if (process.env.AWS_SECRET_ACCESS_KEY && process.env.AWS_ACCESS_KEY)
{
    AWS.config.update({
        accessKeyId: process.env.AWS_ACCESS_KEY,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION,
    });
} 

// CONSTANTS
const s3 = new AWS.S3({
    signatureVersion: 'v4'
});
export const delimeter = "/";
const bucketName = "trust-repository";
const exampleKey = "MyName" + delimeter + "1.0.0" + delimeter + "MyName-1" + delimeter +  "zip";
const maxObReturn = 500;

export async function uploadPackage(dir: string, name: string, version: string, debloat: boolean): Promise<string>
{
    try
    {
        // If we are uploading a debloated zip specifiy the correct path for the debloated zip
        if (debloat)
        {
            var fileStreamZip = fs.createReadStream(dir + "-debloated.zip");
        }
        else
        {
            var fileStreamZip = fs.createReadStream(dir + ".zip");
        }

        // Get the unique id for the uploaded package
        const id: string = await getUniqueID(name);

        // Form the file name using the delimeters
        const pathName: string = name + delimeter + version + delimeter + id;
        
        // Form the S3 parameters
        const paramsZip = {
            Bucket: bucketName,
            Key: pathName + delimeter + "zip",  // The S3 key (file name) where you want to store the file
            Body: fileStreamZip
        };
        
        // Await upload of the zip json and read me (if we are able to)
        const uploadResultZip = await s3.upload(paramsZip).promise();
    
        const fileStreamJson = fs.createReadStream(dir + ".json");
    
        const paramsJson = {
            Bucket: bucketName,
            Key: pathName + delimeter + "json",  // The S3 key (file name) where you want to store the file
            Body: fileStreamJson
        };
    
        const uploadResultJson = await s3.upload(paramsJson).promise();

        try
        {
            const fileStreamRead = fs.createReadStream(dir + "/README.md");
    
            const paramsRead = {
                Bucket: bucketName,
                Key: pathName + delimeter + "READ",  // The S3 key (file name) where you want to store the file
                Body: fileStreamRead
            };
        
            const uploadResultRead = await s3.upload(paramsRead).promise();
        }
        catch (err)
        {
            console.log(err);
        }

        // Return the id if there is success
        return id;
    }
    catch (err)
    {
        console.log(err);

        return "err";
    }
}

async function getUniqueID(packageName: string): Promise<string>
{
    const params: AWS.S3.ListObjectsV2Request = {
        Bucket: bucketName,
        Prefix: packageName + "/",
    };

    const keys: string[] = [];
    let continuationToken: string | undefined = undefined;

    let isTruncated = true;  // To check if there are more objects to list

    while (isTruncated)
    {
        try
        {
            if (continuationToken) {
                params.ContinuationToken = continuationToken;  // Set continuation token for pagination
            }

            const data = await s3.listObjectsV2(params).promise();

            if (data.Contents)
            {
                data.Contents.forEach((object) => {
                    keys.push(object.Key || '');
                });
            }

            isTruncated = data.IsTruncated as boolean;
            continuationToken = data.NextContinuationToken;
        }
        catch (err)
        {
            console.log(err);
            break;
        }
    }

    // Get max number to append to the end of the id to for a unique id for the package
    let max: number = 0;

    keys.forEach(key => {
        let testNum: number = Number(key.split(delimeter)[2].replace(packageName + "-", ""));

        if (testNum > max)
        {
            max = testNum;
        }
    });

    return packageName + "-" + String(max + 1);
}

export async function checkPrefixExists(packageName: string): Promise<boolean>
{
    // Get a query with only 1 max key using the package name
    const params: AWS.S3.ListObjectsV2Request = {
        Bucket: bucketName,
        Prefix: packageName + "/",
        MaxKeys: 1
    };

    try
    {
        const data = await s3.listObjectsV2(params).promise();

        // If there is an object in there the prefix exists (return true!)
        if (data.Contents && data.Contents.length > 0)
        {
            return true;
        }
        else
        {
            return false;
        }
    }
    catch (err) 
    {
        console.error('Error checking prefix:', err);

        return false;
    }
}

export async function reset()
{
    // Form the parameters
    const params: AWS.S3.ListObjectsV2Request = {
        Bucket: bucketName,
    };

    let continuationToken: string | undefined = undefined;

    let isTruncated = true;  // To check if there are more objects to list

    const deleteParams: AWS.S3.DeleteObjectsRequest = {
        Bucket: bucketName,
        Delete: { Objects: [] }, // Array of objects to delete
    };

    try 
    {
        while (isTruncated) 
        {

            if (continuationToken) {
                params.ContinuationToken = continuationToken;
            }

            const data = await s3.listObjectsV2(params).promise();

            if (data.Contents) 
            {
                // For each object in here push the key to the delete que
                data.Contents.forEach((object) => {
                    if (object.Key) {
                    deleteParams.Delete.Objects.push({ Key: object.Key });
                    }
                });
            }

            // Delete everything if we are beyond 1000 to empty the que
            if (deleteParams.Delete.Objects.length >= 1000) 
            {
                await s3.deleteObjects(deleteParams).promise();
                deleteParams.Delete.Objects = [];
            }

            isTruncated = data.IsTruncated as boolean;
            continuationToken = data.NextContinuationToken;
        }

        if (deleteParams.Delete.Objects.length > 0) 
        {
            await s3.deleteObjects(deleteParams).promise();
        }
    }
    catch (err)
    {
        console.log(err);
    }
}

export async function getByID(packageID: string)
{
    // Get the prefix to call
    const prefix = await getPrefixByID(packageID);

    if (prefix == undefined)
    {
        return {
                Content: "",
                Name: "",
                ID: "",
                Version: ""
            }
    }

    // Get the associated object and convert to base64
    const getObjectCommand: AWS.S3.GetObjectRequest = {
        Bucket: bucketName,
        Key: prefix + delimeter + "zip",
    };

    const obData = await s3.getObject(getObjectCommand).promise();

    const stream = obData.Body;
    
    const base64 = stream?.toString('base64');

    // Check if this needs a URL in it by getting the JSON file
    const getObjectJsonCommand: AWS.S3.GetObjectRequest = {
        Bucket: bucketName,
        Key: prefix + delimeter + "json",
    };

    // Extract more data using the json
    const obJData = await s3.getObject(getObjectJsonCommand).promise();
    
    const streamJ = obJData.Body;
    
    const data = JSON.parse(streamJ?.toString('utf-8')!);

    const lastUnder: number = packageID.lastIndexOf("-");
    const packageName: string = packageID.slice(0, lastUnder);

    // Format our results
    const result: any =  {
        Content: base64,
        Name: packageName,
        ID: packageID,
        Version: prefix.split(delimeter)[1]
    }

    // Add the URL if Needed from the json data
    if (!data.ByContent)
    {
        result.URL = data.URL;
    }
    
    // Return Result
    return result;
}

export async function getRatingByID(packageID: string)
{
    const prefix = await getPrefixByID(packageID);

    if (prefix == undefined)
    {
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
        }
    }

    // Get JSON
    const getObjectCommand: AWS.S3.GetObjectRequest = {
        Bucket: bucketName,
        Key: prefix + delimeter + "json",
    };

    const obData = await s3.getObject(getObjectCommand).promise();

    const stream = obData.Body 

    const rating = JSON.parse(stream?.toString('utf-8')!);

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
    }
}

export async function checkIfUploadByContent(packageID: string): Promise<boolean>
{
    const prefix = await getPrefixByID(packageID);

    if (prefix == undefined)
    {
        return false
    }

    const getObjectJsonCommand: AWS.S3.GetObjectRequest = {
        Bucket: bucketName,
        Key: prefix + delimeter + "json",
    };

    const obJData = await s3.getObject(getObjectJsonCommand).promise();
    
    const streamJ = obJData.Body;
    
    const data = JSON.parse(streamJ?.toString('utf-8')!);

    return data.ByContent;
}

export async function getCostByID(packageID: string, rootID: string, dependencies: boolean, returnObj: any)
{
    const prefix = await getPrefixByID(packageID);

    if (prefix == undefined)
    {
        returnObj[packageID] = undefined;

        return returnObj
    }

    // Get JSON
    const getObjectCommand: AWS.S3.GetObjectRequest = {
        Bucket: bucketName,
        Key: prefix + delimeter + "json",
    };

    const obData = await s3.getObject(getObjectCommand).promise();

    const stream = obData.Body 

    const rating = JSON.parse(stream?.toString('utf-8')!);

    if (!dependencies)
    {
        returnObj[packageID] = {
            totalCost: rating.Cost
        };

        return returnObj
    }
    else
    {
        const dependencies = rating.Dependencies;
        const dependency_id: string[] = [];

        let totalCost: number = rating.Cost;

        returnObj[packageID] = {
            standaloneCost: rating.Cost
        };

        for (const key in dependencies) 
        {
            const dep_data: any[] = await getPackagesArray([
                {
                    Name: key,
                    Version: dependencies[key]
                }
            ])

            let dep_id = undefined;

            if (dep_data != undefined && dep_data.length != 0)
            {
                dep_id = dep_data[0].ID;
            }

            if (dep_id != undefined && !(dep_id in returnObj))
            {
                const costful: any = await getCostByID(dep_id, rootID, true, returnObj);
                
                dependency_id.push(dep_id);
                totalCost += costful[dep_id]["totalCost"];
            }
        }

        returnObj[packageID]["totalCost"] = totalCost;

        if (packageID == rootID)
        {
            for (const key in returnObj)
            {
                if (!dependency_id.includes(key) && key != packageID)
                {
                    delete returnObj[key];
                }
            }
        }

        return returnObj
    }

    returnObj[packageID] = undefined;

    return returnObj
}

async function getPrefixByID(packageID: string)
{
    const lastUnder: number = packageID.lastIndexOf("-");
    const packageName: string = packageID.slice(0, lastUnder);

    if (lastUnder == -1)
    {
        return undefined;
    }

    const params: AWS.S3.ListObjectsV2Request = {
        Bucket: bucketName,
        Prefix: packageName + "/",
    };

    let continuationToken: string | undefined = undefined;

    let isTruncated = true;  // To check if there are more objects to list

    while (isTruncated)
    {
        try
        {
            if (continuationToken) {
                params.ContinuationToken = continuationToken;  // Set continuation token for pagination
            }

            const data = await s3.listObjectsV2(params).promise();

            if (data.Contents)
            {
                for (let object of data.Contents)
                {
                    if (object.Key?.split(delimeter)[2] == packageID && object.Key?.split(delimeter)[3] == "zip")
                    {
                        return object.Key.slice(0, object.Key.lastIndexOf(delimeter))
                    }
                }
            }

            isTruncated = data.IsTruncated as boolean;
            continuationToken = data.NextContinuationToken;
        }
        catch (err)
        {
            console.log(err);
            break;
        }
    }

    return undefined;
}

export async function getPrefixParamsByID(packageID: string)
{
    const prefix: string | undefined = await getPrefixByID(packageID);

    if (prefix == undefined)
    {
        return {
            Name: "",
            Version: "",
            ID: ""
        };
    }
    else
    {
        const prefixArray: string[] = prefix.split(delimeter);

        return {
            Name: prefixArray[0],
            Version: prefixArray[1],
            ID: prefixArray[2]
        };
    }
}

export async function getRegexArray(regexOb: RegExp): Promise<object[]>
{
    const params: AWS.S3.ListObjectsV2Request = {
        Bucket: bucketName
    };

    let continuationToken: string | undefined = undefined;

    let isTruncated = true;  // To check if there are more objects to list

    let returnArray: object[] = [];

    while (isTruncated)
    {
        try
        {
            if (continuationToken) {
                params.ContinuationToken = continuationToken;  // Set continuation token for pagination
            }

            const data = await s3.listObjectsV2(params).promise();

            if (data.Contents)
            {
                for (let object of data.Contents)
                {
                    if (object.Key?.split(delimeter)[3] == "zip")
                    {
                        if (regexOb.test(object.Key?.split(delimeter)[0]!))
                        {
                            returnArray.push({
                                Version: object.Key?.split(delimeter)[1],
                                Name: object.Key?.split(delimeter)[0],
                                ID: object.Key?.split(delimeter)[2],
                            });
                        }
                        else
                        {
                            const testPrefix = object.Key?.slice(0, object.Key?.lastIndexOf(delimeter))
    
                            const getObjectREADCommand: AWS.S3.GetObjectRequest = {
                                Bucket: bucketName,
                                Key: testPrefix + delimeter + "READ",
                            };
    
                            try
                            {
                                const obData = await s3.getObject(getObjectREADCommand).promise();
    
                                const stream = obData.Body 
    
                                const readMeBody: string = stream?.toString('utf-8')!;
    
                                if (regexOb.test(readMeBody))
                                {
                                    returnArray.push({
                                        Version: object.Key?.split(delimeter)[1],
                                        Name: object.Key?.split(delimeter)[0],
                                        ID: object.Key?.split(delimeter)[2],
                                    });
                                }
                            }
                            catch
                            {
                                // READ Me does not exist for this repo so we don't care!
                            }
                        }
                    }
                }
            }

            isTruncated = data.IsTruncated as boolean;
            continuationToken = data.NextContinuationToken;
        }
        catch (err)
        {
            console.log(err);
        }
    }

    return returnArray;
}

export async function getPackagesArray(queries: any[]): Promise<object[]>
{
    const params: AWS.S3.ListObjectsV2Request = {
        Bucket: bucketName
    };

    let continuationToken: string | undefined = undefined;

    let isTruncated = true;  // To check if there are more objects to list

    let returnArray: object[] = [];

    let counter = 0; // Return at most 500 objects

    while (isTruncated)
    {
        try
        {
            if (continuationToken) {
                params.ContinuationToken = continuationToken;  // Set continuation token for pagination
            }

            const data = await s3.listObjectsV2(params).promise();

            if (data.Contents)
            {
                for (let object of data.Contents)
                {
                    if (object.Key?.split(delimeter)[3] == "zip")
                    {
                        const testName = object.Key?.split(delimeter)[0];
                        const testVersion = object.Key?.split(delimeter)[1];
                        const testID = object.Key?.split(delimeter)[2];

                        for (let i = 0; i < queries.length; i++)
                        {
                            if (queries[i].Name == "*" || (testName == queries[i].Name && (queries[i].Version == "" || queries[i].Version == undefined || versionQualifyCheck(queries[i].Version, testVersion))))
                            {
                                returnArray.push({
                                    Version: testVersion,
                                    Name: testName,
                                    ID: testID
                                });

                                counter++;

                                break;
                            }
                        }

                        if (counter > maxObReturn)
                        {
                            return [{Err: "TOO MANY"}];
                        }
                    }
                }
            }

            isTruncated = data.IsTruncated as boolean;
            continuationToken = data.NextContinuationToken;
        }
        catch (err)
        {
            console.log(err);
        }
    }

    return returnArray;
}

export function versionGreaterThan(versionG: string, versionL: string): boolean
{
    let versionG1: Number = Number(versionG.split(".")[0]);
    let versionG2: Number = Number(versionG.split(".")[1]);
    let versionG3: Number = Number(versionG.split(".")[2]);

    let versionL1: Number = Number(versionL.split(".")[0]);
    let versionL2: Number = Number(versionL.split(".")[1]);
    let versionL3: Number = Number(versionL.split(".")[2]);

    if (versionG1 > versionL1)
    {
        return true;
    }
    else if (versionG2 > versionL2 && versionG1 == versionL1)
    {
        return true;
    }
    else if (versionG3 > versionL3 && versionG1 == versionL1 && versionG2 == versionL2)
    {
        return true;
    }

    return false;
}

export function versionGreaterThanPatch(versionG: string, versionL: string): boolean
{
    let versionG1: Number = Number(versionG.split(".")[0]);
    let versionG2: Number = Number(versionG.split(".")[1]);
    let versionG3: Number = Number(versionG.split(".")[2]);

    let versionL1: Number = Number(versionL.split(".")[0]);
    let versionL2: Number = Number(versionL.split(".")[1]);
    let versionL3: Number = Number(versionL.split(".")[2]);

    if (versionG3 <= versionL3 && versionG1 == versionL1 && versionG2 == versionL2)
    {
        return false;
    }

    return true;
}

export function checkValidVersionRegex(versionString: string): boolean
{
    const versionRegex = /^(?:(\^|\~)?\d+\.\d+\.\d+)(?:-(\d+\.\d+\.\d+))?$/;

    const regex =  versionRegex.test(versionString);

    const isRangeWithCaretOrTilde = versionString.includes('-') && (versionString.startsWith('^') || versionString.startsWith('~'));

    if (versionString.includes("-") && versionGreaterThan(versionString.split("-")[0], versionString.split("-")[1]))
    {
        return false;
    }

    return regex && !isRangeWithCaretOrTilde;
}

export function checkValidVersion(versionString: string): boolean
{
    const versionRegex = /^\d+\.\d+\.\d+$/;

    const regex =  versionRegex.test(versionString);

    return regex;
}

export function versionQualifyCheck(versionTester: string, version: string): boolean
{
    if (versionTester == undefined || version == undefined)
    {
        return false;
    }

    if (versionTester.includes("-"))
    {
        // Check version within range

        let lowerBound: string = versionTester.split("-")[0];
        let upperBound: string = versionTester.split("-")[1];

        return (version == lowerBound ||version == upperBound || (versionGreaterThan(version, lowerBound) && !versionGreaterThan(version, upperBound)));
    }
    else if (versionTester.includes("^"))
    {
        // Check version carat notation

        versionTester = versionTester.replace("^", "");

        let versionT1: Number = Number(versionTester.split(".")[0]);
        let versionT2: Number = Number(versionTester.split(".")[1]);
        let versionT3: Number = Number(versionTester.split(".")[1]);

        let version1: Number = Number(version.split(".")[0]);
        let version2: Number = Number(version.split(".")[1]);
        let version3: Number = Number(version.split(".")[1]);
        
        return (versionT1 == version1 && versionT2 <= version2 && (versionT3 <= version3 || versionT2 < version2));
    }
    else if (versionTester.includes("~"))
    {
        // Check version tilde notation

        versionTester = versionTester.replace("~", "");

        let versionT1: Number = Number(versionTester.split(".")[0]);
        let versionT2: Number = Number(versionTester.split(".")[1]);
        let versionT3: Number = Number(versionTester.split(".")[1]);

        let version1: Number = Number(version.split(".")[0]);
        let version2: Number = Number(version.split(".")[1]);
        let version3: Number = Number(version.split(".")[1]);
        
        return (versionT1 == version1 && versionT2 == version2 && versionT3 <= version3);
    }
    else
    {
        return version == versionTester;
    }
}