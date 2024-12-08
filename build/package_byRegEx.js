"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const s3_repo_1 = require("./s3_repo");
const Err400 = {
    statusCode: 400,
    headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "OPTIONS,GET,POST,PUT,DELETE",
        "Access-Control-Allow-Headers": "Content-Type",
    },
    body: JSON.stringify({
        message: "There is missing field(s) in the PackageRegEx or it is formed improperly, or is invalid"
    })
};
const Err404 = {
    statusCode: 404,
    headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "OPTIONS,GET,POST,PUT,DELETE",
        "Access-Control-Allow-Headers": "Content-Type",
    },
    body: JSON.stringify({
        message: "No package found under this regex."
    })
};
const handler = async (event, context) => {
    // Check if body is JSON
    let body = undefined;
    try {
        body = JSON.parse(event.body);
    }
    catch {
        return Err400;
    }
    // Console log input
    console.log(body);
    // Try to create a regex object (if invalid return 400)
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
    // If there are no objects in the array it's a 404 error!
    if (foundObjects.length == 0) {
        return Err404;
    }
    // Else return in the proper format
    const result = {
        statusCode: 200,
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "OPTIONS,GET,POST,PUT,DELETE",
            "Access-Control-Allow-Headers": "Content-Type",
        },
        body: JSON.stringify(foundObjects)
    };
    return result;
};
exports.handler = handler;
