import { Handler } from 'aws-lambda';
import { reset } from './s3_repo';

const Err401 = {
    statusCode: 401,
    body: {
        message: "You do not have permission to reset the registry."
    }
};

export const handler: Handler = async (event, context) => {

    await reset();

    const result = {
        statusCode: 200,
        message: "Registry is reset."
    }

    return result;
};

async function mainTest()
{
    await reset();

    console.log("Supposedly Reset!")
}

mainTest();