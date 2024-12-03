import { Handler } from 'aws-lambda';
import { checkValidVersionRegex, getPackagesArray } from './s3_repo';

const Err400 = {
    statusCode: 400,
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify({
        message: "There is missing field(s) in the PackageQuery or it is formed improperly, or is invalid."
    })
};

const Err413 = {
    statusCode: 413,
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify({
        message: "Too many packages returned."
    })
};

export const handler: Handler = async (event, context) => {
    
    let body: any[] = [];
    
    try
    {
        body = JSON.parse(event.body); 

        for (let i = 0; i < body.length; i++)
        {
            if (body[i].Name == undefined || body[i].Version == undefined || !checkValidVersionRegex(body[i].Version))
            {
                return Err400;
            }
        }
    }
    catch
    {
        return Err400;
    }

    // S3 RETRIEVAL IMPLIMENTATION
    const foundObjects: object[] = await getPackagesArray(body);

    if (foundObjects.length == 0)
    {
        const result = {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(foundObjects)
        };

        return result
    }
    else if ("Err" in foundObjects[0])
    {
        return Err413;
    }

    const result = {
        statusCode: 200,
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(foundObjects)
    };

    return result
};