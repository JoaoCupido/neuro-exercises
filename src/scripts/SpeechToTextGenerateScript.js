const form = document.getElementById('urlForm');
const generatedUrlEl = document.getElementById('generatedUrl');
const copyBtn = document.getElementById('copyBtn');
const openBtn = document.getElementById('openBtn');

const customColorsInput = document.getElementById('customColors');
const colorModeRadios = document.querySelectorAll('input[name="colorMode"]');
const hideToolbarCheck = document.getElementById('hideToolbarCheck');
const toolbarPositionGroup = document.getElementById('toolbarPositionGroup');

// Import functionality, if these elements exist
document.getElementById('importBtn')?.addEventListener('click', importFromURL);
document.getElementById('importParamBtn')?.addEventListener('click', importFromParams);

// Enable/disable custom colors
colorModeRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
        if (customColorsInput) {
            customColorsInput.disabled = e.target.value === 'all';
        }
        generateURL();
    });
});

// Toggle toolbar position visibility
hideToolbarCheck?.addEventListener('change', (e) => {
    if (toolbarPositionGroup) {
        toolbarPositionGroup.style.display = e.target.checked ? 'none' : 'block';
    }
    generateURL();
});

// Generate URL whenever any form field changes
form.addEventListener('input', generateURL);
form.addEventListener('change', generateURL);

document.addEventListener('DOMContentLoaded', () => {
    generateURL();
});

copyBtn.addEventListener('click', copyToClipboard);

openBtn?.addEventListener('click', () => {
    const url = generatedUrlEl.textContent.trim();
    if (url) {
        window.open(url, '_blank');
    }
});

/* =========================================================
   GET FORM DATA
   ========================================================= */

function getFormData() {
    const modelLangCombined =
        document.getElementById('modelLanguageSelect')?.value || 'web-speech|en-US';
    const [model, language] = modelLangCombined.split('|');

    return {
        speechModel: model,
        speechLanguage: language,

        correctAnswers:
            document.getElementById('correctAnswersInput')?.value.trim() || '',

        micButtonPosition:
            document.getElementById('micPositionSelect')?.value || 'bottom-center',

        clearButtonPosition:
            document.getElementById('clearPositionSelect')?.value || 'bottom-right',

        continuous:
            document.getElementById('continuousCheck')?.checked ?? true,

        autoStart:
            document.getElementById('autoStartCheck')?.checked ?? false,

        hideLiveTranscript:
            document.getElementById('hideLiveTranscriptCheck')?.checked ?? false,

        hideResultsPopup:
            document.getElementById('hideResultsPopupCheck')?.checked ?? false,

        // Drawing / toolbar
        size:
            document.getElementById('sizeInput')?.value || '5',

        colorMode:
            document.querySelector('input[name="colorMode"]:checked')?.value || 'all',

        customColors:
            customColorsInput?.value || '',

        toolbarPosition:
            document.getElementById('toolbarPositionSelect')?.value || 'up',

        hideToolbar:
            document.getElementById('hideToolbarCheck')?.checked ?? false,

        toolbarSize:
            document.getElementById('toolbarSizeSelect')?.value || 'default',

        // Background
        bgColor:
            document.getElementById('bgColorInput')?.value || '#ffffff',

        bgImage:
            document.getElementById('bgImageInput')?.value || '',

        isColoringBookImage:
            document.getElementById('coloringBookImageCheck')?.checked ?? false,

        bgOpacity:
            document.getElementById('bgOpacityInput')?.value || '100',

        bgImageSize:
            document.getElementById('bgImageSizeInput')?.value || '100',

        bgPosX:
            document.getElementById('bgPosXInput')?.value || '50',

        bgPosY:
            document.getElementById('bgPosYInput')?.value || '50',

        // Grid
        gridEnabled:
            document.getElementById('gridEnabledCheck')?.checked ?? false,

        gridColor:
            document.getElementById('gridColorInput')?.value || '#000000',

        gridOpacity:
            document.getElementById('gridOpacityInput')?.value || '30',

        gridStyle:
            document.getElementById('gridStyleSelect')?.value || 'solid',

        gridSize:
            document.getElementById('gridSizeInput')?.value || '20',

        showInputs: {
            eraserInput:
                document.getElementById('eraserInputCheck')?.checked ?? true,

            cursorSizeInput:
                document.getElementById('cursorSizeInputCheck')?.checked ?? true,

            enableUndoRedoInput:
                document.getElementById('undoRedoInputCheck')?.checked ?? true,

            backgroundInputs:
                document.getElementById('backgroundInputsCheck')?.checked ?? true,

            gridInputs:
                document.getElementById('gridInputsCheck')?.checked ?? true,

            bucketInput:
                document.getElementById('bucketInputCheck')?.checked ?? true
        }
    };
}

/* =========================================================
   BUILD URL PARAMETERS
   ========================================================= */

function buildURLParams(data) {
    const params = new URLSearchParams();

    // Model and Language
    if (data.speechModel && data.speechModel !== 'web-speech') {
        params.append('speechModel', data.speechModel);
    }

    if (data.speechLanguage && data.speechLanguage !== 'en-US') {
        params.append('speechLanguage', data.speechLanguage);
    }

    // Correct answers
    if (data.correctAnswers) {
        const list = data.correctAnswers
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);

        if (list.length > 0) {
            params.append('correctAnswers', JSON.stringify(list));
        }
    }

    // Mic / clear positions
    if (data.micButtonPosition && data.micButtonPosition !== 'bottom-center') {
        params.append('micButtonPosition', data.micButtonPosition);
    }

    if (data.clearButtonPosition && data.clearButtonPosition !== 'bottom-right') {
        params.append('clearButtonPosition', data.clearButtonPosition);
    }

    // Speech behavior
    if (!data.continuous) {
        params.append('continuous', 'false');
    }

    if (data.autoStart) {
        params.append('autoStart', 'true');
    }

    if (data.hideLiveTranscript) {
        params.append('hideLiveTranscript', 'true');
    }

    if (data.hideResultsPopup) {
        params.append('hideResultsPopup', 'true');
    }

    // Brush
    if (data.size && data.size !== '5') {
        params.append('brushSize', data.size);
    }

    // Colors
    if (data.colorMode === 'all') {
        params.append('colors', '*');
    } else if (data.customColors) {
        params.append('colors', data.customColors);
    }

    // Toolbar
    if (data.toolbarSize && data.toolbarSize !== 'default') {
        params.append('toolbarSize', data.toolbarSize);
    }

    if (!data.hideToolbar && data.toolbarPosition && data.toolbarPosition !== 'up') {
        params.append('toolbarPosition', data.toolbarPosition);
    }

    if (data.hideToolbar) {
        params.append('hideToolbar', 'true');
    }

    // Background color
    if (data.bgColor && data.bgColor.toLowerCase() !== '#ffffff') {
        params.append('bgColor', data.bgColor);
    }

    if (data.bgOpacity && data.bgOpacity !== '100') {
        params.append('bgOpacity', data.bgOpacity);
    }

    // Background image
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

    // Grid
    if (data.gridEnabled) {
        params.append('gridEnabled', 'true');
        params.append('gridColor', data.gridColor);

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

    // Visible inputs
    const defaultShowInputs = {
        eraserInput: true,
        cursorSizeInput: true,
        enableUndoRedoInput: true,
        backgroundInputs: true,
        gridInputs: true,
        bucketInput: true
    };

    if (JSON.stringify(data.showInputs) !== JSON.stringify(defaultShowInputs)) {
        params.append('showInputs', JSON.stringify(data.showInputs));
    }

    return params;
}

function constructFullURL(params) {
    const baseUrl =
        window.location.origin +
        window.location.pathname.replace('/generate', '');

    return params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl;
}

function generateURL() {
    const formData = getFormData();
    const params = buildURLParams(formData);
    const fullUrl = constructFullURL(params);
    generatedUrlEl.textContent = fullUrl;
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
    const input = document.getElementById('importUrlInput');
    if (!input) return;

    const urlInput = input.value.trim();
    if (!urlInput) return;

    try {
        const url = new URL(urlInput);
        applyParameters(url.searchParams);
        generateURL();
        input.value = '';
        document.getElementById('resultSection')?.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        alert('Invalid URL format. Please enter a valid URL.');
        console.error('URL import error:', error);
    }
}

function importFromParams() {
    const input = document.getElementById('importParamInput');
    if (!input) return;

    const paramInput = input.value.trim();
    if (!paramInput) return;

    try {
        const params = new URLSearchParams(paramInput);
        applyParameters(params);
        generateURL();
        input.value = '';
        document.getElementById('resultSection')?.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        alert('Invalid parameter format. Please check your input.');
        console.error('Parameter import error:', error);
    }
}

function applyParameters(params) {
    const setCheckbox = (id, value) => {
        const element = document.getElementById(id);
        if (element && value !== null) {
            element.checked = value === 'true';
        }
    };

    const setInput = (id, value) => {
        const element = document.getElementById(id);
        if (element && value !== null) {
            element.value = value;
        }
    };

    const setSelect = (id, value) => {
        const element = document.getElementById(id);
        if (element && value !== null) {
            element.value = value;
        }
    };

    const setRadio = (name, value) => {
        const radio = document.querySelector(`input[name="${name}"][value="${value}"]`);
        if (radio) {
            radio.checked = true;
        }
    };

    // Speech Model & Language combined select
    const speechModel = params.get('speechModel') || 'web-speech';
    const speechLanguage = params.get('speechLanguage') || 'en-US';
    setSelect('modelLanguageSelect', `${speechModel}|${speechLanguage}`);

    const correctAnswers = params.get('correctAnswers');
    if (correctAnswers) {
        try {
            const list = JSON.parse(correctAnswers);
            setInput('correctAnswersInput', Array.isArray(list) ? list.join(', ') : correctAnswers);
        } catch {
            setInput('correctAnswersInput', correctAnswers);
        }
    }

    setSelect('micPositionSelect', params.get('micButtonPosition'));
    setSelect('clearPositionSelect', params.get('clearButtonPosition'));

    const continuous = params.get('continuous');
    if (continuous !== null) {
        setCheckbox('continuousCheck', continuous);
    }

    setCheckbox('autoStartCheck', params.get('autoStart'));
    setCheckbox('hideLiveTranscriptCheck', params.get('hideLiveTranscript'));
    setCheckbox('hideResultsPopupCheck', params.get('hideResultsPopup'));

    // Drawing
    setInput('sizeInput', params.get('brushSize'));

    const colors = params.get('colors');
    if (colors) {
        if (colors === '*') {
            setRadio('colorMode', 'all');
            if (customColorsInput) customColorsInput.disabled = true;
        } else {
            setRadio('colorMode', 'custom');
            if (customColorsInput) {
                customColorsInput.disabled = false;
                customColorsInput.value = colors;
            }
        }
    }

    // Toolbar
    setCheckbox('hideToolbarCheck', params.get('hideToolbar'));
    setSelect('toolbarPositionSelect', params.get('toolbarPosition'));
    setSelect('toolbarSizeSelect', params.get('toolbarSize'));

    // Background
    setInput('bgColorInput', params.get('bgColor'));
    setInput('bgImageInput', params.get('bgImage'));
    setCheckbox('coloringBookImageCheck', params.get('isColoringBookImage'));
    setInput('bgOpacityInput', params.get('bgOpacity'));
    setInput('bgImageSizeInput', params.get('bgImageSize'));
    setInput('bgPosXInput', params.get('bgImagePosX'));
    setInput('bgPosYInput', params.get('bgImagePosY'));

    // Grid
    setCheckbox('gridEnabledCheck', params.get('gridEnabled'));
    setInput('gridColorInput', params.get('gridColor'));
    setInput('gridOpacityInput', params.get('gridOpacity'));
    setSelect('gridStyleSelect', params.get('gridStyle'));
    setInput('gridSizeInput', params.get('gridSize'));

    // Inputs
    const showInputsParam = params.get('showInputs');
    if (showInputsParam) {
        try {
            const showInputs = JSON.parse(showInputsParam);
            setCheckbox('eraserInputCheck', String(showInputs.eraserInput));
            setCheckbox('cursorSizeInputCheck', String(showInputs.cursorSizeInput));
            setCheckbox('undoRedoInputCheck', String(showInputs.enableUndoRedoInput));
            setCheckbox('backgroundInputsCheck', String(showInputs.backgroundInputs));
            setCheckbox('gridInputsCheck', String(showInputs.gridInputs));
            setCheckbox('bucketInputCheck', String(showInputs.bucketInput));
        } catch (error) {
            console.warn('Invalid showInputs JSON:', error);
        }
    }

    const hideToolbar = params.get('hideToolbar') === 'true';
    if (toolbarPositionGroup) {
        toolbarPositionGroup.style.display = hideToolbar ? 'none' : 'block';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const currentParams = new URLSearchParams(window.location.search);
    if (currentParams.toString()) {
        if (confirm('Found parameters in URL. Would you like to import them?')) {
            applyParameters(currentParams);
            generateURL();
        }
    }
});