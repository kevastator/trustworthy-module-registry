"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var _a, _b;
var BASE_URL = "https://os0n6b4nh0.execute-api.us-east-2.amazonaws.com/dev";
// Response Display Helper
function displayResponse(message, isSuccess) {
    var responseBox = document.getElementById("responseBox");
    // Reset styles
    responseBox.className = "response-box";
    // Apply success or error style
    if (isSuccess) {
        responseBox.classList.add("success");
    }
    else {
        responseBox.classList.add("error");
    }
    // Set the message
    responseBox.textContent = message;
}
// Drag-and-Drop Logic
var dragDropZone = document.getElementById("dragDropZone");
var packageFileInput = document.getElementById("packageFile");
if (dragDropZone) {
    dragDropZone.addEventListener("dragover", function (e) {
        e.preventDefault();
        dragDropZone.classList.add("drag-over"); // Highlight on dragover
    });
    dragDropZone.addEventListener("dragleave", function () {
        dragDropZone.classList.remove("drag-over"); // Remove highlight on dragleave
    });
    dragDropZone.addEventListener("drop", function (e) {
        e.preventDefault();
        dragDropZone.classList.remove("drag-over");
        var files = e.dataTransfer.files;
        if (files.length > 0) {
            var file = files[0];
            if (validateZipFile(file)) {
                packageFileInput.files = files; // Assign the file to the input
                dragDropZone.classList.add("file-dropped"); // Visual confirmation
                dragDropZone.innerHTML = "<p>File \"".concat(file.name, "\" is ready for upload.</p>");
                displayResponse("File \"".concat(file.name, "\" is ready for upload."), true);
            }
            else {
                dragDropZone.classList.add("file-error"); // Error styling
                displayResponse("Error: Only .zip files are supported.", false);
            }
        }
    });
    dragDropZone.addEventListener("click", function () { return packageFileInput.click(); });
}
// Validate file type for drag-and-drop and input selection
function validateZipFile(file) {
    return file.type === "application/zip" || file.name.endsWith(".zip");
}
// Clear visual confirmation when file input is reset
packageFileInput.addEventListener("change", function () {
    var _a;
    var file = (_a = packageFileInput.files) === null || _a === void 0 ? void 0 : _a[0];
    if (file && validateZipFile(file)) {
        dragDropZone.classList.add("file-dropped");
        dragDropZone.innerHTML = "<p>File \"".concat(file.name, "\" is ready for upload.</p>");
    }
    else {
        dragDropZone.classList.remove("file-dropped", "file-error");
        dragDropZone.innerHTML = "<p>Drag & Drop a file here or click to upload</p>";
    }
});
// Handle Upload Package Button Click
(_a = document.getElementById("uploadPackageButton")) === null || _a === void 0 ? void 0 : _a.addEventListener("click", function () { return __awaiter(void 0, void 0, void 0, function () {
    var packageName, packageURL, fileInput, formData_1, file, reader_1, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                packageName = document.getElementById("packageName").value.trim();
                packageURL = document.getElementById("packageURL").value.trim();
                fileInput = packageFileInput.files;
                if (!packageName) {
                    displayResponse("Error: Package name is required.", false);
                    return [2 /*return*/];
                }
                if (!packageURL && (!fileInput || fileInput.length === 0)) {
                    displayResponse("Error: Provide either a URL or upload a file.", false);
                    return [2 /*return*/];
                }
                if (packageURL && fileInput && fileInput.length > 0) {
                    displayResponse("Error: You cannot upload a file and provide a URL simultaneously.", false);
                    return [2 /*return*/];
                }
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                formData_1 = { Name: packageName };
                if (packageURL) {
                    formData_1.URL = packageURL;
                }
                else if (fileInput && fileInput.length > 0) {
                    file = fileInput[0];
                    if (!validateZipFile(file)) {
                        displayResponse("Error: Only .zip files are supported.", false);
                        return [2 /*return*/];
                    }
                    reader_1 = new FileReader();
                    reader_1.onload = function () { return __awaiter(void 0, void 0, void 0, function () {
                        var _a;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0:
                                    formData_1.Content = (_a = reader_1.result) === null || _a === void 0 ? void 0 : _a.toString().split(",")[1]; // Base64 content
                                    return [4 /*yield*/, uploadPackage(formData_1)];
                                case 1:
                                    _b.sent();
                                    return [2 /*return*/];
                            }
                        });
                    }); };
                    reader_1.readAsDataURL(file);
                    return [2 /*return*/]; // Exit as the FileReader is asynchronous
                }
                return [4 /*yield*/, uploadPackage(formData_1)];
            case 2:
                _a.sent();
                return [3 /*break*/, 4];
            case 3:
                error_1 = _a.sent();
                if (error_1 instanceof Error) {
                    displayResponse("Network error: ".concat(error_1.message), false);
                }
                else {
                    displayResponse("An unexpected error occurred during upload.", false);
                }
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// Helper Function to Upload the Package
function uploadPackage(data) {
    return __awaiter(this, void 0, void 0, function () {
        var response, responseData, errorDetails, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 6, , 7]);
                    return [4 /*yield*/, fetch("".concat(BASE_URL, "/package"), {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(data),
                        })];
                case 1:
                    response = _a.sent();
                    if (!response.ok) return [3 /*break*/, 3];
                    return [4 /*yield*/, response.json()];
                case 2:
                    responseData = _a.sent();
                    displayResponse("Success: Package uploaded. ID: ".concat(responseData.metadata.ID), true);
                    return [3 /*break*/, 5];
                case 3: return [4 /*yield*/, response.json()];
                case 4:
                    errorDetails = _a.sent();
                    switch (response.status) {
                        case 400:
                            displayResponse("Error 400: ".concat(errorDetails.message), false);
                            break;
                        case 409:
                            displayResponse("Error 409: ".concat(errorDetails.message), false);
                            break;
                        case 424:
                            displayResponse("Error 424: ".concat(errorDetails.message), false);
                            break;
                        default:
                            displayResponse("Error ".concat(response.status, ": ").concat(errorDetails.message), false);
                            break;
                    }
                    _a.label = 5;
                case 5: return [3 /*break*/, 7];
                case 6:
                    err_1 = _a.sent();
                    if (err_1 instanceof Error) {
                        displayResponse("Network error: ".concat(err_1.message), false);
                    }
                    else {
                        displayResponse("An unexpected error occurred during upload.", false);
                    }
                    return [3 /*break*/, 7];
                case 7: return [2 /*return*/];
            }
        });
    });
}
// Handle Reset Button Click
(_b = document.getElementById("confirmResetButton")) === null || _b === void 0 ? void 0 : _b.addEventListener("click", function () { return __awaiter(void 0, void 0, void 0, function () {
    var response, errorDetails, err_2, resetModalElement, backdrop;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 5, , 6]);
                return [4 /*yield*/, fetch("".concat(BASE_URL, "/reset"), {
                        method: "DELETE",
                    })];
            case 1:
                response = _a.sent();
                if (!response.ok) return [3 /*break*/, 2];
                displayResponse("Database successfully reset!", true);
                return [3 /*break*/, 4];
            case 2: return [4 /*yield*/, response.json()];
            case 3:
                errorDetails = _a.sent();
                displayResponse("Error ".concat(response.status, ": ").concat(errorDetails.message), false);
                _a.label = 4;
            case 4: return [3 /*break*/, 6];
            case 5:
                err_2 = _a.sent();
                if (err_2 instanceof Error) {
                    displayResponse("Network error: ".concat(err_2.message), false);
                }
                else {
                    displayResponse("An unexpected error occurred during reset.", false);
                }
                return [3 /*break*/, 6];
            case 6:
                resetModalElement = document.getElementById("resetModal");
                if (resetModalElement) {
                    resetModalElement.classList.remove("show");
                    resetModalElement.setAttribute("aria-hidden", "true");
                    resetModalElement.removeAttribute("aria-modal");
                    resetModalElement.style.display = "none";
                    document.body.classList.remove("modal-open");
                    backdrop = document.querySelector(".modal-backdrop");
                    if (backdrop)
                        backdrop.remove();
                }
                return [2 /*return*/];
        }
    });
}); });
