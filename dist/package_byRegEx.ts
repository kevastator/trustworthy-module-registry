import { Handler } from 'aws-lambda';

const Err400 = {
    statusCode: 400,
    body: {
        message: "There is missing field(s) in the PackageRegEx or it is formed improperly, or is invalid"
    }
};

const Err404 = {
    statusCode: 404,
    body: {
        message: "No package found under this regex."
    }
};

export const handler: Handler = async (event, context) => {
    const RegEx = event.RegEx

    if (RegEx == undefined)
    {
        return Err400;
    }

    //TODO SEARCH BY PACKAGE REGEX (RETURN 404 IF NOT FOUND)

    // MOCK RETURN
    const result = {
        statusCode: 200,
        body: [
            {
                Version: "1.2.3",
                Name: "Underscore",
                ID: "17621"
            },
            {
                Version: "1.2.3",
                Name: "Lodash",
                ID: "91273"
            },
            {
                Version: "1.2.3",
                Name: "React",
                ID: "71283"
            }
        ]
    };

    return result;
};