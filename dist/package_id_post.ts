import { Handler } from 'aws-lambda';
import { isValidUrl, processURL, resolveNpmToGithub } from './rate';
import { debloatPackage } from './debloat';
import { uploadPackage, checkPrefixExists, checkValidVersion, delimeter, getPrefixParamsByID, versionGreaterThan, checkIfUploadByContent } from './s3_repo';
import { promises as fs, readFileSync, existsSync, mkdirSync, createWriteStream, writeFile, writeFileSync, createReadStream } from 'fs';
import archiver from 'archiver'
import * as unzipper from 'unzipper'

import * as path from 'path';
import * as http from 'isomorphic-git/http/node';
import * as git from 'isomorphic-git';

import { setTimeout } from 'timers/promises';

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

export const handler: Handler = async (event, context) => {
    let body = undefined;
    const ID = event.pathParameters.id
    
    try
    {
        body = JSON.parse(event.body); 
    }
    catch
    {
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

    if (debloat == undefined)
    {
        debloat = false;
    }

    if ((URL == undefined && Content == undefined) || (URL != undefined && Content != undefined) || ID == undefined || !checkValidVersion(Version) || metaID != ID)
    {
        return Err400;
    }

    const versionExistCheck = await checkPrefixExists(Name + delimeter + Version);

    if (versionExistCheck)
    {
        return Err409;
    }

    const updateFields = await getPrefixParamsByID(ID);

    if (updateFields.Version == "")
    {
        return Err404;
    }

    if (updateFields.Name != Name || !versionGreaterThan(Version, updateFields.Version))
    {
        return Err400;
    }

    const byContentCheck = await checkIfUploadByContent(ID);

    if ((Content == undefined) == byContentCheck)
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
        if (URL != undefined)
        {  
            return urlExtract(URL, dir, Name, Version, debloat);
        }
        // Content Proceedure
        else
        {
            // Check formatting of the Name
            if (Name == undefined || Name.includes("/"))
            {
                return Err400;
            }

            return contentExtract(Content, dir, Name, Version, debloat);
        }
    }
    catch
    {
        return Err400;
    }
};

async function urlExtract(testurl: string, dir: string, Name: string, Version: string, debloat: boolean)
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
        });
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

    //const base64 = zipBuffer.toString('base64');

    // Send Rating to json
    rating.Cost = zipBuffer.byteLength / 1000000;
    rating.ByContent = false;

    writeFileSync(dir + ".json", JSON.stringify(rating));

    // S3 (Version and ID)
    const id: string = await uploadPackage(dir, Name, Version, debloat);

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

async function contentExtract(content: string, dir: string, Name: string, Version: string, debloat: boolean)
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

    //var base64 = zipBufferd.toString('base64');

    // Send Rating to json
    rating.Cost = zipBufferd.byteLength / 1000000;
    rating.ByContent = true;

    writeFileSync(dir + ".json", JSON.stringify(rating));

    // UPLOAD TO S3 (Version and ID)
    const id: string = await uploadPackage(dir, Name, Version, debloat);

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

async function mainTest()
{
    const result: any = await urlExtract("https://github.com/kevastator/461-acme-service", "test/zipTest", "461-acme-service", "2.0.0", true);

    console.log(result);
}

if (process.env.AWS_SECRET_ACCESS_KEY && process.env.AWS_ACCESS_KEY)
{
    mainTest();
}