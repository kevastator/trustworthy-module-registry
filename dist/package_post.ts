import { isValidUrl, processURL, resolveNpmToGithub } from './rate';
import simpleGit, { SimpleGit } from 'simple-git';
import { readFileSync, existsSync, mkdirSync, createWriteStream, writeFile, writeFileSync, createReadStream } from 'fs';
import archiver from 'archiver'
import * as unzipper from 'unzipper'
import { Handler } from 'aws-lambda';
import { S3 } from "aws-sdk";
import axios from 'axios';

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
    const JS = event.JSProgram

    if ((url == undefined && content == undefined) || (url != undefined && content != undefined) || JS == undefined)
    {
        return Err400;
    }

    try
    {
        // URL Proceedure
        if (url != undefined)
        {  
            return urlExtract(url, "/tmp/repo", JS);
        }
        // Content Proceedure
        else
        {
            const Name = event.Name;

            if (Name == undefined)
            {
                return Err400;
            }

            return contentExtract(content, "/tmp/repo", JS, Name);
        }
    }
    catch
    {
        return Err400;
    }
};

async function urlExtract(testurl: string, dir: string, JSProgram: string)
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
    const ratedResult: number = (await processURL(validURL) as { NetScore:number }).NetScore;

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

    const zipBuffer = readFileSync(zipdir);

    const base64 = zipBuffer.toString('base64');

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
                URL: validURL,
                JSProgram: JSProgram
            }
        }
    };

    return result
}

async function contentExtract(content: string, dir: string, JSProgram: string, Name: string)
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
    
    // TODO RATE

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
                Content: content,
                JSProgram: JSProgram
            }
        }
    };

    return result
}