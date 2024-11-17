import { Handler } from 'aws-lambda';

const versionRegex = /^(?:(\^|\~)?\d+\.\d+\.\d+)(?:-(\d+\.\d+\.\d+))?$/;

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

function checkValidVersion(versionString: string): boolean
{
    const regex =  versionRegex.test(versionString);

    const isRangeWithCaretOrTilde = versionString.includes('-') && (versionString.startsWith('^') || versionString.startsWith('~'));

    return regex && !isRangeWithCaretOrTilde;
}

// console.log(checkValidVersion("12.122.1"));
// console.log(checkValidVersion("~3.4.11"));
// console.log(checkValidVersion("^7.190.21"));
// console.log(checkValidVersion("8.5.6-7.8.4"));
// console.log(checkValidVersion("a8.5.6-7.8.4"));
// console.log(checkValidVersion("^~8.5.6-7.8.4"));
// console.log(checkValidVersion("^8.5.6-7.8.4"));
// console.log(checkValidVersion("12.122.1.1"));