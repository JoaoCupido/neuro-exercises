// CameraGenerateScript.js

const form = document.getElementById("urlForm");
const generatedUrlEl = document.getElementById("generatedUrl");
const copyBtn = document.getElementById("copyBtn");

// Listen to all form changes
form.addEventListener("input", generateURL);
form.addEventListener("change", generateURL);
document.addEventListener("DOMContentLoaded", generateURL);
copyBtn.addEventListener('click', copyToClipboard);

function generateURL() {
    const gamemode = document.getElementById("gamemodeSelect").value;
    const sensitivity = document.getElementById("sensitivityInput").value;
    const cameraFacing = document.getElementById("cameraFacingSelect").value;

    // NEW FIELDS
    const displayHorizontal = document.getElementById("displayHorizontalSelect")?.value;
    const displayVertical = document.getElementById("displayVerticalSelect")?.value;
    const maxDisplayItems = document.getElementById("maxDisplayItemsInput")?.value;

    const params = new URLSearchParams();

    // Gamemode
    if (gamemode) params.append("gamemode", gamemode);

    if (sensitivity) params.append("sensitivity", sensitivity);
    if (cameraFacing) params.append("cameraFacing", cameraFacing);

    if (displayHorizontal) params.append("displayHorizontal", displayHorizontal);
    if (displayVertical) params.append("displayVertical", displayVertical);
    if (maxDisplayItems) params.append("maxDisplayItems", maxDisplayItems);

    // Build final URL
    const baseUrl = window.location.origin + window.location.pathname.replace("/generate", "/");
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
