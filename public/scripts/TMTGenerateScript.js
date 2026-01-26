// TMTGenerateScript.js
const form = document.getElementById('urlForm');
const generatedUrlEl = document.getElementById('generatedUrl');
const copyBtn = document.getElementById('copyBtn');

// Import functionality
document.getElementById('importBtn').addEventListener('click', importFromURL);
document.getElementById('importParamBtn').addEventListener('click', importFromParams);

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
        textSize: document.getElementById('textSizeInput').value,
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
    if (data.textSize && data.textSize !== '18') params.append('textSize', data.textSize);
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

    if (data.bgOpacity && data.bgOpacity !== '50') params.append('bgOpacity', data.bgOpacity);

    if (data.bgImage) {
        params.append('bgImage', data.bgImage);
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
// Enhanced version that uses the same validation logic as the main app
function generateRandomPositions() {
    const trailLength = parseInt(document.getElementById('trailLengthInput').value);
    const numberRadius = parseInt(document.getElementById('numberRadiusInput').value) || 30;
    const positions = [];

    // Create a mock canvas for accurate calculations
    const mockCanvas = {
        width: 1920,
        height: 1080,
        items: {}
    };

    // Maximum attempts to find a non-overlapping position
    const maxAttemptsPerDot = 500;

    for (let i = 0; i < trailLength; i++) {
        let positionFound = false;
        let attempts = 0;
        let xPercent, yPercent;

        do {
            // Generate random position with margin from edges
            const margin = numberRadius * 2;
            const minX = margin;
            const maxX = mockCanvas.width - margin;
            const minY = margin;
            const maxY = mockCanvas.height - margin;

            // Generate random coordinates
            const x = minX + Math.random() * (maxX - minX);
            const y = minY + Math.random() * (maxY - minY);

            // Check for overlap with existing items
            let overlaps = false;
            for (const itemId in mockCanvas.items) {
                const existingPos = mockCanvas.items[itemId];
                const distance = Math.sqrt(Math.pow(x - existingPos.x, 2) + Math.pow(y - existingPos.y, 2));
                const minDistance = numberRadius * 2.5; // Same as in main code

                if (distance < minDistance) {
                    overlaps = true;
                    break;
                }
            }

            if (!overlaps) {
                // Convert to percentages
                xPercent = (x / mockCanvas.width) * 100;
                yPercent = (y / mockCanvas.height) * 100;

                // Add to mock canvas items for future overlap checks
                mockCanvas.items[i] = { x, y };

                // Add to positions array
                positions.push({
                    x: parseFloat(xPercent.toFixed(2)),
                    y: parseFloat(yPercent.toFixed(2))
                });

                positionFound = true;
            }

            attempts++;

            if (attempts >= maxAttemptsPerDot) {
                console.warn(`Max attempts reached for dot ${i + 1}, adjusting parameters`);
                // If we can't find a non-overlapping position, use the last generated one
                // but reduce the radius temporarily to make it fit
                const tempRadius = numberRadius * 0.8;
                const tempMinDistance = tempRadius * 2.5;

                let foundWithReducedRadius = false;
                for (let retry = 0; retry < 100; retry++) {
                    const x = minX + Math.random() * (maxX - minX);
                    const y = minY + Math.random() * (maxY - minY);

                    let tempOverlaps = false;
                    for (const itemId in mockCanvas.items) {
                        const existingPos = mockCanvas.items[itemId];
                        const distance = Math.sqrt(Math.pow(x - existingPos.x, 2) + Math.pow(y - existingPos.y, 2));

                        if (distance < tempMinDistance) {
                            tempOverlaps = true;
                            break;
                        }
                    }

                    if (!tempOverlaps) {
                        xPercent = (x / mockCanvas.width) * 100;
                        yPercent = (y / mockCanvas.height) * 100;

                        mockCanvas.items[i] = { x, y };
                        positions.push({
                            x: parseFloat(xPercent.toFixed(2)),
                            y: parseFloat(yPercent.toFixed(2))
                        });

                        foundWithReducedRadius = true;
                        break;
                    }
                }

                if (!foundWithReducedRadius) {
                    // Last resort: just use a random position
                    xPercent = Math.random() * 80 + 10;
                    yPercent = Math.random() * 80 + 10;
                    positions.push({
                        x: parseFloat(xPercent.toFixed(2)),
                        y: parseFloat(yPercent.toFixed(2))
                    });
                }

                positionFound = true;
            }

        } while (!positionFound);
    }

    // Sort positions to make them more readable in the JSON
    positions.sort((a, b) => {
        if (a.x !== b.x) return a.x - b.x;
        return a.y - b.y;
    });

    document.getElementById('customPositionsInput').value = JSON.stringify(positions, null, 2);
    generateURL();
}

// Add event listener for random positions button
document.getElementById('generateRandomPositionsBtn').addEventListener('click', generateRandomPositions);

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

    // TMT-specific parameters
    setInput('trailLengthInput', params.get('trailLength'));
    setInput('numberRadiusInput', params.get('numberRadius'));
    setInput('textSizeInput', params.get('textSize'));
    setSelect('symbolTypeSelect', params.get('symbolType'));
    setCheckbox('reverseOrderCheck', params.get('reverseOrder'));
    setCheckbox('showTimerCheck', params.get('showTimer'));

    // TMT advanced parameters
    setCheckbox('linesUnderDotsCheck', params.get('linesUnderDots'));
    setCheckbox('allowWrongSelectionsCheck', params.get('allowWrongSelections'));
    setCheckbox('showWrongSelectionsCheck', params.get('showWrongSelections'));
    setCheckbox('hidePopupButtonsCheck', params.get('hidePopupButtons'));
    setCheckbox('hidePopupResultsCheck', params.get('hidePopupResults'));
    setCheckbox('hidePopupAllCheck', params.get('hidePopupAll'));

    // Custom positions
    const customPositions = params.get('customPositions');
    if (customPositions) {
        try {
            const decoded = decodeValue(customPositions);
            // Validate JSON before setting
            JSON.parse(decoded);
            document.getElementById('customPositionsInput').value = decoded;
        } catch (error) {
            console.warn('Invalid custom positions JSON:', error);
        }
    }

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