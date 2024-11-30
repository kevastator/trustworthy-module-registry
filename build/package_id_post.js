"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const s3_repo_1 = require("./s3_repo");
const Res200 = {
    statusCode: 200,
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify({
        message: "Version is updated."
    })
};
const Err400 = {
    statusCode: 400,
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify({
        message: "There is missing field(s) in the PackageData or it is formed improperly (e.g. Content and URL ar both set)"
    })
};
const Err409 = {
    statusCode: 409,
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify({
        message: "Package exists already."
    })
};
const Err424 = {
    statusCode: 424,
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify({
        message: "Package is not uploaded due to the disqualified rating."
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
    const id = body.metadata.ID;
    const version = body.metadata.Version;
    const Name = body.metadata.Name;
    const url = body.data.URL;
    const content = body.data.Content;
    var debloat = body.data.debloat;
    if (debloat == undefined) {
        debloat = false;
    }
    if ((url == undefined && content == undefined) || (url != undefined && content != undefined)) {
        return Err400;
    }
    const prefixCheck = await (0, s3_repo_1.checkPrefixExists)(Name);
};
exports.handler = handler;
