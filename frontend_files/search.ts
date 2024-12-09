const BASE_URL = "https://os0n6b4nh0.execute-api.us-east-2.amazonaws.com/dev";
const resultsContainer = document.getElementById("resultsContainer") as HTMLDivElement;
let currentOffset: string | null = null; // Track the offset for pagination

/**
 * Fetches search results from the API.
 * @param searchName - The search name query string.
 * @param versionQuery - The search version query string.
 * @param offset - The offset for pagination (null for the first page).
 */
async function fetchResults(searchName: string, versionQuery: string, offset: string | null = null): Promise<void> {
    try {
        const bodyPayload = [
            { Name: searchName || "*", Version: versionQuery || "" }
        ];

        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (offset) {
            headers["offset"] = offset; // Include offset header for pagination
        }

        const response = await fetch(`${BASE_URL}/packages`, {
            method: "POST",
            headers,
            body: JSON.stringify(bodyPayload),
        });

        if (response.ok) {
            const data = await response.json();
            const nextOffset = response.headers.get("offset"); // Extract next offset from headers
            currentOffset = nextOffset; // Update the offset for pagination

            if (Array.isArray(data) && data.length > 0) {
                displayResults(data, !!nextOffset); // Pass whether there are more results
            } else {
                resultsContainer.innerHTML = `<p class="text-center text-muted">No results found.</p>`;
            }
        } else {
            const errorText = await response.text();
            resultsContainer.innerHTML = `<p class="text-center text-danger">Error fetching results: ${response.status} - ${errorText}</p>`;
        }
    } catch (error) {
        console.error("Error fetching search results:", error);
        resultsContainer.innerHTML = `<p class="text-center text-danger">An error occurred while fetching results.</p>`;
    }
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
function displayResults(results: Array<{ Name: string; ID: string; Version: string }>, hasMoreResults: boolean): void {
    resultsContainer.innerHTML = "";
    if (results.length === 0) {
        resultsContainer.innerHTML = "<p class='text-center text-muted'>No results found.</p>";
        return;
    }

    const html = results
        .map(
            (result) => `
        <div class="result-card">
            <div class="result-card-content">
                <h5>${result.Name}</h5>
                <p><strong>ID:</strong> ${result.ID}</p>
                <p><strong>Version:</strong> ${result.Version}</p>
            </div>
            <div class="result-card-action">
                <button class="btn btn-primary download-btn" data-id="${result.ID}">Download</button>
                <a href="package_info.html?id=${result.ID}" class="btn btn-info">Info</a>
            </div>
        </div>
    `
        )
        .join("");

    resultsContainer.innerHTML += html;

    if (hasMoreResults) {
        resultsContainer.innerHTML += `
            <div class="text-center mt-4">
                <button class="btn btn-secondary" id="loadMoreButton">Load More</button>
            </div>
        `;

        const loadMoreButton = document.getElementById("loadMoreButton") as HTMLButtonElement;
        loadMoreButton.addEventListener("click", () => {
            fetchResults(getQueriesFromURL().searchName, getQueriesFromURL().version, currentOffset);
        });
    }

    // Attach download event listeners
    const downloadButtons = document.querySelectorAll(".download-btn");
    downloadButtons.forEach((button) => {
        button.addEventListener("click", async (e) => {
            const target = e.target as HTMLButtonElement;
            const packageId = target.getAttribute("data-id");
            if (packageId) {
                await downloadPackage(packageId);
            }
        });
    });
}

/**
 * Downloads a package by ID.
 * @param packageId - The ID of the package to download.
 */
async function downloadPackage(packageId: string): Promise<void> {
    try {
        const response = await fetch(`${BASE_URL}/package/${packageId}`);
        if (!response.ok) {
            throw new Error(`Failed to download package: ${response.statusText}`);
        }

        // Convert response to blob
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);

        // Create a temporary anchor element to trigger the download
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = `${packageId}.zip`; // Change extension based on expected content type
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // Revoke the object URL after download
        window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
        console.error("Error downloading package:", error);
        alert("An error occurred while downloading the package.");
    }
}




/**
 * Retrieves the query parameters from the URL.
 * @returns An object with searchName and version query strings.
 */
function getQueriesFromURL(): { searchName: string; version: string } {
    const urlParams = new URLSearchParams(window.location.search);
    const searchName = urlParams.get("name") || "*"; // Default to match all names
    const versionQuery = urlParams.get("version") || ""; // Default to all versions
    return { searchName, version: versionQuery };
}

// Main execution
const { searchName, version } = getQueriesFromURL();
fetchResults(searchName, version);
