// TMTGenerateScript.js
const form = document.getElementById('urlForm');
const generatedUrlEl = document.getElementById('generatedUrl');
const copyBtn = document.getElementById('copyBtn');

// Add event listeners to all form inputs
form.addEventListener('input', generateURL);
form.addEventListener('change', generateURL);

// Initial generation
document.addEventListener('DOMContentLoaded', generateURL);

copyBtn.addEventListener('click', copyToClipboard);

function generateURL() {
    const formData = getFormData();
    const params = buildURLParams(formData);
    const fullUrl = constructFullURL(params);

    displayResult(fullUrl);
}

function getFormData() {
    return {
        // TMT-specific data
        trailLength: document.getElementById('trailLengthInput').value,
        numberRadius: document.getElementById('numberRadiusInput').value,
        symbolType: document.getElementById('symbolTypeSelect').value,
        reverseOrder: document.getElementById('reverseOrderCheck').checked,
        showTimer: document.getElementById('showTimerCheck').checked,

        // TMT advanced settings
        linesUnderDots: document.getElementById('linesUnderDotsCheck').checked,
        allowWrongSelections: document.getElementById('allowWrongSelectionsCheck').checked,
        showWrongSelections: document.getElementById('showWrongSelectionsCheck').checked,
        hidePopupButtons: document.getElementById('hidePopupButtonsCheck').checked,
        hidePopupResults: document.getElementById('hidePopupResultsCheck').checked,
        hidePopupAll: document.getElementById('hidePopupAllCheck').checked,

        // Custom positions
        customPositions: document.getElementById('customPositionsInput').value,

        // Background settings (reusable)
        bgColor: document.getElementById('bgColorInput').value,
        bgImage: document.getElementById('bgImageInput').value,
        isColoringBookImage: document.getElementById('coloringBookImageCheck').checked,
        bgOpacity: document.getElementById('bgOpacityInput').value,
        bgImageSize: document.getElementById('bgImageSizeInput').value,
        bgPosX: document.getElementById('bgPosXInput').value,
        bgPosY: document.getElementById('bgPosYInput').value,

        // Grid settings (reusable)
        gridEnabled: document.getElementById('gridEnabledCheck').checked,
        gridColor: document.getElementById('gridColorInput').value,
        gridOpacity: document.getElementById('gridOpacityInput').value,
        gridStyle: document.getElementById('gridStyleSelect').value,
        gridSize: document.getElementById('gridSizeInput').value
    };
}

function buildURLParams(data) {
    const params = new URLSearchParams();

    // TMT-specific parameters
    if (data.trailLength && data.trailLength !== '10') params.append('trailLength', data.trailLength);
    if (data.numberRadius && data.numberRadius !== '30') params.append('numberRadius', data.numberRadius);
    if (data.symbolType && data.symbolType !== 'numbers') params.append('symbolType', data.symbolType);
    if (data.reverseOrder) params.append('reverseOrder', 'true');
    if (!data.showTimer) params.append('showTimer', 'false');

    // TMT advanced parameters
    if (!data.linesUnderDots) params.append('linesUnderDots', 'false');
    if (data.allowWrongSelections) params.append('allowWrongSelections', 'true');
    if (!data.showWrongSelections) params.append('showWrongSelections', 'false');
    if (data.hidePopupButtons) params.append('hidePopupButtons', 'true');
    if (data.hidePopupResults) params.append('hidePopupResults', 'true');
    if (data.hidePopupAll) params.append('hidePopupAll', 'true');

    // Custom positions
    if (data.customPositions.trim()) {
        try {
            JSON.parse(data.customPositions);
            params.append('customPositions', encodeURIComponent(data.customPositions));
        } catch (error) {
            console.error('Invalid JSON format for custom positions');
        }
    }

    // Background parameters (reusable)
    if (data.bgColor && data.bgColor !== '#ffffff') {
        params.append('bgColor', encodeURIComponent(data.bgColor));
    }

    if (data.bgImage) {
        params.append('bgImage', data.bgImage);
        if (data.bgOpacity && data.bgOpacity !== '50') params.append('bgOpacity', data.bgOpacity);
        if (data.bgImageSize && data.bgImageSize !== '100') params.append('bgImageSize', data.bgImageSize);
        if (data.bgPosX && data.bgPosX !== '50') params.append('bgImagePosX', data.bgPosX);
        if (data.bgPosY && data.bgPosY !== '50') params.append('bgImagePosY', data.bgPosY);
    }

    if (data.isColoringBookImage) {
        params.append('isColoringBookImage', 'true');
    }

    // Grid parameters (reusable)
    if (data.gridEnabled) {
        params.append('gridEnabled', 'true');
        params.append('gridColor', encodeURIComponent(data.gridColor));
        if (data.gridOpacity && data.gridOpacity !== '30') params.append('gridOpacity', data.gridOpacity);
        if (data.gridStyle && data.gridStyle !== 'solid') params.append('gridStyle', data.gridStyle);
        if (data.gridSize && data.gridSize !== '20') params.append('gridSize', data.gridSize);
    }

    return params;
}

function constructFullURL(params) {
    const baseUrl = window.location.origin + window.location.pathname.replace('/generate', '');
    return params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl;
}

function displayResult(url) {
    generatedUrlEl.textContent = url;
}

async function copyToClipboard() {
    const url = generatedUrlEl.textContent || '';
    try {
        await navigator.clipboard.writeText(url);
        copyBtn.textContent = 'Copied!';
        setTimeout(() => {
            copyBtn.textContent = 'Copy URL';
        }, 2000);
    } catch (err) {
        console.error('Failed to copy:', err);
    }
}

// Custom positions functionality
function generateRandomPositions() {
    const trailLength = parseInt(document.getElementById('trailLengthInput').value);
    const positions = [];

    for (let i = 0; i < trailLength; i++) {
        const x = (Math.random() * 90 + 5).toFixed(2);
        const y = (Math.random() * 90 + 5).toFixed(2);
        positions.push({
            x: parseFloat(x),
            y: parseFloat(y)
        });
    }

    document.getElementById('customPositionsInput').value = JSON.stringify(positions, null, 2);
    generateURL();
}

// Add event listener for random positions button
document.getElementById('generateRandomPositionsBtn').addEventListener('click', generateRandomPositions);
