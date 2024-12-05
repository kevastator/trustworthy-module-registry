import { isValidUrl, processURL, resolveNpmToGithub } from './rate';
import { debloatPackage } from './debloat';
import { uploadPackage, checkPrefixExists, checkValidVersion } from './s3_repo';
import { promises as fs, readFileSync, existsSync, mkdirSync, createWriteStream, writeFile, writeFileSync, createReadStream } from 'fs';
import archiver from 'archiver'
import * as unzipper from 'unzipper'
import { Handler } from 'aws-lambda';

import * as path from 'path';
import * as http from 'isomorphic-git/http/node';
import * as git from 'isomorphic-git';


import { setTimeout } from 'timers/promises';

const Err400 = {
    statusCode: 400,
    headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "OPTIONS,GET,POST,PUT,DELETE",
        "Access-Control-Allow-Headers": "Content-Type",
    },
    body: JSON.stringify({
        message: "There is missing field(s) in the PackageData or it is formed improperly (e.g. Content and URL ar both set)"
    })
};

const Err409 = {
    statusCode: 409,
    headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "OPTIONS,GET,POST,PUT,DELETE",
        "Access-Control-Allow-Headers": "Content-Type",
    },
    body: JSON.stringify({
        message: "Package exists already."
    })
};

const Err424 = {
    statusCode: 424,
    headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "OPTIONS,GET,POST,PUT,DELETE",
        "Access-Control-Allow-Headers": "Content-Type",
    },
    body: JSON.stringify({
        message: "Package is not uploaded due to the disqualified rating."
    })
};

export const handler: Handler = async (event, context) => {
    let body = undefined;
    
    try
    {
        body = JSON.parse(event.body); 
    }
    catch
    {
        return Err400;
    }
    
    console.log(body);
    
    const url = body.URL;
    const content = body.Content;
    var debloat = body.debloat;

    if (debloat == undefined)
    {
        debloat = false;
    }

    if ((url == undefined && content == undefined) || (url != undefined && content != undefined))
    {
        return Err400;
    }

    try
    {
        // Create random directory with number and make sure it does not exist
        let dir: string = "/tmp/repo/" + String(Math.floor(Math.random() * (100000 - 1 + 1)) + 1)
        
        while (existsSync(dir)) 
        {
            dir = "/tmp/repo/" + String(Math.floor(Math.random() * (100000 - 1 + 1)) + 1);
        }

        // URL Proceedure
        if (url != undefined)
        {  
            return urlExtract(url, dir, debloat);
        }
        // Content Proceedure
        else
        {
            const Name = body.Name;

            // Check formatting of the Name
            if (Name == undefined || Name.includes("/"))
            {
                return Err400;
            }

            return contentExtract(content, dir, Name, debloat);
        }
    }
    catch
    {
        return Err400;
    }
};

async function urlExtract(testurl: string, dir: string, debloat: boolean)
{
    // Check if the url is valid, if not return 400
    if (!isValidUrl(testurl))
    {
        return Err400;
    }

    // Convert to a valid repo and define the dir for the cloned repo
    let validURL: string = await resolveNpmToGithub(testurl);

    // const urlStringList: string[] = testurl.split("/");
    // var Name: string = urlStringList[urlStringList.length - 1];
    // Name = Name[0].toUpperCase() + Name.slice(1);

    // Rate Package
    let rating: any = await processURL(validURL);
    const ratedResult: number = (rating as { NetScore:number }).NetScore;

    if (ratedResult <= 0.5)
    {
        return Err424;
    }

    // Ensure the directory exists
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
    }

    var Name: string = "";
    var version: string = "";
    var dependencies: any = {};

    // Clone the repository
    try
    {
        if (validURL.indexOf("git") == 0)
        {
            validURL = "https" + validURL.slice(3);
        }

        await git.clone({
            fs,
            http,
            dir,
            url: validURL,
            singleBranch: true,
            depth: 1
        });

        await setTimeout(100);

        const packageData = await readFileSync(dir + "/package.json", "utf-8");

        const packageJson = JSON.parse(packageData);

        // Check if the name and version are properly in the package json file to be uploaded
        if ("name" in packageJson && "version" in packageJson && !packageJson.name.includes("/") && checkValidVersion(packageJson.version))
        {
            Name = packageJson.name;
            version = packageJson.version;
        }
        else if ("name" in packageJson && !packageJson.name.includes("/"))
        {
            Name = packageJson.name;
            version = "1.0.0";
        }
        else
        {
            return Err400;
        }

        // Add dependencies
        if ("dependencies" in packageJson)
        {
            dependencies = packageJson.dependencies;
        }
    }
    catch (err)
    {
        console.log(err);
        return Err400;
    }
    
    // Use Archiver to create a zip file from this dir
    const zipdir: string = dir + ".zip";
    const output = createWriteStream(zipdir);
    const archive = archiver('zip');

    archive.on('error', function(err){
        throw err;
    })

    archive.pipe(output);

    archive.directory(dir, false);

    await archive.finalize();

    // Wait 10 ms for finalize and convert to base64
    await setTimeout(10);

    debloatPackage(zipdir, debloat);

    const zipBuffer = readFileSync(zipdir);

    const base64 = zipBuffer.toString('base64');

    // Send Rating to json
    rating.Cost = zipBuffer.byteLength / 1000000;
    rating.ByContent = false;
    rating.Dependencies = dependencies;

    writeFileSync(dir + ".json", JSON.stringify(rating));

    // Check if the package exists -> Return 409 if not!
    const prefixCheck = await checkPrefixExists(Name);
    if (prefixCheck)
    {
        return Err409;
    }

    // S3 (Version and ID)
    const id: string = await uploadPackage(dir, Name, version, debloat);

    const result = {
        statusCode: 201,
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "OPTIONS,GET,POST,PUT,DELETE",
            "Access-Control-Allow-Headers": "Content-Type",
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

    return result
}

async function contentExtract(content: string, dir: string, Name: string, debloat: boolean)
{
    // Create the buffer
    const zipBuffer = Buffer.from(content, 'base64');

    // Ensure the directory exists
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
    }

    const zipFileDir = dir + ".zip";

    // Write the file to the zip directory
    writeFileSync(zipFileDir, zipBuffer);

    // Unzip the file
    const extractDir = await unzipper.Open.file(zipFileDir);
    extractDir.extract({ path: dir });

    // Wait 100 ms for finalize and convert to base64
    await setTimeout(100);
    
    // Rate and Pass
    try
    {
        const packageData = await readFileSync(dir + "/" + Name + "/package.json", "utf-8");

        const packageJson = JSON.parse(packageData);
        let testurl: string = "";
        var dependencies: any = {};

        // Find the Test URL
        if ("homepage" in packageJson)
        {
            testurl = packageJson.homepage;
        }
        else if ("repository" in packageJson && "url" in packageJson.repository)
        {
            testurl = packageJson.repository.url

            if (testurl.includes("git+"))
            {
                testurl = testurl.split("git+")[1];
            }

            if (testurl.includes(".git"))
            {
                testurl = testurl.split(".git")[0];
            }
        }

        if ("dependencies" in packageJson)
        {
            dependencies = packageJson.dependencies;
        }

        // Disqualify Based on no URL present
        if (testurl == "")
        {
            return Err424;
        }

        // Convert to a valid repo and define the dir for the cloned repo
        const validURL: string = await resolveNpmToGithub(testurl);

        // Rate Package
        var rating: any = await processURL(validURL);

        if (rating.NetScore <= 0.5)
        {
            return Err424;
        }
    }
    catch (err)
    {
        console.log(err);
        return Err424;
    }

    // Debloat the package if true
    debloatPackage(zipFileDir, debloat);

    const zipBufferd = readFileSync(zipFileDir);

    var base64 = zipBufferd.toString('base64');

    // Send Rating to json
    rating.Cost = zipBufferd.byteLength / 1000000;
    rating.ByContent = true;
    rating.Dependencies = dependencies;

    writeFileSync(dir + ".json", JSON.stringify(rating));

    // Check if the package exists -> Return 409 if not!
    const prefixCheck = await checkPrefixExists(Name);
    if (prefixCheck)
    {
        return Err409;
    }

    // UPLOAD TO S3 (Version and ID)
    const id: string = await uploadPackage(dir, Name, "1.0.0", debloat);

    const result = {
        statusCode: 201,
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "OPTIONS,GET,POST,PUT,DELETE",
            "Access-Control-Allow-Headers": "Content-Type",
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

    return result
}

async function mainTest()
{
    // const result: any = await urlExtract("https://github.com/lquixada/cross-fetch", "test/zipTest", false);

    // console.log(result);
    
    const result2 = await contentExtract(`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`,
         "test/zipTest2", "JSONStream", false);

    console.log(result2);

    const result3 = await contentExtract(`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`,
         "test/zipTest3", "easy-math", false);

    console.log(result3);
}

if (process.env.AWS_SECRET_ACCESS_KEY && process.env.AWS_ACCESS_KEY)
{
    mainTest();
}