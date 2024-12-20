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
        message: "There is missing field(s) in the PackageID or it is formed improperly, or is invalid."
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
        message: "Package does not exist."
    })
};
const handler = async (event, context) => {
    // Get ID from path parameters
    const id = event.pathParameters.id;
    console.log(id);
    let dep = false;
    if (id == undefined) {
        return Err400;
    }
    // Check if the query parameters are set
    if (event.queryStringParameters != undefined && event.queryStringParameters.dependency != undefined) {
        dep = event.queryStringParameters.dependency;
    }
    console.log(dep);
    // S3 SEARCH AND RETURN 404 IF NOT FOUND
    const searchResults = await (0, s3_repo_1.getCostByID)(id, id, dep, {});
    if (!(id in searchResults) || searchResults[id] == undefined) {
        return Err404;
    }
    // Formatting was fixed in recusive object array return
    const result = {
        statusCode: 200,
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "OPTIONS,GET,POST,PUT,DELETE",
            "Access-Control-Allow-Headers": "Content-Type",
        },
        body: JSON.stringify(searchResults)
    };
    return result;
};
exports.handler = handler;
