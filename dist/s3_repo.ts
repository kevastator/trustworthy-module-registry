import * as AWS from 'aws-sdk';
import dotenv from 'dotenv';
import * as fs from 'fs';

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

const s3 = new AWS.S3({
    signatureVersion: 'v4'
});
const delimeter = "/";
const bucketName = "trust-repository";
const exampleKey = "MyName" + delimeter + "1.0.0" + delimeter + "MyName-1" + delimeter +  "zip";

export async function uploadPackage(dir: string, name: string): Promise<string>
{
    try
    {
        const fileStreamZip = fs.createReadStream(dir + ".zip");

        const id: string = await getUniqueID(name);

        const pathName: string = name + delimeter + "1.0.0" + delimeter + id;
    
        const paramsZip = {
            Bucket: bucketName,
            Key: pathName + delimeter + "zip",  // The S3 key (file name) where you want to store the file
            Body: fileStreamZip
        };
    
        const uploadResultZip = await s3.upload(paramsZip).promise();
    
        const fileStreamJson = fs.createReadStream(dir + ".json");
    
        const paramsJson = {
            Bucket: bucketName,
            Key: pathName + delimeter + "json",  // The S3 key (file name) where you want to store the file
            Body: fileStreamJson
        };
    
        const uploadResultJson = await s3.upload(paramsJson).promise();

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
    const params: AWS.S3.ListObjectsV2Request = {
        Bucket: bucketName,
        Prefix: packageName + "/",
        MaxKeys: 1
    };

    try
    {
        const data = await s3.listObjectsV2(params).promise();

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
                data.Contents.forEach((object) => {
                    if (object.Key) {
                    deleteParams.Delete.Objects.push({ Key: object.Key });
                    }
                });
            }

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
    const lastUnder: number = packageID.lastIndexOf("-");
    const packageName: string = packageID.slice(0, lastUnder);

    if (lastUnder == -1)
    {
        return {
            Content: "",
            Name: "",
            ID: "",
            Version: ""
        }
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
                        const getObjectCommand: AWS.S3.GetObjectRequest = {
                            Bucket: bucketName,
                            Key: object.Key,
                        };

                        const obData = await s3.getObject(getObjectCommand).promise();

                        const stream = obData.Body as ReadableStream<any>;
                        const chunks: Buffer[] = [];
                        for await (let chunk of stream) 
                        {
                            chunks.push(Buffer.from(chunk));
                        }

                        const buffer = Buffer.concat(chunks);
                        const base64 = buffer.toString('base64');

                        return {
                            Content: base64,
                            Name: packageName,
                            ID: packageID,
                            Version: object.Key?.split(delimeter)[1]
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
            break;
        }
    }

    return {
        Content: "",
        Name: "",
        ID: "",
        Version: ""
    }
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
    else if (versionG2 > versionL2)
    {
        return true;
    }
    else if (versionG3 > versionL3)
    {
        return true;
    }

    return false;
}

export function checkValidVersion(versionString: string): boolean
{
    const versionRegex = /^(?:(\^|\~)?\d+\.\d+\.\d+)(?:-(\d+\.\d+\.\d+))?$/;

    const regex =  versionRegex.test(versionString);

    const isRangeWithCaretOrTilde = versionString.includes('-') && (versionString.startsWith('^') || versionString.startsWith('~'));

    return regex && !isRangeWithCaretOrTilde;
}