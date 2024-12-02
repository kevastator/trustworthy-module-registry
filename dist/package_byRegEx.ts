import { Handler } from 'aws-lambda';
import { getRegexArray } from './s3_repo';

const Err400 = {
    statusCode: 400,
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify({
        message: "There is missing field(s) in the PackageRegEx or it is formed improperly, or is invalid"
    })
};

const Err404 = {
    statusCode: 404,
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify({
        message: "No package found under this regex."
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

    if (foundObjects.length == 0)
    {
        return Err404;
    }

    const result = {
        statusCode: 200,
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(foundObjects)
    };

    return result;
};