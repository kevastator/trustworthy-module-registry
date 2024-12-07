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
    // Formatting was fixed in recusive object array return
    const id = event.pathParameters.id;
    console.log(id);
    if (id == undefined) {
        return Err400;
    }
    // S3 SEARCH AND RETURN 404 IF NOT FOUND
    const searchResults = await (0, s3_repo_1.getByID)(id);
    // If there is nothing in content there is no object to return in the first place
    if (searchResults.Content == "") {
        return Err404;
    }
    // Else if return the response object with the url in the body
    if ("URL" in searchResults) {
        const result = {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "OPTIONS,GET,POST,PUT,DELETE",
                "Access-Control-Allow-Headers": "Content-Type",
            },
            body: JSON.stringify({
                metadata: {
                    Name: searchResults.Name,
                    Version: searchResults.Version,
                    ID: searchResults.ID
                },
                data: {
                    Content: searchResults.Content,
                    URL: searchResults.URL
                }
            })
        };
        return result;
    }
    else // Return no url if by content
     {
        const result = {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "OPTIONS,GET,POST,PUT,DELETE",
                "Access-Control-Allow-Headers": "Content-Type",
            },
            body: JSON.stringify({
                metadata: {
                    Name: searchResults.Name,
                    Version: searchResults.Version,
                    ID: searchResults.ID
                },
                data: {
                    Content: searchResults.Content
                }
            })
        };
        return result;
    }
};
exports.handler = handler;
