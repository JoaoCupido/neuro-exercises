const form = document.getElementById('urlForm');
const generatedUrlEl = document.getElementById('generatedUrl');
const copyBtn = document.getElementById('copyBtn');
const customColorsInput = document.getElementById('customColors');
const colorModeRadios = document.querySelectorAll('input[name="colorMode"]');
const hideToolbarCheck = document.getElementById('hideToolbarCheck');
const toolbarPositionGroup = document.getElementById('toolbarPositionGroup');

// Import functionality
document.getElementById('importBtn').addEventListener('click', importFromURL);
document.getElementById('importParamBtn').addEventListener('click', importFromParams);

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

    if (data.bgOpacity && data.bgOpacity !== '100') params.append('bgOpacity', data.bgOpacity);

    if (data.bgImage) {
        params.append('bgImage', data.bgImage);
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
    // Helper function to decode URL-encoded values
    const decodeValue = (value) => {
        try {
            return decodeURIComponent(value);
        } catch {
            return value;
        }
    };

    // Helper function to set checkbox based on string value
    const setCheckbox = (id, paramValue) => {
        const checkbox = document.getElementById(id);
        if (checkbox) {
            checkbox.checked = paramValue === 'true';
        }
    };

    // Helper function to set input value
    const setInput = (id, paramValue) => {
        const input = document.getElementById(id);
        if (input && paramValue !== null) {
            input.value = paramValue;
        }
    };

    // Helper function to set select value
    const setSelect = (id, paramValue) => {
        const select = document.getElementById(id);
        if (select && paramValue !== null) {
            select.value = paramValue;
        }
    };

    // Helper function to set radio button
    const setRadio = (name, value) => {
        const radio = document.querySelector(`input[name="${name}"][value="${value}"]`);
        if (radio) {
            radio.checked = true;
        }
    };

    // Drawing-specific parameters
    setInput('sizeInput', params.get('brushSize'));

    // Handle colors parameter
    const colors = params.get('colors');
    if (colors) {
        if (colors === '*') {
            setRadio('colorMode', 'all');
            customColorsInput.disabled = true;
        } else {
            setRadio('colorMode', 'custom');
            customColorsInput.disabled = false;
            customColorsInput.value = colors;
        }
    }

    // Toolbar settings
    setCheckbox('hideToolbarCheck', params.get('hideToolbar'));
    setSelect('toolbarPositionSelect', params.get('toolbarPosition'));

    // Background parameters
    const bgColor = params.get('bgColor');
    if (bgColor) {
        document.getElementById('bgColorInput').value = decodeValue(bgColor);
    }

    const bgImage = params.get('bgImage');
    if (bgImage) {
        document.getElementById('bgImageInput').value = bgImage;
    }

    setCheckbox('coloringBookImageCheck', params.get('isColoringBookImage'));
    setInput('bgOpacityInput', params.get('bgOpacity'));
    setInput('bgImageSizeInput', params.get('bgImageSize'));
    setInput('bgPosXInput', params.get('bgImagePosX'));
    setInput('bgPosYInput', params.get('bgImagePosY'));

    // Grid parameters
    setCheckbox('gridEnabledCheck', params.get('gridEnabled'));

    const gridColor = params.get('gridColor');
    if (gridColor) {
        document.getElementById('gridColorInput').value = decodeValue(gridColor);
    }

    setInput('gridOpacityInput', params.get('gridOpacity'));
    setSelect('gridStyleSelect', params.get('gridStyle'));
    setInput('gridSizeInput', params.get('gridSize'));

    // Show inputs (JSON object)
    const showInputsParam = params.get('showInputs');
    if (showInputsParam) {
        try {
            const showInputs = JSON.parse(showInputsParam);

            // Set each checkbox individually
            setCheckbox('eraserInputCheck', showInputs.eraserInput?.toString());
            setCheckbox('cursorSizeInputCheck', showInputs.cursorSizeInput?.toString());
            setCheckbox('undoRedoInputCheck', showInputs.enableUndoRedoInput?.toString());
            setCheckbox('backgroundInputsCheck', showInputs.backgroundInputs?.toString());
            setCheckbox('gridInputsCheck', showInputs.gridInputs?.toString());
        } catch (error) {
            console.warn('Invalid showInputs JSON:', error);
        }
    }

    // Update toolbar position visibility based on hideToolbar
    const hideToolbar = params.get('hideToolbar');
    if (hideToolbar === 'true') {
        toolbarPositionGroup.style.display = 'none';
    } else {
        toolbarPositionGroup.style.display = 'block';
    }
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