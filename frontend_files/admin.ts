const BASE_URL = "https://os0n6b4nh0.execute-api.us-east-2.amazonaws.com/dev";

// Response Display Helper
function displayResponse(message: string, isSuccess: boolean): void {
    const responseBox = document.getElementById("responseBox") as HTMLDivElement;

    // Reset styles
    responseBox.className = "response-box";

    // Apply success or error style
    if (isSuccess) {
        responseBox.classList.add("success");
    } else {
        responseBox.classList.add("error");
    }

    // Set the message
    responseBox.textContent = message;
}

// Drag-and-Drop Logic
const dragDropZone = document.getElementById("dragDropZone") as HTMLDivElement;
const packageFileInput = document.getElementById("packageFile") as HTMLInputElement;

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

        const files = (e.dataTransfer as DataTransfer).files;

        if (files.length > 0) {
            const file = files[0];
            if (validateZipFile(file)) {
                packageFileInput.files = files; // Assign the file to the input
                dragDropZone.classList.add("file-dropped"); // Visual confirmation
                dragDropZone.innerHTML = `<p>File "${file.name}" is ready for upload.</p>`;
                displayResponse(`File "${file.name}" is ready for upload.`, true);
            } else {
                dragDropZone.classList.add("file-error"); // Error styling
                displayResponse("Error: Only .zip files are supported.", false);
            }
        }
    });

    dragDropZone.addEventListener("click", () => packageFileInput.click());
}

// Validate file type for drag-and-drop and input selection
function validateZipFile(file: File): boolean {
    return file.type === "application/zip" || file.name.endsWith(".zip");
}

// Clear visual confirmation when file input is reset
packageFileInput.addEventListener("change", () => {
    const file = packageFileInput.files?.[0];
    if (file && validateZipFile(file)) {
        dragDropZone.classList.add("file-dropped");
        dragDropZone.innerHTML = `<p>File "${file.name}" is ready for upload.</p>`;
    } else {
        dragDropZone.classList.remove("file-dropped", "file-error");
        dragDropZone.innerHTML = `<p>Drag & Drop a file here or click to upload</p>`;
    }
});


// Handle Upload Package Button Click
document.getElementById("uploadPackageButton")?.addEventListener("click", async () => {
    const packageName = (document.getElementById("packageName") as HTMLInputElement).value.trim();
    const packageURL = (document.getElementById("packageURL") as HTMLInputElement).value.trim();
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
        const formData: Record<string, any> = { Name: packageName };

        if (packageURL) {
            formData.URL = packageURL;
        } else if (fileInput && fileInput.length > 0) {
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
    } catch (error) {
        if (error instanceof Error) {
            displayResponse(`Network error: ${error.message}`, false);
        } else {
            displayResponse("An unexpected error occurred during upload.", false);
        }
    }
});


// Helper Function to Upload the Package
async function uploadPackage(data: Record<string, any>): Promise<void> {
    try {
        const response = await fetch(`${BASE_URL}/package`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });

        if (response.ok) {
            const responseData = await response.json();
            displayResponse(`Success: Package uploaded. ID: ${responseData.metadata.ID}`, true);
        } else {
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
    } catch (err) {
        if (err instanceof Error) {
            displayResponse(`Network error: ${err.message}`, false);
        } else {
            displayResponse("An unexpected error occurred during upload.", false);
        }
    }
}

// Handle Reset Button Click
document.getElementById("confirmResetButton")?.addEventListener("click", async () => {
    try {
        const response = await fetch(`${BASE_URL}/reset`, {
            method: "DELETE",
        });

        if (response.ok) {
            displayResponse("Database successfully reset!", true);
        } else {
            const errorDetails = await response.json();
            displayResponse(`Error ${response.status}: ${errorDetails.message}`, false);
        }
    } catch (err) {
        if (err instanceof Error) {
            displayResponse(`Network error: ${err.message}`, false);
        } else {
            displayResponse("An unexpected error occurred during reset.", false);
        }
    }

    const resetModalElement = document.getElementById("resetModal");
    if (resetModalElement) {
        resetModalElement.classList.remove("show");
        resetModalElement.setAttribute("aria-hidden", "true");
        resetModalElement.removeAttribute("aria-modal");
        resetModalElement.style.display = "none";
        document.body.classList.remove("modal-open");
        const backdrop = document.querySelector(".modal-backdrop");
        if (backdrop) backdrop.remove();
    }
});
