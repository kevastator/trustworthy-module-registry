const BASE_URL = "https://os0n6b4nh0.execute-api.us-east-2.amazonaws.com/dev";

/**
 * Retrieves the package ID from the URL query parameters.
 * @returns The package ID as a string or null if not found.
 */
function getPackageID(): string | null {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("id");
}

/**
 * Fetches and displays the package details.
 * @param packageID - The ID of the package to fetch.
 */
async function loadPackageDetails(packageID: string): Promise<void> {
    try {
        const response = await fetch(`${BASE_URL}/package/${packageID}`, {
            method: "GET",
        });
        if (response.ok) {
            const data = await response.json();
            console.log("Package details:", data.metadata);
            console.log("Package details:", data.metadata.Name);
            console.log("Package details:", data.metadata.ID);
            console.log("Package details:", data.metadata.Version);
            (document.getElementById("packageName") as HTMLSpanElement).textContent = data.metadata.Name || "Unknown";
            (document.getElementById("packageId") as HTMLSpanElement).textContent = data.metadata.ID || "Unknown";
            (document.getElementById("packageVersion") as HTMLSpanElement).textContent = data.metadata.Version || "Unknown";
        } else {
            console.error("Failed to fetch package details:", response.statusText);
            alert("Failed to load package details.");
        }
    } catch (err) {
        console.error("Error fetching package details:", err);
        alert("An error occurred while loading the package details.");
    }
}

/**
 * Deletes the package with the given ID.
 * @param packageID - The ID of the package to delete.
 */
async function deletePackage(packageID: string): Promise<void> {
    try {
        const response = await fetch(`${BASE_URL}/package/${packageID}`, {
            method: "DELETE",
        });

        if (response.ok) {
            alert("Package successfully deleted.");
            window.location.href = "http://ec2-52-200-57-221.compute-1.amazonaws.com/search.html";
        } else {
            const errorDetails = await response.json();
            alert(`Error ${response.status}: ${errorDetails.message}`);
        }
    } catch (err) {
        console.error("Error deleting package:", err);
        alert("An error occurred while deleting the package.");
    }
}

// Main Execution
const packageID = getPackageID();
if (packageID) {
    loadPackageDetails(packageID);

    const confirmDeleteButton = document.getElementById("confirmDeleteButton") as HTMLButtonElement;
    if (confirmDeleteButton) {
        confirmDeleteButton.addEventListener("click", () => {
            deletePackage(packageID);
        });
    } else {
        console.error("Confirm delete button not found.");
    }
} else {
    alert("No package ID provided.");
    window.location.href = "http://ec2-52-200-57-221.compute-1.amazonaws.com/search.html";
}
