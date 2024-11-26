import { isValidUrl, processURL, resolveNpmToGithub } from './rate';
import { debloatPackage } from './debloat';
import { uploadPackage, checkPrefixExists } from './s3_repo';
import simpleGit from 'simple-git';
import { readFileSync, existsSync, mkdirSync, createWriteStream, writeFile, writeFileSync, createReadStream } from 'fs';
import archiver from 'archiver'
import * as unzipper from 'unzipper'
import { Handler } from 'aws-lambda';

import { setTimeout } from 'timers/promises';

const Err400 = {
    statusCode: 400,
    body: {
        message: "There is missing field(s) in the PackageData or it is formed improperly (e.g. Content and URL ar both set)"
    }
};

const Err409 = {
    statusCode: 409,
    body: {
        message: "Package exists already."
    }
};

const Err424 = {
    statusCode: 424,
    body: {
        message: "Package is not uploaded due to the disqualified rating."
    }
};

export const handler: Handler = async (event, context) => {
    const url = event.URL;
    const content = event.Content;
    const JS = event.JSProgram;
    var debloat = event.debloat;

    if (debloat == undefined)
    {
        debloat = false;
    }

    if ((url == undefined && content == undefined) || (url != undefined && content != undefined) || JS == undefined)
    {
        return Err400;
    }

    try
    {
        // URL Proceedure
        if (url != undefined)
        {  
            return urlExtract(url, "/tmp/repo", JS, debloat);
        }
        // Content Proceedure
        else
        {
            const Name = event.Name;

            if (Name == undefined)
            {
                return Err400;
            }

            return contentExtract(content, "/tmp/repo", JS, Name, debloat);
        }
    }
    catch
    {
        return Err400;
    }
};

async function urlExtract(testurl: string, dir: string, JSProgram: string, debloat: boolean)
{
    // Check if the url is valid, if not return 400
    if (!isValidUrl(testurl))
    {
        return Err400;
    }

    // Convert to a valid repo and define the dir for the cloned repo
    const validURL: string = await resolveNpmToGithub(testurl);

    const urlStringList: string[] = testurl.split("/");
    var Name: string = urlStringList[urlStringList.length - 1];
    Name = Name[0].toUpperCase() + Name.slice(1);

    // Rate Package
    const rating = await processURL(validURL);
    const ratedResult: number = (rating as { NetScore:number }).NetScore;

    if (ratedResult < 0.5)
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
        await simpleGit().clone(validURL, dir);
    }
    catch
    {
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
    writeFileSync(dir + ".json", JSON.stringify(rating));

    // Check if the package exists -> Return 409 if not!
    const prefixCheck = await checkPrefixExists(Name);
    if (prefixCheck)
    {
        return Err409;
    }

    // S3 (Version and ID)
    const id: string = await uploadPackage(dir, Name);

    const result = {
        statusCode: 201,
        body: {
            metadata: {
                Name: Name,
                Version: "1.0.0",
                ID: id
            },
            data: {
                Content: base64,
                URL: validURL,
                JSProgram: JSProgram
            }
        }
    };

    return result
}

async function contentExtract(content: string, dir: string, JSProgram: string, Name: string, debloat: boolean)
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
    
    // Rate and Pass
    try
    {
        const packageData = await readFileSync(dir + "/package.json", "utf-8");

        const packageJson = JSON.parse(packageData);
        let testurl: string = "";

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

        if (testurl == "")
        {
            return Err424;
        }

        // Convert to a valid repo and define the dir for the cloned repo
        const validURL: string = await resolveNpmToGithub(testurl);

        // Rate Package
        const ratedResult: number = (await processURL(validURL) as { NetScore:number }).NetScore;

        if (ratedResult < 0.5)
        {
            return Err424;
        }

        debloatPackage(zipFileDir, debloat);

        const zipBufferd = readFileSync(zipFileDir);

        var base64 = zipBufferd.toString('base64');
    }
    catch
    {
        return Err424;
    }
    

    // TODO UPLOAD TO S3 (Version and ID)

    const result = {
        statusCode: 201,
        body: {
            metadata: {
                Name: Name,
                Version: "1.0.0",
                ID: "1812719"
            },
            data: {
                Content: base64,
                JSProgram: JSProgram
            }
        }
    };

    return result
}

async function mainTest()
{
    const result: any = await urlExtract("https://github.com/kevastator/461-acme-service", "test/zipTest", "null", false);

    console.log(result);
    
    try
    {
        const result2 = await contentExtract(result.body.data.Content, "test/zipTest2", "null", result.body.metadata.Name, false);

        console.log(result2);
    }
    catch
    {
        console.log("Loopback could not be performed due to no content generated");
    }
}

mainTest();