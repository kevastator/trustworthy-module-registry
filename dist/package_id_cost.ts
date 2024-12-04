import { Handler } from 'aws-lambda';
import { getCostByID } from './s3_repo';
import { dependencies } from 'webpack';

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

export const handler: Handler = async (event, context) => {

    const id = event.pathParameters.id

    let dep: boolean = event.queryStringParameters.dependency

    if (id ==  undefined)
    {
        return Err400;
    }

    if (dep == undefined)
    {
        dep = false;
    }

    // S3 SEARCH AND RETURN 404 IF NOT FOUND
    const searchResults = await getCostByID(id, dep);

    if (searchResults.id = undefined)
    {
        return Err404;
    }

    // Formatting was fixed in recusive object array return
    const result = {
        statusCode: 200,
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(searchResults)
    };

    return result;
};