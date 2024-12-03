import { Handler } from 'aws-lambda';

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

    return Err400;
};