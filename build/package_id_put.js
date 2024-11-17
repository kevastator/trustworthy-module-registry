"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const Res200 = {
    statusCode: 200,
    body: {
        message: "Version is updated."
    }
};
const Err400 = {
    statusCode: 400,
    body: {
        message: "There is missing field(s) in the PackageData or it is formed improperly (e.g. Content and URL ar both set)"
    }
};
const Err409 = {
    statusCode: 409,
    body: {
        message: "Package exists already."
    }
};
const Err424 = {
    statusCode: 424,
    body: {
        message: "Package is not uploaded due to the disqualified rating."
    }
};
const handler = async (event, context) => {
    return 200;
};
exports.handler = handler;
