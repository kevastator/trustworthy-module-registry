"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const s3_repo_1 = require("./s3_repo");
const Err401 = {
    statusCode: 401,
    body: {
        message: "You do not have permission to reset the registry."
    }
};
const handler = async (event, context) => {
    await (0, s3_repo_1.reset)();
    const result = {
        statusCode: 200,
        message: "Registry is reset."
    };
    return result;
};
exports.handler = handler;
async function mainTest() {
    await (0, s3_repo_1.reset)();
    console.log("Supposedly Reset!");
}
mainTest();
