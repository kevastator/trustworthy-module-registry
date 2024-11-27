"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const s3_repo_1 = require("./s3_repo");
const Err400 = {
    statusCode: 400,
    body: {
        message: "There is missing field(s) in the PackageQuery or it is formed improperly, or is invalid."
    }
};
const handler = async (event, context) => {
    const Version = event.Version;
    const Name = event.Name;
    if (Name == undefined || Version == undefined || !(0, s3_repo_1.checkValidVersion)(Version)) {
        return Err400;
    }
    // TODO S3 RETRIEVAL IMPLIMENTATION
    // MOCK RETURN
    const result = {
        statusCode: 200,
        body: [
            {
                Version: "1.2.3",
                Name: "Underscore",
                ID: "17621"
            },
            {
                Version: "1.2.3",
                Name: "Lodash",
                ID: "91273"
            },
            {
                Version: "1.2.3",
                Name: "React",
                ID: "71283"
            }
        ]
    };
    return result;
};
exports.handler = handler;
