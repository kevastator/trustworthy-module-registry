"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const s3_repo_1 = require("./s3_repo");
const Err400 = {
    statusCode: 400,
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify({
        message: "There is missing field(s) in the PackageRegEx or it is formed improperly, or is invalid"
    })
};
const Err404 = {
    statusCode: 404,
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify({
        message: "No package found under this regex."
    })
};
const handler = async (event, context) => {
    let body = undefined;
    try {
        body = JSON.parse(event.body);
    }
    catch {
        return Err400;
    }
    try {
        var RegEx = RegExp(body.RegEx);
    }
    catch (err) {
        console.log(err);
        return Err400;
    }
    if (RegEx == undefined) {
        return Err400;
    }
    // Search S3 using the Regex Array
    const foundObjects = await (0, s3_repo_1.getRegexArray)(RegEx);
    if (foundObjects.length == 0) {
        return Err404;
    }
    const result = {
        statusCode: 200,
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(foundObjects)
    };
    return result;
};
exports.handler = handler;
