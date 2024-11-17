import { Handler } from 'aws-lambda';

const Err401 = {
    statusCode: 401,
    body: {
        message: "You do not have permission to reset the registry."
    }
};

export const handler: Handler = async (event, context) => {

    const result = {
        statusCode: 200,
        message: "Registry is reset."
    }

    return result;
};