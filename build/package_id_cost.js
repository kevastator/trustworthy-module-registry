"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
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
const handler = async (event, context) => {
    const id = event.pathParameters.id;
    let dep = event.queryStringParameters.dependency;
    if (id == undefined) {
        return Err400;
    }
    if (dep == undefined) {
        dep = false;
    }
    return Err400;
};
exports.handler = handler;
