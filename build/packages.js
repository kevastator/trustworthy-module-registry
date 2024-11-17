"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const versionRegex = /^(?:(\^|\~)?\d+\.\d+\.\d+)(?:-(\d+\.\d+\.\d+))?$/;
const Err400 = {
    statusCode: 400,
    body: {
        message: "There is missing field(s) in the PackageQuery or it is formed improperly, or is invalid."
    }
};
const handler = async (event, context) => {
    const Version = event.Version;
    const Name = event.Name;
    if (Name == undefined || Version == undefined || !checkValidVersion(Version)) {
        return Err400;
    }
    return "TODO";
};
exports.handler = handler;
function checkValidVersion(versionString) {
    const regex = versionRegex.test(versionString);
    const isRangeWithCaretOrTilde = versionString.includes('-') && (versionString.startsWith('^') || versionString.startsWith('~'));
    return regex && !isRangeWithCaretOrTilde;
}
console.log(checkValidVersion("12.122.1"));
console.log(checkValidVersion("~3.4.11"));
console.log(checkValidVersion("^7.190.21"));
console.log(checkValidVersion("8.5.6-7.8.4"));
console.log(checkValidVersion("a8.5.6-7.8.4"));
console.log(checkValidVersion("^~8.5.6-7.8.4"));
console.log(checkValidVersion("^8.5.6-7.8.4"));
console.log(checkValidVersion("12.122.1.1"));
