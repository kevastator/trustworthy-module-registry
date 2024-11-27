"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const s3_repo_1 = require("./s3_repo");
const Err401 = {
    statusCode: 401,
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify({
        message: "You do not have permission to reset the registry."
    })
};
const handler = async (event, context) => {
    await (0, s3_repo_1.reset)();
    const result = {
        statusCode: 200,
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            message: "Registry is reset."
        })
    };
    return result;
};
exports.handler = handler;
async function mainTest() {
    await (0, s3_repo_1.reset)();
    console.log("Supposedly Reset!");
}
if (process.env.AWS_SECRET_ACCESS_KEY && process.env.AWS_ACCESS_KEY) {
    mainTest();
}
