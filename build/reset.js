"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const Err401 = {
    statusCode: 401,
    body: {
        message: "You do not have permission to reset the registry."
    }
};
const handler = async (event, context) => {
    const result = {
        statusCode: 200,
        message: "Registry is reset."
    };
    return result;
};
exports.handler = handler;
