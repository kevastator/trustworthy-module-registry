import { Handler } from 'aws-lambda';
import { getRegexArray } from './s3_repo';

const Err400 = {
    statusCode: 400,
    headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "OPTIONS,GET,POST,PUT,DELETE",
        "Access-Control-Allow-Headers": "Content-Type",
    },
    body: JSON.stringify({
        message: "There is missing field(s) in the PackageRegEx or it is formed improperly, or is invalid"
    })
};

const Err404 = {
    statusCode: 404,
    headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "OPTIONS,GET,POST,PUT,DELETE",
        "Access-Control-Allow-Headers": "Content-Type",
    },
    body: JSON.stringify({
        message: "No package found under this regex."
    })
};

export const handler: Handler = async (event, context) => {
    // Check if body is JSON
    let body = undefined;
    
    try
    {
        body = JSON.parse(event.body); 
    }
    catch
    {
        return Err400;
    }

    // Console log input
    console.log(body);
    
    // Try to create a regex object (if invalid return 400)
    try
    {
        var RegEx: RegExp = RegExp(body.RegEx);
    }
    catch (err)
    {
        console.log(err);
        return Err400;
    }
    

    if (RegEx == undefined)
    {
        return Err400;
    }

    // Search S3 using the Regex Array
    const foundObjects: object[] = await getRegexArray(RegEx);

    // If there are no objects in the array it's a 404 error!
    if (foundObjects.length == 0)
    {
        return Err404;
    }

    // Else return in the proper format
    const result = {
        statusCode: 200,
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "OPTIONS,GET,POST,PUT,DELETE",
            "Access-Control-Allow-Headers": "Content-Type",
        },
        body: JSON.stringify(foundObjects)
    };

    return result;
};