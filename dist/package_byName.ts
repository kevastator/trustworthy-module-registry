import { Handler } from 'aws-lambda';

// TEST

export const handler: Handler = async (event, context) => {
    console.log('EVENT: \n' + JSON.stringify(event, null, 2));
    return "TODO";
};