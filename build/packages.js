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
        message: "There is missing field(s) in the PackageQuery or it is formed improperly, or is invalid."
    })
};
const Err413 = {
    statusCode: 413,
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify({
        message: "Too many packages returned."
    })
};
const handler = async (event, context) => {
    let body = [];
    try {
        body = JSON.parse(event.body);
        for (let i = 0; i < body.length; i++) {
            if (body[i].Name == undefined || (body[i].Version != undefined && body[i].Version != "" && !(0, s3_repo_1.checkValidVersionRegex)(body[i].Version))) {
                return Err400;
            }
        }
    }
    catch (err) {
        console.log(err);
        return Err400;
    }
    // S3 RETRIEVAL IMPLIMENTATION
    const foundObjects = await (0, s3_repo_1.getPackagesArray)(body);
    if (foundObjects.length == 0) {
        const result = {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(foundObjects)
        };
        return result;
    }
    else if ("Err" in foundObjects[0]) {
        return Err413;
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
