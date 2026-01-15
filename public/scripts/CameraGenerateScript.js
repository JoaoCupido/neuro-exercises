// CameraGenerateScript.js

const form = document.getElementById("urlForm");
const generatedUrlEl = document.getElementById("generatedUrl");
const copyBtn = document.getElementById("copyBtn");

// Import functionality
document.getElementById('importBtn').addEventListener('click', importFromURL);
document.getElementById('importParamBtn').addEventListener('click', importFromParams);

// Listen to all form changes
form.addEventListener("input", generateURL);
form.addEventListener("change", generateURL);
document.addEventListener("DOMContentLoaded", generateURL);
copyBtn.addEventListener('click', copyToClipboard);

function generateURL() {
    const gamemode = document.getElementById("gamemodeSelect").value;
    const sensitivity = document.getElementById("sensitivityInput").value;
    const cameraFacing = document.getElementById("cameraFacingSelect").value;
    const cameraOpacity = document.getElementById("cameraOpacityInput").value;

    const displayHorizontal = document.getElementById("displayHorizontalSelect")?.value;
    const displayVertical = document.getElementById("displayVerticalSelect")?.value;
    const maxDisplayItems = document.getElementById("maxDisplayItemsInput")?.value;

    const params = new URLSearchParams();

    // Gamemode
    if (gamemode && gamemode !== "detectObject") params.append("gamemode", gamemode);

    if (sensitivity && sensitivity !== "0.6") params.append("sensitivity", sensitivity);
    if (cameraFacing && cameraFacing !== "user") params.append("cameraFacing", cameraFacing);
    if (cameraOpacity && cameraOpacity !== "1.0") params.append("cameraOpacity", cameraOpacity);

    if (displayHorizontal && displayHorizontal !== "right") params.append("displayHorizontal", displayHorizontal);
    if (displayVertical && displayVertical !== "top") params.append("displayVertical", displayVertical);
    if (maxDisplayItems && maxDisplayItems !== "5") params.append("maxDisplayItems", maxDisplayItems);

    // Build final URL
    const baseUrl = window.location.origin + window.location.pathname.replace("/generate", "");
    const fullUrl = params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl;

    generatedUrlEl.textContent = fullUrl;
}

async function copyToClipboard() {
    const url = generatedUrlEl.textContent || "";
    try {
        await navigator.clipboard.writeText(url);
        copyBtn.textContent = "Copied!";
        setTimeout(() => (copyBtn.textContent = "Copy URL"), 2000);
    } catch (err) {
        console.error("Failed to copy:", err);
    }
}

function importFromURL() {
    const urlInput = document.getElementById('importUrlInput').value.trim();
    if (!urlInput) return;

    try {
        // Extract query parameters from URL
        const url = new URL(urlInput);
        const params = url.searchParams;

        // Apply parameters to form
        applyParameters(params);

        // Update the generated URL display
        generateURL();

        // Clear the input
        document.getElementById('importUrlInput').value = '';

        // Scroll to top of results
        document.getElementById('resultSection').scrollIntoView({ behavior: 'smooth' });

    } catch (error) {
        alert('Invalid URL format. Please enter a valid URL.');
        console.error('URL import error:', error);
    }
}

function importFromParams() {
    const paramInput = document.getElementById('importParamInput').value.trim();
    if (!paramInput) return;

    try {
        // Create URLSearchParams from the input string
        const params = new URLSearchParams(paramInput);

        // Apply parameters to form
        applyParameters(params);

        // Update the generated URL display
        generateURL();

        // Clear the input
        document.getElementById('importParamInput').value = '';

        // Scroll to top of results
        document.getElementById('resultSection').scrollIntoView({ behavior: 'smooth' });

    } catch (error) {
        alert('Invalid parameter format. Please check your input.');
        console.error('Parameter import error:', error);
    }
}

function applyParameters(params) {
    // Helper function to set select value
    const setSelect = (id, paramValue) => {
        const select = document.getElementById(id);
        if (select && paramValue !== null) {
            select.value = paramValue;
        }
    };

    // Helper function to set input value
    const setInput = (id, paramValue) => {
        const input = document.getElementById(id);
        if (input && paramValue !== null) {
            input.value = paramValue;
        }
    };

    // Camera-specific parameters
    setSelect('gamemodeSelect', params.get('gamemode'));
    setInput('sensitivityInput', params.get('sensitivity'));
    setSelect('cameraFacingSelect', params.get('cameraFacing'));
    setInput('cameraOpacityInput', params.get('cameraOpacity'));

    // Display parameters
    setSelect('displayHorizontalSelect', params.get('displayHorizontal'));
    setSelect('displayVerticalSelect', params.get('displayVertical'));
    setInput('maxDisplayItemsInput', params.get('maxDisplayItems'));
}

// Optional: Add auto-detection for URL in current page
document.addEventListener('DOMContentLoaded', () => {
    // Check if there are parameters in the current URL that we should import
    const currentParams = new URLSearchParams(window.location.search);
    if (currentParams.toString()) {
        // Ask user if they want to import from current URL
        if (confirm('Found parameters in URL. Would you like to import them?')) {
            applyParameters(currentParams);
            generateURL();
        }
    }
});