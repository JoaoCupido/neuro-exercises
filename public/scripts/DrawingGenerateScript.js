const form = document.getElementById('urlForm');
const generatedUrlEl = document.getElementById('generatedUrl');
const copyBtn = document.getElementById('copyBtn');
const customColorsInput = document.getElementById('customColors');
const colorModeRadios = document.querySelectorAll('input[name="colorMode"]');
const hideToolbarCheck = document.getElementById('hideToolbarCheck');
const toolbarPositionGroup = document.getElementById('toolbarPositionGroup');

// Enable/disable custom colors input
colorModeRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
        customColorsInput.disabled = e.target.value === 'all';
        generateURL();
    });
});

// Toggle toolbar position visibility
hideToolbarCheck.addEventListener('change', (e) => {
    toolbarPositionGroup.style.display = e.target.checked ? 'none' : 'block';
    generateURL();
});

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
        size: document.getElementById('sizeInput').value,
        colorMode: document.querySelector('input[name="colorMode"]:checked').value,
        customColors: customColorsInput.value,
        toolbarPosition: document.getElementById('toolbarPositionSelect').value,
        hideToolbar: document.getElementById('hideToolbarCheck').checked,

        bgColor: document.getElementById('bgColorInput').value,
        bgImage: document.getElementById('bgImageInput').value,
        isColoringBookImage: document.getElementById('coloringBookImageCheck').checked,
        bgOpacity: document.getElementById('bgOpacityInput').value,
        bgImageSize: document.getElementById('bgImageSizeInput').value,
        bgPosX: document.getElementById('bgPosXInput').value,
        bgPosY: document.getElementById('bgPosYInput').value,

        gridEnabled: document.getElementById('gridEnabledCheck').checked,
        gridColor: document.getElementById('gridColorInput').value,
        gridOpacity: document.getElementById('gridOpacityInput').value,
        gridStyle: document.getElementById('gridStyleSelect').value,
        gridSize: document.getElementById('gridSizeInput').value,
        showInputs: {
            eraserInput: document.getElementById('eraserInputCheck').checked,
            cursorSizeInput: document.getElementById('cursorSizeInputCheck').checked,
            enableUndoRedoInput: document.getElementById('undoRedoInputCheck').checked,
            backgroundInputs: document.getElementById('backgroundInputsCheck').checked,
            gridInputs: document.getElementById('gridInputsCheck').checked
        }
    };
}

function buildURLParams(data) {
    const params = new URLSearchParams();

    if (data.size && data.size !== '5') params.append('brushSize', data.size);
    if (data.colorMode === 'all') params.append('colors', '*');
    else if (data.customColors) params.append('colors', data.customColors);

    // Toolbar position (only include if not default 'up' AND not hiding toolbar)
    if (!data.hideToolbar && data.toolbarPosition && data.toolbarPosition !== 'up') {
        params.append('toolbarPosition', data.toolbarPosition);
    }

    // Hide toolbar parameter
    if (data.hideToolbar) {
        params.append('hideToolbar', 'true');
    }

    // Background color (always include if not default white)
    if (data.bgColor && data.bgColor !== '#ffffff') {
        params.append('bgColor', encodeURIComponent(data.bgColor));
    }

    if (data.bgImage) {
        params.append('bgImage', data.bgImage);
        if (data.bgOpacity && data.bgOpacity !== '50') params.append('bgOpacity', data.bgOpacity);
        if (data.bgImageSize && data.bgImageSize !== '100') params.append('bgImageSize', data.bgImageSize);

        // Add position parameters if not default (50%)
        if (data.bgPosX && data.bgPosX !== '50') params.append('bgImagePosX', data.bgPosX);
        if (data.bgPosY && data.bgPosY !== '50') params.append('bgImagePosY', data.bgPosY);
    }

    if (data.isColoringBookImage) {
        params.append('isColoringBookImage', 'true');
    }

    if (data.gridEnabled) {
        params.append('gridEnabled', 'true');
        params.append('gridColor', encodeURIComponent(data.gridColor));
        if (data.gridOpacity && data.gridOpacity !== '30') params.append('gridOpacity', data.gridOpacity);
        if (data.gridStyle && data.gridStyle !== 'solid') params.append('gridStyle', data.gridStyle);
        if (data.gridSize && data.gridSize !== '20') params.append('gridSize', data.gridSize);
    }

    // Add showInputs as JSON if not all true
    const defaultShowInputs = {
        eraserInput: true,
        cursorSizeInput: true,
        enableUndoRedoInput: true,
        backgroundInputs: true,
        gridInputs: true
    };

    if (JSON.stringify(data.showInputs) !== JSON.stringify(defaultShowInputs)) {
        params.append('showInputs', JSON.stringify(data.showInputs));
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