import * as AWS from 'aws-sdk';
import dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

if (!process.env.AWS_ACCESS_KEY) {
    console.error(JSON.stringify({ error: "AWS_ACCESS_KEY environment variable is not set" }));
    process.exit(1);
}
  
if (!process.env.AWS_SECRET_ACCESS_KEY) {
    console.error(JSON.stringify({ error: "AWS_SECRET_ACCESS_KEY environment variable is not set" }));
    process.exit(1);
}

if (!process.env.AWS_REGION) {
    console.error(JSON.stringify({ error: "AWS_REGION environment variable is not set" }));
    process.exit(1);
}

AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
});
  

const s3 = new AWS.S3({
    signatureVersion: 'v4'
});
const delimeter = "/";
const bucketName = "trust-repository";
const exampleKey = "MyName" + delimeter + "1.0.0" + delimeter + "MyName1" + delimeter +  "zip";

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
        let testNum: number = Number(key.split(delimeter)[2].replace(packageName, ""));

        if (testNum > max)
        {
            max = testNum;
        }
    });

    return packageName + String(max + 1);
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