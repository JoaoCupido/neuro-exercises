// WantedShapesGenerateScript.js
const form = document.getElementById('urlForm');
const generatedUrlEl = document.getElementById('generatedUrl');
const copyBtn = document.getElementById('copyBtn');

document.getElementById('importBtn').addEventListener('click', importFromURL);
document.getElementById('importParamBtn').addEventListener('click', importFromParams);

form.addEventListener('input', generateURL);
form.addEventListener('change', generateURL);

document.addEventListener('DOMContentLoaded', generateURL);

copyBtn.addEventListener('click', copyToClipboard);

function validateSelections() {
    const selectedColors = Array.from(document.querySelectorAll('.color-checkbox:checked'));
    const selectedShapes = Array.from(document.querySelectorAll('.shape-checkbox:checked'));

    if (selectedColors.length === 0) {
        alert('Please select at least one color');
        return false;
    }

    if (selectedShapes.length === 0) {
        alert('Please select at least one shape');
        return false;
    }

    return true;
}

function generateURL() {
    if (!validateSelections()) return;

    const formData = getFormData();
    const params = buildURLParams(formData);
    const fullUrl = constructFullURL(params);
    displayResult(fullUrl);
}

function getFormData() {
    // Get selected colors
    const selectedColors = Array.from(document.querySelectorAll('.color-checkbox:checked'))
        .map(cb => cb.value);

    // Get selected shapes
    const selectedShapes = Array.from(document.querySelectorAll('.shape-checkbox:checked'))
        .map(cb => cb.value);

    // Get target based on selected type
    const targetType = document.querySelector('input[name="targetType"]:checked').value;
    let target = '';

    if (targetType === 'color') {
        const color = document.getElementById('targetColorSelect').value;
        target = `${color} shapes`;
    } else if (targetType === 'shape') {
        const shape = document.getElementById('targetShapeSelect').value;
        target = `${shape}s`;
    } else if (targetType === 'combination') {
        const color = document.getElementById('combinationColorSelect').value;
        const shape = document.getElementById('combinationShapeSelect').value;
        target = `all ${color} ${shape}`;
    }

    // Get seed value
    const seedInput = document.getElementById('seedInput');
    const seed = seedInput ? seedInput.value : '';

    return {
        numShapes: document.getElementById('numShapesInput').value,
        shapeSize: document.getElementById('shapeSizeInput').value,
        targetCount: document.getElementById('targetCountInput').value,
        movement: document.getElementById('movementSelect').value,
        borderBehavior: document.getElementById('borderBehaviorSelect').value,
        target: target,
        speed: document.getElementById('speedInput').value,
        swirlSpeed: document.getElementById('swirlSpeedInput').value,
        bounceAmplitude: document.getElementById('bounceAmplitudeInput').value,
        bounceFrequency: document.getElementById('bounceFrequencyInput').value,
        showTimer: document.getElementById('showTimerCheck').checked,
        hidePopupAll: document.getElementById('hidePopupAllCheck')?.checked,

        // Seed parameter
        seed: seed,

        // Color and shape lists
        colors: selectedColors.join(','),
        shapes: selectedShapes.join(','),

        // Background settings
        bgColor: document.getElementById('bgColorInput').value,
        bgImage: document.getElementById('bgImageInput').value,
        isColoringBookImage: document.getElementById('coloringBookImageCheck').checked,
        bgOpacity: document.getElementById('bgOpacityInput').value,
        bgImageSize: document.getElementById('bgImageSizeInput').value,
        bgPosX: document.getElementById('bgPosXInput').value,
        bgPosY: document.getElementById('bgPosYInput').value,

        // Grid settings
        gridEnabled: document.getElementById('gridEnabledCheck').checked,
        gridColor: document.getElementById('gridColorInput').value,
        gridOpacity: document.getElementById('gridOpacityInput').value,
        gridStyle: document.getElementById('gridStyleSelect').value,
        gridSize: document.getElementById('gridSizeInput').value
    };
}

function buildURLParams(data) {
    const params = new URLSearchParams();

    // Game parameters
    if (data.numShapes && data.numShapes !== '20') params.append('numShapes', data.numShapes);
    if (data.shapeSize && data.shapeSize !== '40') params.append('shapeSize', data.shapeSize);

    // Seed parameter
    if (data.seed && data.seed !== '' && parseInt(data.seed) >= 0) {
        params.append('seed', data.seed);
    }

    // Target count parameter
    if (data.targetCount && data.targetCount !== '' && parseInt(data.targetCount) > 0) {
        params.append('targetCount', data.targetCount);
    }

    if (data.movement && data.movement !== 'linear') params.append('movement', data.movement);
    if (data.borderBehavior && data.borderBehavior !== 'collision') params.append('borderBehavior', data.borderBehavior);
    if (data.target) params.append('target', encodeURIComponent(data.target));
    if (data.speed && data.speed !== '1.0' && data.speed !== '1') params.append('speed', data.speed);
    if (data.swirlSpeed && data.swirlSpeed !== '0.02') params.append('swirlSpeed', data.swirlSpeed);
    if (data.bounceAmplitude && data.bounceAmplitude !== '50') params.append('bounceAmplitude', data.bounceAmplitude);
    if (data.bounceFrequency && data.bounceFrequency !== '0.005') params.append('bounceFrequency', data.bounceFrequency);
    if (!data.showTimer) params.append('showTimer', 'false');

    if (data.hidePopupAll) params.append("hidePopupAll", data.hidePopupAll);

    // Color and shape lists - only add if not using defaults
    if (data.colors && data.colors !== 'red,yellow,blue,green') {
        params.append('colors', encodeURIComponent(data.colors));
    }
    if (data.shapes && data.shapes !== 'square,triangle,circle,star') {
        params.append('shapes', encodeURIComponent(data.shapes));
    }

    // Background parameters
    if (data.bgColor && data.bgColor !== '#ffffff') {
        params.append('bgColor', encodeURIComponent(data.bgColor));
    }
    if (data.bgOpacity && data.bgOpacity !== '100') params.append('bgOpacity', data.bgOpacity);
    if (data.bgImage) {
        params.append('bgImage', data.bgImage);
        if (data.bgImageSize && data.bgImageSize !== '100') params.append('bgImageSize', data.bgImageSize);
        if (data.bgPosX && data.bgPosX !== '50') params.append('bgImagePosX', data.bgPosX);
        if (data.bgPosY && data.bgPosY !== '50') params.append('bgImagePosY', data.bgPosY);
    }
    if (data.isColoringBookImage) {
        params.append('isColoringBookImage', 'true');
    }

    // Grid parameters
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
    const baseUrl = window.location.origin + window.location.pathname.replace('/generate', '').replace('/wanted-shapes/generate', '/wanted-shapes');
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
        alert('Invalid URL format. Please enter a valid URL.');
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
        alert('Invalid parameter format. Please check your input.');
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

    // Game parameters
    setInput('numShapesInput', params.get('numShapes'));
    setInput('shapeSizeInput', params.get('shapeSize'));

    // Seed parameter
    setInput('seedInput', params.get('seed'));

    // Target count parameter
    setInput('targetCountInput', params.get('targetCount'));

    setSelect('movementSelect', params.get('movement'));
    setSelect('borderBehaviorSelect', params.get('borderBehavior'));

    // Handle target parameter
    const targetValue = params.get('target');
    if (targetValue) {
        const decodedTarget = decodeValue(targetValue).toLowerCase();

        // Determine target type and set UI
        if (decodedTarget.includes('shapes') && !decodedTarget.includes('all')) {
            // By color
            document.querySelector('input[name="targetType"][value="color"]').checked = true;
            const colorMatch = decodedTarget.match(/(\w+) shapes/);
            if (colorMatch) {
                setSelect('targetColorSelect', colorMatch[1]);
            }
            document.getElementById('targetByColor').style.display = 'block';
            document.getElementById('targetByShape').style.display = 'none';
            document.getElementById('targetByCombination').style.display = 'none';
        } else if (decodedTarget.includes('all')) {
            // Combination
            document.querySelector('input[name="targetType"][value="combination"]').checked = true;
            const comboMatch = decodedTarget.match(/all (\w+) (\w+)/);
            if (comboMatch) {
                setSelect('combinationColorSelect', comboMatch[1]);
                setSelect('combinationShapeSelect', comboMatch[2]);
            }
            document.getElementById('targetByColor').style.display = 'none';
            document.getElementById('targetByShape').style.display = 'none';
            document.getElementById('targetByCombination').style.display = 'block';
        } else {
            // By shape
            document.querySelector('input[name="targetType"][value="shape"]').checked = true;
            const shapeMatch = decodedTarget.match(/(\w+)s/);
            if (shapeMatch) {
                setSelect('targetShapeSelect', shapeMatch[1]);
            }
            document.getElementById('targetByColor').style.display = 'none';
            document.getElementById('targetByShape').style.display = 'block';
            document.getElementById('targetByCombination').style.display = 'none';
        }
    }

    setInput('speedInput', params.get('speed'));
    setInput('swirlSpeedInput', params.get('swirlSpeed'));
    setInput('bounceAmplitudeInput', params.get('bounceAmplitude'));
    setInput('bounceFrequencyInput', params.get('bounceFrequency'));
    setCheckbox('showTimerCheck', params.get('showTimer'));

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
}
