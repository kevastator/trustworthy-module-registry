import { Handler } from 'aws-lambda';

const Err400 = {
    statusCode: 400,
    body: {
        message: "There is missing field(s) in the PackageID or it is formed improperly, or is invalid."
    }
};

const Err404 = {
    statusCode: 404,
    body: {
        message: "Package does not exist."
    }
};

export const handler: Handler = async (event, context) => {
    
    const id = event.pathParameters.id

    if (id ==  undefined)
    {
        return Err400;
    }

    // TODO S3 SEARCH AND RETURN 404 IF NOT FOUND

    // MOCK RETURN
    const result = {
        statusCode: 200,
        body: {
            message: {
                Name: "Underscore",
                Version: "1.0.0",
                ID: "123123"
            },
            data: {
                Content: "UEsDBAoAAAAAACAfUFkAAAAAAAAAAAAAAAASAAkAdW5kZXJzY29yZS1t.........fQFQAoADBkODIwZWY3MjkyY2RlYzI4ZGQ4YjVkNTY1OTIxYjgxMDBjYTMzOTc=\n",
                JSProgram: "if (process.argv.length === 7) {\nconsole.log('Success')\nprocess.exit(0)\n} else {\nconsole.log('Failed')\nprocess.exit(1)\n}\n"
            }
        }
    };
};