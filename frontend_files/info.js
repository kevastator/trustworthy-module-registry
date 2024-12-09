"use strict";
const BASE_URL = "https://os0n6b4nh0.execute-api.us-east-2.amazonaws.com/dev";
// Response Display Helper
function displayResponse(message, isSuccess) {
    const responseBox = document.getElementById("responseBox");
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
const dragDropZone = document.getElementById("dragDropZone");
const packageFileInput = document.getElementById("packageFile");
if (dragDropZone) {
    dragDropZone.addEventListener("dragover", (e) => {
        e.preventDefault();
        dragDropZone.classList.add("drag-over"); // Highlight on dragover
    });
    dragDropZone.addEventListener("dragleave", () => {
        dragDropZone.classList.remove("drag-over"); // Remove highlight on dragleave
    });
    dragDropZone.addEventListener("drop", (e) => {
        e.preventDefault();
        dragDropZone.classList.remove("drag-over");
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            if (validateZipFile(file)) {
                packageFileInput.files = files; // Assign the file to the input
                dragDropZone.classList.add("file-dropped"); // Visual confirmation
                dragDropZone.innerHTML = `<p>File "${file.name}" is ready for upload.</p>`;
                displayResponse(`File "${file.name}" is ready for upload.`, true);
            }
            else {
                dragDropZone.classList.add("file-error"); // Error styling
                displayResponse("Error: Only .zip files are supported.", false);
            }
        }
    });
    dragDropZone.addEventListener("click", () => packageFileInput.click());
}
// Validate file type for drag-and-drop and input selection
function validateZipFile(file) {
    return file.type === "application/zip" || file.name.endsWith(".zip");
}
// Clear visual confirmation when file input is reset
packageFileInput.addEventListener("change", () => {
    const file = packageFileInput.files?.[0];
    if (file && validateZipFile(file)) {
        dragDropZone.classList.add("file-dropped");
        dragDropZone.innerHTML = `<p>File "${file.name}" is ready for upload.</p>`;
    }
    else {
        dragDropZone.classList.remove("file-dropped", "file-error");
        dragDropZone.innerHTML = `<p>Drag & Drop a file here or click to upload</p>`;
    }
});
// Handle Upload Package Button Click
const updatePackageButton = document.getElementById("updatePackageButton");
updatePackageButton.addEventListener("click", async () => {
    const packageName = document.getElementById("updatePackageName").value.trim();
    const packageURL = document.getElementById("packageURL").value.trim();
    const fileInput = packageFileInput.files;
    if (!packageName) {
        displayResponse("Error: Package name is required.", false);
        return;
    }
    if (!packageURL && (!fileInput || fileInput.length === 0)) {
        displayResponse("Error: Provide either a URL or upload a file.", false);
        return;
    }
    if (packageURL && fileInput && fileInput.length > 0) {
        displayResponse("Error: You cannot upload a file and provide a URL simultaneously.", false);
        return;
    }
    try {
        const formData = { Name: packageName };
        if (packageURL) {
            formData.URL = packageURL;
        }
        else if (fileInput && fileInput.length > 0) {
            const file = fileInput[0];
            if (!validateZipFile(file)) {
                displayResponse("Error: Only .zip files are supported.", false);
                return;
            }
            const reader = new FileReader();
            reader.onload = async () => {
                formData.Content = reader.result?.toString().split(",")[1]; // Base64 content
                await uploadPackage(formData);
            };
            reader.readAsDataURL(file);
            return; // Exit as the FileReader is asynchronous
        }
        await uploadPackage(formData);
    }
    catch (error) {
        if (error instanceof Error) {
            displayResponse(`Network error: ${error.message}`, false);
        }
        else {
            displayResponse("An unexpected error occurred during upload.", false);
        }
    }
});
// Helper Function to Upload the Package
async function uploadPackage(data) {
    try {
        const response = await fetch(`${BASE_URL}/package/${packageID}`, {
            method: "GET",
        });
        if (response.ok) {
            const tempdata = await response.json();
            const packageName = tempdata.metadata.Name;
            const packageId = tempdata.metadata.ID;
            const packageVersion = tempdata.metadata.Version;
            const metadata = {
                Name: packageName,
                ID: packageId,
                Version: packageVersion,
            };
            const newData = { metadata, data };
            try {
                const response = await fetch(`${BASE_URL}/package/${packageID}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(newData),
                });
                if (response.ok) {
                    const responseData = await response.json();
                    displayResponse(`Success: Package uploaded. ID: ${responseData.metadata.ID}`, true);
                }
                else {
                    const errorDetails = await response.json();
                    switch (response.status) {
                        case 400:
                            displayResponse(`Error 400: ${errorDetails.message}`, false);
                            break;
                        case 409:
                            displayResponse(`Error 409: ${errorDetails.message}`, false);
                            break;
                        case 424:
                            displayResponse(`Error 424: ${errorDetails.message}`, false);
                            break;
                        default:
                            displayResponse(`Error ${response.status}: ${errorDetails.message}`, false);
                            break;
                    }
                }
            }
            catch (err) {
                if (err instanceof Error) {
                    displayResponse(`Network error: ${err.message}`, false);
                }
                else {
                    displayResponse("An unexpected error occurred during upload.", false);
                }
            }
        }
        else {
            console.error("Failed to fetch package details:", response.statusText);
            alert("Failed to load package details.");
        }
    }
    catch (err) {
        console.error("Error fetching package details:", err);
        alert("An error occurred while loading the package details.");
    }
}
async function fetchPackageRatings(packageID) {
    try {
        const response = await fetch(`${BASE_URL}/package/${packageID}/rate`);
        if (!response.ok) {
            throw new Error("Failed to fetch ratings");
        }
        const data = await response.json();
        document.getElementById("busFactor").textContent = data.BusFactor.toString();
        document.getElementById("correctness").textContent = data.Correctness.toString();
        document.getElementById("rampUp").textContent = data.RampUp.toString();
        document.getElementById("responsiveMaintainer").textContent = data.ResponsiveMaintainer.toString();
        document.getElementById("licenseScore").textContent = data.LicenseScore.toString();
        document.getElementById("goodPinningPractice").textContent = data.GoodPinningPractice.toString();
        document.getElementById("pullRequest").textContent = data.PullRequest.toString();
        document.getElementById("netScore").textContent = data.NetScore.toString();
    }
    catch (error) {
        console.error("Error fetching ratings:", error);
    }
}
/**
 * Retrieves the package ID from the URL query parameters.
 * @returns The package ID as a string or null if not found.
 */
function getPackageID() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("id");
}
/**
 * Fetches and displays the package details.
 * @param packageID - The ID of the package to fetch.
 */
async function loadPackageDetails(packageID) {
    try {
        const response = await fetch(`${BASE_URL}/package/${packageID}`, {
            method: "GET",
        });
        if (response.ok) {
            const data = await response.json();
            document.getElementById("packageName").textContent = data.metadata.Name || "Unknown";
            document.getElementById("packageId").textContent = data.metadata.ID || "Unknown";
            document.getElementById("packageVersion").textContent = data.metadata.Version || "Unknown";
        }
        else {
            console.error("Failed to fetch package details:", response.statusText);
            alert("Failed to load package details.");
        }
    }
    catch (err) {
        console.error("Error fetching package details:", err);
        alert("An error occurred while loading the package details.");
    }
}
// Main Execution
const packageID = getPackageID();
if (packageID) {
    loadPackageDetails(packageID);
    fetchPackageRatings(packageID);
}
else {
    alert("No package ID provided.");
    window.location.href = "http://ec2-52-200-57-221.compute-1.amazonaws.com/search.html";
}
