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
    var dependencies: any = {};

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

    // Wait 10 ms for finalize and convert to base64
    await setTimeout(100);
    
    // Rate and Pass
    try
    {
        const packageData = await readFileSync(dir + "/package.json", "utf-8");

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
    catch
    {
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

    return result
}

async function mainTest()
{
    const result: any = await urlExtract("https://www.npmjs.com/package/react", "test/zipTest", false);

    console.log(result);
    
    try
    {
        const body = JSON.parse(result.body);
        const result2 = await contentExtract(body.data.Content, "test/zipTest2", body.metadata.Name, false);

        console.log(result2);
    }
    catch (err)
    {
        console.log(err);
        console.log("Loopback could not be performed due to no content generated");
    }
}

if (process.env.AWS_SECRET_ACCESS_KEY && process.env.AWS_ACCESS_KEY)
{
    mainTest();
}