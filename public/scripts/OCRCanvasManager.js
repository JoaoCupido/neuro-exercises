import { BackgroundSettings } from "./BackgroundSettings.js";
import { GridSettings } from "./GridSettings.js";

// OCR Canvas Manager
class OCRCanvasManager {
    constructor() {
        this.urlParams = new URLSearchParams(window.location.search);

        // Load reusable settings
        this.backgroundSettings = new BackgroundSettings(this.urlParams);
        this.gridSettings = new GridSettings(this.urlParams);

        // OCR-specific settings
        this.ocrSettings = this.loadOCRSettings();

        this.init();
    }

    loadOCRSettings() {
        const correctAnswersParam = this.urlParams.get('correctAnswers');
        let correctAnswersList = [];

        if (correctAnswersParam) {
            try {
                // Try to parse as JSON array
                const parsed = JSON.parse(correctAnswersParam);
                if (Array.isArray(parsed)) {
                    correctAnswersList = parsed;
                }
            } catch {
                // If not JSON, treat as comma-separated string
                correctAnswersList = correctAnswersParam.split(',').map(s => s.trim());
            }
        }

        return {
            pencilColor: this.urlParams.get('pencilColor') || '#000000',
            pencilSize: parseInt(this.urlParams.get('pencilSize') || '5'),
            correctAnswers: correctAnswersList,
            clearButtonPosition: this.urlParams.get('clearButtonPosition') || 'bottom-center',
            undoRedoPosition: this.urlParams.get('undoRedoPosition') || 'bottom-center',
            hideOCRLive: this.urlParams.get('hideOCRLive') === 'true',
            hideResultsPopup: this.urlParams.get('hideResultsPopup') === 'true',
            hidePopupButtons: this.urlParams.get('hidePopupButtons') === 'true',
            ocrLanguage: this.urlParams.get('ocrLanguage') || 'eng',
            detectionMode: this.urlParams.get('detectionMode') || 'both',
        };
    }

    init() {
        this.startTime = null;
        this.completeLog = [];
        this.setupCanvases();
        this.setupDrawingState();
        this.setupUI();
        this.setupEventListeners();

        this.setupClearButtonPosition();
        this.setupUndoRedoPosition();

        this.drawBackgroundColor();
        this.loadBackgroundImage();
        this.drawGrid();

        this.startTimer();
    }

    setupCanvases() {
        this.drawingCanvas = document.getElementById('drawingCanvas');
        this.bgColorCanvas = document.getElementById('bgColorCanvas');
        this.bgImageCanvas = document.getElementById('bgImageCanvas');
        this.gridCanvas = document.getElementById('gridCanvas');

        this.drawingCtx = this.drawingCanvas.getContext('2d', { willReadFrequently: true });
        this.bgColorCtx = this.bgColorCanvas.getContext('2d', { willReadFrequently: true });
        this.bgImageCtx = this.bgImageCanvas.getContext('2d', { willReadFrequently: true });
        this.gridCtx = this.gridCanvas.getContext('2d', { willReadFrequently: true });

        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

// Add methods for undo/redo:
    saveState() {
        // Save current canvas state
        const imageData = this.drawingCtx.getImageData(
            0, 0,
            this.drawingCanvas.width,
            this.drawingCanvas.height
        );

        this.undoStack.push(imageData);

        // Limit stack size
        if (this.undoStack.length > this.maxUndoSteps) {
            this.undoStack.shift();
        }

        // Clear redo stack when new action is performed
        this.redoStack = [];

        // Update button states
        this.updateUndoRedoButtons();
    }

    undo() {
        if (this.undoStack.length === 0) return;

        // Save current state to redo stack
        const currentState = this.drawingCtx.getImageData(
            0, 0,
            this.drawingCanvas.width,
            this.drawingCanvas.height
        );
        this.redoStack.push(currentState);

        // Restore previous state
        const previousState = this.undoStack.pop();
        this.drawingCtx.putImageData(previousState, 0, 0);

        this.updateUndoRedoButtons();
        this.scheduleOCRUpdate("UNDO");
    }

    redo() {
        if (this.redoStack.length === 0) return;

        // Save current state to undo stack
        const currentState = this.drawingCtx.getImageData(
            0, 0,
            this.drawingCanvas.width,
            this.drawingCanvas.height
        );
        this.undoStack.push(currentState);

        // Restore redo state
        const nextState = this.redoStack.pop();
        this.drawingCtx.putImageData(nextState, 0, 0);

        this.updateUndoRedoButtons();
        this.scheduleOCRUpdate("REDO");
    }

    updateUndoRedoButtons() {
        const undoBtn = document.getElementById('undoBtn');
        const redoBtn = document.getElementById('redoBtn');

        if (undoBtn) {
            undoBtn.disabled = this.undoStack.length === 0;
            undoBtn.classList.toggle('opacity-50', this.undoStack.length === 0);
            undoBtn.classList.toggle('cursor-not-allowed', this.undoStack.length === 0);
        }

        if (redoBtn) {
            redoBtn.disabled = this.redoStack.length === 0;
            redoBtn.classList.toggle('opacity-50', this.redoStack.length === 0);
            redoBtn.classList.toggle('cursor-not-allowed', this.redoStack.length === 0);
        }
    }

// Update clearCanvas method to save state:
    clearCanvas() {
        this.saveState(); // Save current state before clearing
        this.drawingCtx.clearRect(0, 0, this.drawingCanvas.width, this.drawingCanvas.height);
        this.hideLiveOCRDisplay();
        this.previousOCRText = '';
    }

// Update setupUI to add undo/redo buttons:
    setupUI() {
        this.setupClearButton();
        this.setupUndoRedoButtons(); // New
        this.setupPopup();
        this.setupLiveOCRElements();
    }

    setupUndoRedoButtons() {
        const undoBtn = document.getElementById('undoBtn');
        const redoBtn = document.getElementById('redoBtn');

        if (undoBtn) {
            undoBtn.onclick = () => this.undo();
        }

        if (redoBtn) {
            redoBtn.onclick = () => this.redo();
        }

        // Initialize button states
        this.updateUndoRedoButtons();
    }

    setupClearButtonPosition() {
        const clearBtn = document.getElementById('clearBtn');
        const position = this.ocrSettings.clearButtonPosition;

        // Remove all position classes
        clearBtn.classList.remove(
            'top-4', 'top-1/2', 'bottom-4',
            'left-4', 'left-1/2', 'right-4',
            'translate-x-[calc(-50%_-_70px)]', 'translate-x-[calc(50%_+_70px)]',
            'translate-x-[-140px]', 'translate-x-[140px]', 'translate-x-[70px]', 'transform',
            'left-1/2', '-translate-x-1/2' // Remove centering classes
        );

        // Parse position string (e.g., "top-right", "middle-center", "bottom-left")
        const [vertical, horizontal] = position.split('-');

        // Apply vertical positioning
        switch(vertical) {
            case 'top':
                clearBtn.classList.add('top-4');
                break;
            case 'middle':
                clearBtn.classList.add('top-1/2', 'transform', '-translate-y-1/2');
                break;
            case 'bottom':
                clearBtn.classList.add('bottom-4');
                break;
        }

        // Check if clear button is in the same position as undo/redo
        const undoRedoPosition = this.ocrSettings.undoRedoPosition;

        if (position === undoRedoPosition) {
            // When buttons are together, we need to center the entire group
            // The group width is approximately: undo/redo container (w-20) + gap (w-4) + clear button (w-24)
            // Let's calculate offsets to center the combined group

            switch(horizontal) {
                case 'left':
                    // For left alignment, keep buttons left-aligned with offset
                    clearBtn.classList.add('left-4', 'translate-x-[140px]');
                    break;
                case 'center':
                    // For center alignment, we need to center the entire button group
                    // Undo/Redo container will be positioned at 50% - half group width
                    // Clear button will be at 50% + half group width - button width
                    // But since we're positioning the clear button here, we need a different approach

                    // Remove any existing positioning from the container first
                    const undoRedoContainer = document.getElementById('undoRedoContainer');
                    undoRedoContainer.classList.remove('left-1/2', '-translate-x-1/2');

                    // Position both buttons to center the group
                    // Approximate widths: undo/redo container ~96px, clear button ~112px, gap ~16px
                    // Total group width ~224px, half = 112px

                    // Position undo/redo at left edge of centered group
                    undoRedoContainer.classList.add('absolute');
                    undoRedoContainer.style.left = '50%';
                    undoRedoContainer.style.transform = 'translateX(-112px)'; // Move left by half group width

                    // Position clear button at right edge of centered group
                    clearBtn.classList.add('absolute');
                    clearBtn.style.left = '50%';
                    clearBtn.style.transform = 'translateX(16px)'; // Start from center and add gap
                    break;

                case 'right':
                    // For right alignment, keep buttons right-aligned with offset
                    clearBtn.classList.add('right-4');
                    // Undo/Redo container already has translate-x-[-140px] from its own setup
                    break;
            }
        } else {
            // Normal horizontal positioning without offset
            switch(horizontal) {
                case 'left':
                    clearBtn.classList.add('left-4');
                    break;
                case 'center':
                    clearBtn.classList.add('left-1/2', 'transform', '-translate-x-1/2');
                    break;
                case 'right':
                    clearBtn.classList.add('right-4');
                    break;
            }
        }
    }

    setupUndoRedoPosition() {
        const container = document.getElementById('undoRedoContainer');
        const position = this.ocrSettings.undoRedoPosition;

        // Remove all position classes and inline styles
        container.classList.remove(
            'top-4', 'top-1/2', 'bottom-4',
            'left-4', 'left-1/2', 'right-4',
            'translate-x-[-140px]', 'translate-x-[140px]', 'transform'
        );

        // Remove any inline styles
        container.style.left = '';
        container.style.transform = '';

        // Parse position string (e.g., "top-right", "middle-center", "bottom-left")
        const [vertical, horizontal] = position.split('-');

        // Apply vertical positioning
        switch(vertical) {
            case 'top':
                container.classList.add('top-4');
                break;
            case 'middle':
                container.classList.add('top-1/2', 'transform', '-translate-y-1/2');
                break;
            case 'bottom':
                container.classList.add('bottom-4');
                break;
        }

        // Check if clear button is in the same position
        const clearPosition = this.ocrSettings.clearButtonPosition;

        if (position === clearPosition) {
            switch(horizontal) {
                case 'left':
                    // On left side, Undo/Redo at edge, Clear to the right
                    container.classList.add('left-4');
                    break;
                case 'center':
                    // For center, we'll handle positioning in setupClearButtonPosition
                    // Just add a base class and let the other method handle transforms
                    container.classList.add('absolute');
                    // Don't add centering classes here - they'll be set in setupClearButtonPosition
                    break;
                case 'right':
                    // On right side, we want [Undo/Redo] [Clear] with Clear at the edge
                    // So Undo/Redo should be offset to the left
                    container.classList.add('right-4', 'translate-x-[-140px]');
                    break;
            }
        } else {
            // Normal horizontal positioning without offset
            switch(horizontal) {
                case 'left':
                    container.classList.add('left-4');
                    break;
                case 'center':
                    container.classList.add('left-1/2', 'transform', '-translate-x-1/2');
                    break;
                case 'right':
                    container.classList.add('right-4');
                    break;
            }
        }

        // Trigger clear button repositioning
        this.setupClearButtonPosition();
    }

    setupClearButton() {
        this.clearBtn = document.getElementById('clearBtn');
        this.clearBtn.onclick = () => this.clearCanvas();
    }

    setupPopup() {
        this.popup = document.getElementById('popup');
        this.tryAgainBtn = document.getElementById('tryAgainBtn');
        this.popupTimerElement = document.getElementById('popupTimer');

        this.tryAgainBtn.onclick = () => {
            this.clearCanvas();
            this.hidePopup();
            this.startTimer();
            this.setupDrawingState();
            this.updateUndoRedoButtons();
        };

        if (this.ocrSettings.hidePopupButtons) {
            document.getElementById('buttonContainer').classList.add('hidden');
        }
    }

    setupEventListeners() {
        // Mouse events
        this.drawingCanvas.addEventListener('mousedown', (e) => this.startDrawing(e));
        this.drawingCanvas.addEventListener('mousemove', (e) => this.draw(e));
        this.drawingCanvas.addEventListener('mouseup', () => {
            this.stopDrawing();
            this.scheduleOCRUpdate();
        });
        this.drawingCanvas.addEventListener('mouseout', () => {
            this.stopDrawing();
            this.scheduleOCRUpdate();
        });

        // Touch events
        this.drawingCanvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.startDrawing(e.touches[0]);
        });

        this.drawingCanvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            this.draw(e.touches[0]);
        });

        this.drawingCanvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.stopDrawing();
            this.scheduleOCRUpdate();
        });

        // Keyboard shortcuts for undo/redo
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                if (e.key === 'z') {
                    this.undo();
                }
                if (e.key === 'y') {
                    this.redo();
                }
            }
        });
    }

    // Add new methods for live OCR display
    scheduleOCRUpdate(state = "STOPPED_DRAWING") {
        // Clear any existing timer
        if (this.ocrUpdateTimer) {
            clearTimeout(this.ocrUpdateTimer);
        }

        // Schedule OCR update after a short delay (to allow user to finish drawing)
        this.ocrUpdateTimer = setTimeout(() => {
            this.performLiveOCR(state);
        }, 500); // 500ms delay
    }

    async performLiveOCR(state) {
        try {
            // Prepare canvas for OCR
            const canvasData = this.prepareCanvasForOCR();

            // Use Tesseract.js for OCR
            const result = await this.recognizeWithTesseract(canvasData);

            // Process and display live results
            this.updateLiveOCRDisplay(result.data.text.trim(), state);

            // Check if text matches correct answer
            this.checkForCorrectAnswer(result.data.text.trim(), state);

        } catch (error) {
            console.error('Live OCR Error:', error);
            // Don't show error in live display to avoid disrupting user
        }
    }

    checkForCorrectAnswer(recognizedText, state) {
        if (!this.ocrSettings.correctAnswers || this.ocrSettings.correctAnswers.length === 0 || !recognizedText) return;

        const cleanRecognized = recognizedText.trim().toLowerCase();

        // Check if any correct answer matches (case-insensitive)
        const isCorrect = this.ocrSettings.correctAnswers.some(answer =>
            answer.trim().toLowerCase() === cleanRecognized
        );

        // Only show popup for exact match with any correct answer
        if (isCorrect) {
            this.stopTimer();
            this.showResultsPopup(recognizedText, state);
        }
    }

    showResultsPopup(recognizedText, state) {
        // Hide live display first
        this.hideLiveOCRDisplay();

        this.popupTimerElement.textContent = `Time: ${this.popupTimer.toFixed(2)}s`;
        this.popupTimerElement.classList.remove('hidden');

        // Update popup content - show only recognized text
        const recognizedTextElement = document.getElementById('recognizedText');
        if (recognizedTextElement) {
            recognizedTextElement.textContent = recognizedText || 'No text recognized';
        }

        // Hide the correct answers section
        const correctAnswersSection = document.getElementById('correctAnswersSection');
        if (correctAnswersSection) {
            correctAnswersSection.classList.add('hidden');
        }

        // Show the popup unless it's configured to be hidden
        if (!this.ocrSettings.hideResultsPopup) {
            this.popup.classList.remove('hidden');
        }

        this.sendVuplexData(recognizedText, state, true);
    }

    sendVuplexData(recognizedText, state, isFinished = false) {
        this.completeLog.push({
            state: state,
            item: recognizedText,
            positionInTime: this.popupTimer
        });

        if (isFinished) {
            this.completeLog.push({
                state: "FINISHED",
                item: "-",
                positionInTime: this.popupTimer
            });
        }

        if (window.vuplex) {
            const sendData = {
                type: "NeuroExercises",
                activity: "TextRecognition",
                dataNE: {
                    activity: "TextRecognition",
                    log: this.completeLog,
                    correctText: this.ocrSettings.correctAnswers.join(", "),
                    //image: this.screenshotDrawing(),
                    time: parseFloat(this.popupTimer.toFixed(2)),
                    //onlyShowLast: true,
                }
            };
            window.vuplex.postMessage(JSON.stringify(sendData));
        } else {
            console.log("VUPLEX bridge not available");
        }
    }

    updateTimer() {
        const currentTime = new Date();
        const timeInSeconds = (currentTime - this.startTime) / 1000;
        this.popupTimer = timeInSeconds;
    }

    startTimer() {
        this.startTime = new Date();
        this.timerInterval = setInterval(() => this.updateTimer(), 100);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
    }

    screenshotDrawing() {
        const targetWidth = this.drawingCanvas.width / 2;
        const targetHeight = this.drawingCanvas.height / 2;

        // Create canvas at target size
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = targetWidth;
        tempCanvas.height = targetHeight;
        const tempCtx = tempCanvas.getContext('2d');

        // User drawing (top layer)
        tempCtx.drawImage(this.drawingCanvas, 0, 0, this.drawingCanvas.width, this.drawingCanvas.height,
            0, 0, targetWidth, targetHeight);

        // Convert to JPEG with lower quality for smaller size
        const base64Image = tempCanvas.toDataURL('image/jpeg');
        const base64WithoutPrefix = base64Image.replace(/^data:image\/jpeg;base64,/, '');

        return base64WithoutPrefix;
    }

    // Update the hidePopup method to clear timer:
    hidePopup() {
        // Clear any existing timer
        if (this.popupTimer) {
            clearTimeout(this.popupTimer);
            this.popupTimer = null;
        }

        this.popup.classList.add('hidden');
    }

    // Add popupTimer property to the class:
    setupDrawingState() {
        this.isDrawing = false;
        this.currentColor = this.ocrSettings.pencilColor;
        this.currentSize = this.ocrSettings.pencilSize;
        this.currentTool = 'pencil';

        // Undo/Redo stacks
        this.undoStack = [];
        this.redoStack = [];
        this.maxUndoSteps = 50;

        // Popup timer
        this.popupTimer = null;
    }

    stopDrawing() {
        if (this.isDrawing) {
            this.isDrawing = false;
            // Check for correct answer immediately
            this.scheduleOCRUpdate();
        }
    }

    updateLiveOCRDisplay(recognizedText, state) {
        // Filter text based on detection mode
        //const filteredText = this.filterTextByDetectionMode(recognizedText || '');
        //const cleanText = filteredText.trim();
        const cleanText = recognizedText;
        this.sendVuplexData(recognizedText, state);

        if (cleanText === this.previousOCRText) {
            return;
        }

        // Store the new text
        this.previousOCRText = cleanText;

        // Update display text
        if (cleanText && !this.ocrSettings.hideOCRLive) {
            this.ocrLiveText.textContent = cleanText.length > 50 ?
                cleanText.substring(0, 47) + '...' : cleanText;

            // Show the display
            this.ocrLiveResult.classList.remove('hidden');
            this.ocrLiveResult.classList.remove('opacity-0');
            this.ocrLiveResult.classList.add('opacity-100');
        } else {
            // Hide if no text recognized
            this.hideLiveOCRDisplay();
        }
    }

    hideLiveOCRDisplay() {
        this.ocrLiveResult.classList.remove('opacity-100');
        this.ocrLiveResult.classList.add('opacity-0');

        // Hide completely after transition
        setTimeout(() => {
            this.ocrLiveResult.classList.add('hidden');
        }, 300);
    }

    // Drawing methods
    startDrawing(e) {
        const rect = this.drawingCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        this.isDrawing = true;
        this.lastX = x;
        this.lastY = y;

        this.saveState();
    }

    draw(e) {
        if (!this.isDrawing) return;

        const rect = this.drawingCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        this.drawingCtx.beginPath();
        this.drawingCtx.moveTo(this.lastX, this.lastY);
        this.drawingCtx.lineTo(x, y);

        if (this.currentTool === 'eraser') {
            this.drawingCtx.globalCompositeOperation = 'destination-out';
            this.drawingCtx.strokeStyle = 'rgba(0,0,0,1)';
        } else {
            this.drawingCtx.globalCompositeOperation = 'source-over';
            this.drawingCtx.strokeStyle = this.currentColor;
        }

        this.drawingCtx.lineWidth = this.currentSize;
        this.drawingCtx.lineCap = 'round';
        this.drawingCtx.lineJoin = 'round';
        this.drawingCtx.stroke();

        this.lastX = x;
        this.lastY = y;
    }

    // Canvas resize and background methods (similar to DrawingCanvasManager)
    resizeCanvas() {
        const container = this.drawingCanvas.parentElement;
        this.drawingCanvas.width = container.clientWidth;
        this.drawingCanvas.height = container.clientHeight;
        this.bgColorCanvas.width = container.clientWidth;
        this.bgColorCanvas.height = container.clientHeight;
        this.bgImageCanvas.width = container.clientWidth;
        this.bgImageCanvas.height = container.clientHeight;
        this.gridCanvas.width = container.clientWidth;
        this.gridCanvas.height = container.clientHeight;

        this.drawBackgroundColor();
        if (this.urlParams.get('bgImage')) {
            this.loadBackgroundImage();
        }
        if (this.gridSettings.gridEnabled) {
            this.drawGrid();
        }
    }

    drawBackgroundColor() {
        const bgColor = this.backgroundSettings.bgColor;
        const opacity = this.backgroundSettings.bgOpacity;

        let rgbaColor;
        if (bgColor.startsWith('#')) {
            const hex = bgColor.replace('#', '');
            const r = parseInt(hex.substring(0, 2), 16);
            const g = parseInt(hex.substring(2, 4), 16);
            const b = parseInt(hex.substring(4, 6), 16);
            rgbaColor = `rgba(${r}, ${g}, ${b}, ${opacity})`;
        } else {
            rgbaColor = bgColor;
            if (bgColor.startsWith('rgb(')) {
                rgbaColor = bgColor.replace('rgb(', 'rgba(').replace(')', `, ${opacity})`);
            }
        }

        this.bgColorCtx.clearRect(0, 0, this.bgColorCanvas.width, this.bgColorCanvas.height);
        this.bgColorCtx.fillStyle = rgbaColor;
        this.bgColorCtx.fillRect(0, 0, this.bgColorCanvas.width, this.bgColorCanvas.height);
    }

    loadBackgroundImage() {
        const bgImageParam = this.urlParams.get('bgImage');
        if (!bgImageParam) return;

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            this.bgImageCtx.clearRect(0, 0, this.bgImageCanvas.width, this.bgImageCanvas.height);
            this.bgImageCtx.globalAlpha = this.backgroundSettings.bgOpacity;

            if (this.backgroundSettings.isColoringBookImage) {
                this.processColoringBookImage(img);
            } else {
                this.drawRegularBackgroundImage(img);
            }

            this.bgImageCtx.globalAlpha = 1;
        };
        img.src = bgImageParam;
    }

    processColoringBookImage(img) {
        // Same as DrawingCanvasManager
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        tempCtx.drawImage(img, 0, 0);

        const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];
            const isWhite = r > 200 && g > 200 && b > 200 && a > 50;

            if (isWhite) {
                data[i + 3] = 0;
            } else {
                data[i] = 0;
                data[i + 1] = 0;
                data[i + 2] = 0;
            }
        }

        tempCtx.putImageData(imageData, 0, 0);

        const scale = Math.max(
            this.bgImageCanvas.width / tempCanvas.width,
            this.bgImageCanvas.height / tempCanvas.height
        ) * (this.backgroundSettings.bgImageSize / 100);

        const x = (this.bgImageCanvas.width - tempCanvas.width * scale) * (this.backgroundSettings.bgImagePosition.x / 100);
        const y = (this.bgImageCanvas.height - tempCanvas.height * scale) * (this.backgroundSettings.bgImagePosition.y / 100);

        this.bgImageCtx.drawImage(tempCanvas, x, y, tempCanvas.width * scale, tempCanvas.height * scale);
    }

    drawRegularBackgroundImage(img) {
        const scale = Math.max(
            this.bgImageCanvas.width / img.width,
            this.bgImageCanvas.height / img.height
        ) * (this.backgroundSettings.bgImageSize / 100);

        const x = (this.bgImageCanvas.width - img.width * scale) * (this.backgroundSettings.bgImagePosition.x / 100);
        const y = (this.bgImageCanvas.height - img.height * scale) * (this.backgroundSettings.bgImagePosition.y / 100);

        this.bgImageCtx.drawImage(img, x, y, img.width * scale, img.height * scale);
    }

    drawGrid() {
        if (!this.gridSettings.gridEnabled) return;

        this.gridCtx.clearRect(0, 0, this.gridCanvas.width, this.gridCanvas.height);
        this.gridCtx.strokeStyle = this.gridSettings.gridColor;
        this.gridCtx.globalAlpha = this.gridSettings.gridOpacity;
        this.gridCtx.lineWidth = 1;

        const width = this.gridCanvas.width;
        const height = this.gridCanvas.height;

        switch (this.gridSettings.gridStyle) {
            case 'solid':
                this.drawSolidGrid(width, height);
                break;
            case 'dotted':
                this.drawDottedGrid(width, height);
                break;
            case 'dashed':
                this.drawDashedGrid(width, height);
                break;
            case 'sparse':
                this.drawSparseGrid(width, height);
                break;
        }

        this.gridCtx.globalAlpha = 1;
    }

    drawSolidGrid(width, height) {
        this.gridCtx.beginPath();
        for (let x = 0; x <= width; x += this.gridSettings.gridCellSize) {
            this.gridCtx.moveTo(x, 0);
            this.gridCtx.lineTo(x, height);
        }
        for (let y = 0; y <= height; y += this.gridSettings.gridCellSize) {
            this.gridCtx.moveTo(0, y);
            this.gridCtx.lineTo(width, y);
        }
        this.gridCtx.stroke();
    }

    drawDottedGrid(width, height) {
        this.gridCtx.fillStyle = this.gridSettings.gridColor;
        for (let x = 0; x <= width; x += this.gridSettings.gridCellSize) {
            for (let y = 0; y <= height; y += this.gridSettings.gridCellSize) {
                this.gridCtx.beginPath();
                this.gridCtx.arc(x, y, 1, 0, Math.PI * 2);
                this.gridCtx.fill();
            }
        }
    }

    drawDashedGrid(width, height) {
        this.gridCtx.setLineDash([4, 4]);
        this.gridCtx.beginPath();
        for (let x = 0; x <= width; x += this.gridSettings.gridCellSize) {
            this.gridCtx.moveTo(x, 0);
            this.gridCtx.lineTo(x, height);
        }
        for (let y = 0; y <= height; y += this.gridSettings.gridCellSize) {
            this.gridCtx.moveTo(0, y);
            this.gridCtx.lineTo(width, y);
        }
        this.gridCtx.stroke();
        this.gridCtx.setLineDash([]);
    }

    drawSparseGrid(width, height) {
        const sparseFactor = 4;
        this.gridCtx.beginPath();
        for (let x = 0; x <= width; x += this.gridSettings.gridCellSize * sparseFactor) {
            this.gridCtx.moveTo(x, 0);
            this.gridCtx.lineTo(x, height);
        }
        for (let y = 0; y <= height; y += this.gridSettings.gridCellSize * sparseFactor) {
            this.gridCtx.moveTo(0, y);
            this.gridCtx.lineTo(width, y);
        }
        this.gridCtx.stroke();
    }

    setupLiveOCRElements() {
        this.ocrLiveResult = document.getElementById('ocrLiveResult');
        this.ocrLiveText = document.getElementById('ocrLiveText');
        this.previousOCRText = '';
        this.ocrUpdateTimer = null;

        // If live OCR is hidden, hide the element immediately
        if (this.ocrSettings.hideOCRLive && this.ocrLiveResult) {
            this.ocrLiveResult.classList.add('hidden');
        }
    }

    prepareCanvasForOCR() {
        // Create a copy of the drawing canvas with white background for better OCR
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.drawingCanvas.width;
        tempCanvas.height = this.drawingCanvas.height;
        const tempCtx = tempCanvas.getContext('2d');

        // Fill with white background
        tempCtx.fillStyle = '#ffffff';
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

        // Draw the user's drawing in black (for better contrast)
        tempCtx.drawImage(this.drawingCanvas, 0, 0);

        return tempCanvas;
    }

    async recognizeWithTesseract(canvas) {
        // Check if Tesseract is available
        if (typeof Tesseract === 'undefined') {
            // Load Tesseract dynamically
            await this.loadTesseract();
        }

        // Configure Tesseract
        const worker = await Tesseract.createWorker(this.ocrSettings.ocrLanguage);

        try {
            // Base parameters
            const params = {
                tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
                tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY,
                user_defined_dpi: '300',
                textord_min_linesize: '2.5',
                textord_min_aspect_ratio: '0.1'
            };

            // Add character filtering based on detection mode
            switch (this.ocrSettings.detectionMode) {
                case 'letters':
                    // Letters only - whitelist letters and spaces
                    params.tessedit_char_whitelist = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ';
                    break;
                case 'numbers':
                    // Numbers only - whitelist digits
                    params.tessedit_char_whitelist = '0123456789';
                    break;
                default:
                    params.tessedit_char_whitelist = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ0123456789';
                    break;
                // 'both' case - no whitelist, detect everything
            }

            await worker.setParameters(params);
            const result = await worker.recognize(canvas);
            await worker.terminate();
            return result;
        } catch (error) {
            await worker.terminate();
            throw error;
        }
    }

    async loadTesseract() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            const isGitHubPages = window.location.hostname.includes('github.io');

            if (isGitHubPages) {
                script.src = import.meta.env.BASE_URL + '/scripts/tesseract.min.js';
            } else {
                script.src = '/scripts/tesseract.min.js';
            }

            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new OCRCanvasManager();
});