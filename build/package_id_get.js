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
    if (id == undefined) {
        return Err400;
    }
    // TODO S3 SEARCH AND RETURN 404 IF NOT FOUND
    // MOCK RETURN
    const result = {
        statusCode: 200,
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            message: {
                Name: "Underscore",
                Version: "1.0.0",
                ID: "123123"
            },
            data: {
                Content: "UEsDBAoAAAAAACAfUFkAAAAAAAAAAAAAAAASAAkAdW5kZXJzY29yZS1t.........fQFQAoADBkODIwZWY3MjkyY2RlYzI4ZGQ4YjVkNTY1OTIxYjgxMDBjYTMzOTc=\n"
            }
        })
    };
};
exports.handler = handler;
