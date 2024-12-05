import { Handler } from 'aws-lambda';
import { getByID } from './s3_repo';

const Err400 = {
    statusCode: 400,
    headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "OPTIONS,GET,POST,PUT,DELETE",
        "Access-Control-Allow-Headers": "Content-Type",
    },
    body: JSON.stringify({
        message: "There is missing field(s) in the PackageID or it is formed improperly, or is invalid."
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
        message: "Package does not exist."
    })
};

export const handler: Handler = async (event, context) => {
    
    const id = event.pathParameters.id

    if (id ==  undefined)
    {
        return Err400;
    }

    // S3 SEARCH AND RETURN 404 IF NOT FOUND
    const searchResults = await getByID(id);

    if (searchResults.Content == "")
    {
        return Err404;
    }

    if ("URL" in searchResults)
    {
        const result = {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "OPTIONS,GET,POST,PUT,DELETE",
                "Access-Control-Allow-Headers": "Content-Type",
            },
            body: JSON.stringify({
                metadata: {
                    Name: searchResults.Name,
                    Version: searchResults.Version,
                    ID: searchResults.ID
                },
                data: {
                    Content: searchResults.Content,
                    URL: searchResults.URL
                }
            })
        };

        return result;
    }
    else
    {
        const result = {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "OPTIONS,GET,POST,PUT,DELETE",
                "Access-Control-Allow-Headers": "Content-Type",
            },
            body: JSON.stringify({
                metadata: {
                    Name: searchResults.Name,
                    Version: searchResults.Version,
                    ID: searchResults.ID
                },
                data: {
                    Content: searchResults.Content
                }
            })
        };

        return result;
    }
};