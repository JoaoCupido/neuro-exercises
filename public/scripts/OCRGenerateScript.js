const form = document.getElementById('urlForm');
const generatedUrlEl = document.getElementById('generatedUrl');
const copyBtn = document.getElementById('copyBtn');
const hideToolbarCheck = document.getElementById('hideToolbarCheck');
const toolbarSettings = document.getElementById('toolbarSettings');

// Import functionality
document.getElementById('importBtn').addEventListener('click', importFromURL);
document.getElementById('importParamBtn').addEventListener('click', importFromParams);

// Toggle toolbar settings visibility
hideToolbarCheck.addEventListener('change', (e) => {
    toolbarSettings.style.display = e.target.checked ? 'none' : 'block';
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
        pencilColor: document.getElementById('pencilColorInput').value,
        pencilSize: document.getElementById('pencilSizeInput').value,
        correctAnswers: document.getElementById('correctAnswersInput').value.trim(),
        ocrLanguage: document.getElementById('ocrLanguageSelect').value,
        confidenceThreshold: document.getElementById('confidenceThresholdInput').value,

        clearButtonPosition: document.getElementById('clearButtonPositionSelect').value,
        hideResultsPopup: document.getElementById('hideResultsPopupCheck').checked,
        hidePopupButtons: document.getElementById('hidePopupButtonsCheck').checked,
        hideToolbar: document.getElementById('hideToolbarCheck').checked,

        toolbarPosition: document.getElementById('toolbarPositionSelect').value,
        toolbarSize: document.getElementById('toolbarSizeSelect').value,

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
        gridSize: document.getElementById('gridSizeInput').value
    };
}

function buildURLParams(data) {
    const params = new URLSearchParams();

    // OCR Parameters
    if (data.pencilColor && data.pencilColor !== '#000000') {
        params.append('pencilColor', encodeURIComponent(data.pencilColor));
    }

    if (data.pencilSize && data.pencilSize !== '5') {
        params.append('pencilSize', data.pencilSize);
    }

    if (data.correctAnswers) {
        try {
            // Try to parse as JSON, otherwise treat as comma-separated
            JSON.parse(data.correctAnswers);
            params.append('correctAnswersList', data.correctAnswers);
        } catch {
            // Convert comma-separated to array format
            const answers = data.correctAnswers.split(',').map(a => `"${a.trim()}"`);
            params.append('correctAnswersList', `[${answers.join(',')}]`);
        }
    }

    if (data.ocrLanguage && data.ocrLanguage !== 'eng') {
        params.append('ocrLanguage', data.ocrLanguage);
    }

    if (data.confidenceThreshold && data.confidenceThreshold !== '0.5') {
        params.append('confidenceThreshold', data.confidenceThreshold);
    }

    // Interface Parameters
    if (data.clearButtonPosition && data.clearButtonPosition !== 'top-right') {
        params.append('clearButtonPosition', data.clearButtonPosition);
    }

    if (data.hideResultsPopup) {
        params.append('hideResultsPopup', 'true');
    }

    if (data.hidePopupButtons) {
        params.append('hidePopupButtons', 'true');
    }

    if (data.hideToolbar) {
        params.append('hideToolbar', 'true');
    }

    // Toolbar settings (only include if not hiding toolbar)
    if (!data.hideToolbar) {
        if (data.toolbarPosition && data.toolbarPosition !== 'up') {
            params.append('toolbarPosition', data.toolbarPosition);
        }

        if (data.toolbarSize && data.toolbarSize !== 'medium') {
            params.append('toolbarSize', data.toolbarSize);
        }
    }

    // Background parameters
    if (data.bgColor && data.bgColor !== '#ffffff') {
        params.append('bgColor', encodeURIComponent(data.bgColor));
    }

    if (data.bgOpacity && data.bgOpacity !== '100') {
        params.append('bgOpacity', data.bgOpacity);
    }

    if (data.bgImage) {
        params.append('bgImage', data.bgImage);

        if (data.bgImageSize && data.bgImageSize !== '100') {
            params.append('bgImageSize', data.bgImageSize);
        }

        if (data.bgPosX && data.bgPosX !== '50') {
            params.append('bgImagePosX', data.bgPosX);
        }

        if (data.bgPosY && data.bgPosY !== '50') {
            params.append('bgImagePosY', data.bgPosY);
        }
    }

    if (data.isColoringBookImage) {
        params.append('isColoringBookImage', 'true');
    }

    // Grid parameters
    if (data.gridEnabled) {
        params.append('gridEnabled', 'true');
        params.append('gridColor', encodeURIComponent(data.gridColor));

        if (data.gridOpacity && data.gridOpacity !== '30') {
            params.append('gridOpacity', data.gridOpacity);
        }

        if (data.gridStyle && data.gridStyle !== 'solid') {
            params.append('gridStyle', data.gridStyle);
        }

        if (data.gridSize && data.gridSize !== '20') {
            params.append('gridSize', data.gridSize);
        }
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
        const url = new URL(urlInput);
        const params = url.searchParams;
        applyParameters(params);
        generateURL();
        document.getElementById('importUrlInput').value = '';
        document.getElementById('resultSection').scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        alert('Invalid URL format.');
        console.error('URL import error:', error);
    }
}

function importFromParams() {
    const paramInput = document.getElementById('importParamInput').value.trim();
    if (!paramInput) return;

    try {
        const params = new URLSearchParams(paramInput);
        applyParameters(params);
        generateURL();
        document.getElementById('importParamInput').value = '';
        document.getElementById('resultSection').scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        alert('Invalid parameter format.');
        console.error('Parameter import error:', error);
    }
}

function applyParameters(params) {
    const decodeValue = (value) => {
        try {
            return decodeURIComponent(value);
        } catch {
            return value;
        }
    };

    // Helper functions
    const setInput = (id, paramValue) => {
        const input = document.getElementById(id);
        if (input && paramValue !== null) {
            input.value = paramValue;
        }
    };

    const setSelect = (id, paramValue) => {
        const select = document.getElementById(id);
        if (select && paramValue !== null) {
            select.value = paramValue;
        }
    };

    const setCheckbox = (id, paramValue) => {
        const checkbox = document.getElementById(id);
        if (checkbox) {
            checkbox.checked = paramValue === 'true';
        }
    };

    // OCR Parameters
    const pencilColor = params.get('pencilColor');
    if (pencilColor) {
        setInput('pencilColorInput', decodeValue(pencilColor));
    }

    setInput('pencilSizeInput', params.get('pencilSize'));

    const correctAnswers = params.get('correctAnswersList');
    if (correctAnswers) {
        setInput('correctAnswersInput', correctAnswers);
    }

    setSelect('ocrLanguageSelect', params.get('ocrLanguage'));
    setInput('confidenceThresholdInput', params.get('confidenceThreshold'));

    // Interface Parameters
    setSelect('clearButtonPositionSelect', params.get('clearButtonPosition'));
    setCheckbox('hideResultsPopupCheck', params.get('hideResultsPopup'));
    setCheckbox('hidePopupButtonsCheck', params.get('hidePopupButtons'));

    const hideToolbar = params.get('hideToolbar');
    if (hideToolbar === 'true') {
        setCheckbox('hideToolbarCheck', true);
        toolbarSettings.style.display = 'none';
    }

    // Toolbar settings
    if (hideToolbar !== 'true') {
        setSelect('toolbarPositionSelect', params.get('toolbarPosition'));
        const toolbarSize = params.get('toolbarSize');
        if (toolbarSize) {
            setSelect('toolbarSizeSelect', toolbarSize);
        }
    }

    // Background parameters
    const bgColor = params.get('bgColor');
    if (bgColor) {
        setInput('bgColorInput', decodeValue(bgColor));
    }

    const bgImage = params.get('bgImage');
    if (bgImage) {
        setInput('bgImageInput', bgImage);
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
        setInput('gridColorInput', decodeValue(gridColor));
    }

    setInput('gridOpacityInput', params.get('gridOpacity'));
    setSelect('gridStyleSelect', params.get('gridStyle'));
    setInput('gridSizeInput', params.get('gridSize'));
}

// Optional: Auto-detect parameters in current page
document.addEventListener('DOMContentLoaded', () => {
    const currentParams = new URLSearchParams(window.location.search);
    if (currentParams.toString()) {
        if (confirm('Found parameters in URL. Import them?')) {
            applyParameters(currentParams);
            generateURL();
        }
    }
});