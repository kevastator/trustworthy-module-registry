import { Handler } from 'aws-lambda';
import { checkValidVersion } from './s3_repo';

const Err400 = {
    statusCode: 400,
    body: {
        message: "There is missing field(s) in the PackageQuery or it is formed improperly, or is invalid."
    }
};

export const handler: Handler = async (event, context) => {
    
    const Version = event.Version;
    const Name = event.Name;

    if (Name == undefined || Version == undefined || !checkValidVersion(Version))
    {
        return Err400;
    }

    // TODO S3 RETRIEVAL IMPLIMENTATION

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

    return result
};