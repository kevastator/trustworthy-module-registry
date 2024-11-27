import { Handler } from 'aws-lambda';
import { reset } from './s3_repo';

const Err401 = {
    statusCode: 401,
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify({
        message: "You do not have permission to reset the registry."
    })
};

export const handler: Handler = async (event, context) => {

    await reset();

    const result = {
        statusCode: 200,
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
        message: "Registry is reset."
        })
    }

    return result;
};

async function mainTest()
{
    await reset();

    console.log("Supposedly Reset!")
}

if (process.env.AWS_SECRET_ACCESS_KEY && process.env.AWS_ACCESS_KEY)
{
    mainTest();
}