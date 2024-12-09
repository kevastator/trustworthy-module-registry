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
var BASE_URL = "https://os0n6b4nh0.execute-api.us-east-2.amazonaws.com/dev";
var resultsContainer = document.getElementById("resultsContainer");
var currentOffset = null; // Track the offset for pagination
/**
 * Fetches search results from the API.
 * @param searchName - The search name query string.
 * @param versionQuery - The search version query string.
 * @param offset - The offset for pagination (null for the first page).
 */
function fetchResults(searchName_1, versionQuery_1) {
    return __awaiter(this, arguments, void 0, function (searchName, versionQuery, offset) {
        var bodyPayload, headers, response, data, nextOffset, errorText, error_1;
        if (offset === void 0) { offset = null; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 6, , 7]);
                    bodyPayload = [
                        { Name: searchName || "*", Version: versionQuery || "" }
                    ];
                    headers = { "Content-Type": "application/json" };
                    if (offset) {
                        headers["offset"] = offset; // Include offset header for pagination
                    }
                    return [4 /*yield*/, fetch("".concat(BASE_URL, "/packages"), {
                            method: "POST",
                            headers: headers,
                            body: JSON.stringify(bodyPayload),
                        })];
                case 1:
                    response = _a.sent();
                    if (!response.ok) return [3 /*break*/, 3];
                    return [4 /*yield*/, response.json()];
                case 2:
                    data = _a.sent();
                    nextOffset = response.headers.get("offset");
                    currentOffset = nextOffset; // Update the offset for pagination
                    if (Array.isArray(data) && data.length > 0) {
                        displayResults(data, !!nextOffset); // Pass whether there are more results
                    }
                    else {
                        resultsContainer.innerHTML = "<p class=\"text-center text-muted\">No results found.</p>";
                    }
                    return [3 /*break*/, 5];
                case 3: return [4 /*yield*/, response.text()];
                case 4:
                    errorText = _a.sent();
                    resultsContainer.innerHTML = "<p class=\"text-center text-danger\">Error fetching results: ".concat(response.status, " - ").concat(errorText, "</p>");
                    _a.label = 5;
                case 5: return [3 /*break*/, 7];
                case 6:
                    error_1 = _a.sent();
                    console.error("Error fetching search results:", error_1);
                    resultsContainer.innerHTML = "<p class=\"text-center text-danger\">An error occurred while fetching results.</p>";
                    return [3 /*break*/, 7];
                case 7: return [2 /*return*/];
            }
        });
    });
}
/**
 * Displays the fetched results in the results container.
 * @param results - The array of search results.
 * @param hasMoreResults - Whether there are more results for pagination.
 */
/**
 * Displays the fetched results in the results container.
 * @param results - The array of search results.
 * @param hasMoreResults - Whether there are more results for pagination.
 */
function displayResults(results, hasMoreResults) {
    var _this = this;
    resultsContainer.innerHTML = "";
    if (results.length === 0) {
        resultsContainer.innerHTML = "<p class='text-center text-muted'>No results found.</p>";
        return;
    }
    var html = results
        .map(function (result) { return "\n        <div class=\"result-card\">\n            <div class=\"result-card-content\">\n                <h5>".concat(result.Name, "</h5>\n                <p><strong>ID:</strong> ").concat(result.ID, "</p>\n                <p><strong>Version:</strong> ").concat(result.Version, "</p>\n            </div>\n            <div class=\"result-card-action\">\n                <button class=\"btn btn-primary download-btn\" data-id=\"").concat(result.ID, "\">Download</button>\n                <a href=\"package_info.html?id=").concat(result.ID, "\" class=\"btn btn-info\">Info</a>\n            </div>\n        </div>\n    "); })
        .join("");
    resultsContainer.innerHTML += html;
    if (hasMoreResults) {
        resultsContainer.innerHTML += "\n            <div class=\"text-center mt-4\">\n                <button class=\"btn btn-secondary\" id=\"loadMoreButton\">Load More</button>\n            </div>\n        ";
        var loadMoreButton = document.getElementById("loadMoreButton");
        loadMoreButton.addEventListener("click", function () {
            fetchResults(getQueriesFromURL().searchName, getQueriesFromURL().version, currentOffset);
        });
    }
    // Attach download event listeners
    var downloadButtons = document.querySelectorAll(".download-btn");
    downloadButtons.forEach(function (button) {
        button.addEventListener("click", function (e) { return __awaiter(_this, void 0, void 0, function () {
            var target, packageId;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        target = e.target;
                        packageId = target.getAttribute("data-id");
                        if (!packageId) return [3 /*break*/, 2];
                        return [4 /*yield*/, downloadPackage(packageId)];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2: return [2 /*return*/];
                }
            });
        }); });
    });
}
/**
 * Downloads a package by ID.
 * @param packageId - The ID of the package to download.
 */
function downloadPackage(packageId) {
    return __awaiter(this, void 0, void 0, function () {
        var response, blob, downloadUrl, a, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, fetch("".concat(BASE_URL, "/package/").concat(packageId))];
                case 1:
                    response = _a.sent();
                    if (!response.ok) {
                        throw new Error("Failed to download package: ".concat(response.statusText));
                    }
                    return [4 /*yield*/, response.blob()];
                case 2:
                    blob = _a.sent();
                    downloadUrl = window.URL.createObjectURL(blob);
                    a = document.createElement("a");
                    a.href = downloadUrl;
                    a.download = "".concat(packageId, ".zip"); // Change extension based on expected content type
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    // Revoke the object URL after download
                    window.URL.revokeObjectURL(downloadUrl);
                    return [3 /*break*/, 4];
                case 3:
                    error_2 = _a.sent();
                    console.error("Error downloading package:", error_2);
                    alert("An error occurred while downloading the package.");
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Retrieves the query parameters from the URL.
 * @returns An object with searchName and version query strings.
 */
function getQueriesFromURL() {
    var urlParams = new URLSearchParams(window.location.search);
    var searchName = urlParams.get("name") || "*"; // Default to match all names
    var versionQuery = urlParams.get("version") || ""; // Default to all versions
    return { searchName: searchName, version: versionQuery };
}
// Main execution
var _a = getQueriesFromURL(), searchName = _a.searchName, version = _a.version;
fetchResults(searchName, version);
