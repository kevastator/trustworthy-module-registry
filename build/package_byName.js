"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const handler = async (event, context) => {
    console.log('EVENT: \n' + JSON.stringify(event, null, 2));
    return "TODO";
};
exports.handler = handler;
