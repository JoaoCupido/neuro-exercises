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
        return {
            pencilColor: this.urlParams.get('pencilColor') || '#000000',
            pencilSize: parseInt(this.urlParams.get('pencilSize') || '5'),
            correctAnswersList: this.parseCorrectAnswers(this.urlParams.get('correctAnswersList')),
            clearButtonPosition: this.urlParams.get('clearButtonPosition') || 'top-right',
            hideResultsPopup: this.urlParams.get('hideResultsPopup') === 'true',
            hidePopupButtons: this.urlParams.get('hidePopupButtons') === 'true',
            ocrLanguage: this.urlParams.get('ocrLanguage') || 'eng',
            confidenceThreshold: parseFloat(this.urlParams.get('confidenceThreshold') || '0.5')
        };
    }

    parseCorrectAnswers(param) {
        if (!param) return [];
        try {
            return JSON.parse(param);
        } catch (e) {
            return param.split(',').map(item => item.trim());
        }
    }

    init() {
        this.setupCanvases();
        this.setupDrawingState();
        this.setupUI();
        this.setupEventListeners();
        this.setupTabs();
        this.applyToolbarPosition();
        this.applyToolbarSize();
        this.setupClearButtonPosition();
        this.drawBackgroundColor();
        this.loadBackgroundImage();
        this.drawGrid();
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

    setupDrawingState() {
        this.isDrawing = false;
        this.currentColor = this.ocrSettings.pencilColor;
        this.currentSize = this.ocrSettings.pencilSize;
        this.currentTool = 'pencil';

        // Available colors (just black for OCR)
        this.availableColors = [this.ocrSettings.pencilColor];
    }

    setupUI() {
        this.setupColorButtons();
        this.setupToolButtons();
        this.setupSliders();
        this.setupGridControls();
        this.setupClearButton();
        this.setupPopup();

        // Apply hideToolbar setting if exists
        const hideToolbar = this.urlParams.get('hideToolbar') === 'true';
        if (hideToolbar) {
            this.hideToolbarUI();
        }
    }

    hideToolbarUI() {
        const toolbar = document.getElementById('toolbar');
        if (toolbar) {
            toolbar.style.display = 'none';
        }
    }

    setupTabs() {
        this.generalTab = document.getElementById('generalTab');
        this.backgroundTab = document.getElementById('backgroundTab');
        this.gridTab = document.getElementById('gridTab');

        this.generalContent = document.getElementById('generalContent');
        this.backgroundContent = document.getElementById('backgroundContent');
        this.gridContent = document.getElementById('gridContent');

        this.generalTab.onclick = () => this.switchTab('general');
        this.backgroundTab.onclick = () => this.switchTab('background');
        this.gridTab.onclick = () => this.switchTab('grid');

        this.switchTab('general');
    }

    switchTab(tabName) {
        [this.generalTab, this.backgroundTab, this.gridTab].forEach(tab => {
            tab.classList.remove('text-primary', 'border-b-2', 'border-primary');
            tab.classList.add('text-muted-foreground');
        });

        [this.generalContent, this.backgroundContent, this.gridContent].forEach(content => {
            content.classList.add('hidden');
        });

        switch(tabName) {
            case 'general':
                this.generalTab.classList.add('text-primary', 'border-b-2', 'border-primary');
                this.generalTab.classList.remove('text-muted-foreground');
                this.generalContent.classList.remove('hidden');
                break;
            case 'background':
                this.backgroundTab.classList.add('text-primary', 'border-b-2', 'border-primary');
                this.backgroundTab.classList.remove('text-muted-foreground');
                this.backgroundContent.classList.remove('hidden');
                break;
            case 'grid':
                this.gridTab.classList.add('text-primary', 'border-b-2', 'border-primary');
                this.gridTab.classList.remove('text-muted-foreground');
                this.gridContent.classList.remove('hidden');
                break;
        }
    }

    applyToolbarPosition() {
        const toolbar = document.getElementById('toolbar');
        const toolbarPosition = this.urlParams.get('toolbarPosition') || 'up';

        toolbar.classList.remove('top-4', 'bottom-4', 'left-4', 'right-4', 'left-1/2', 'transform', '-translate-x-1/2', 'max-w-[95vw]');

        switch(toolbarPosition) {
            case 'up':
                toolbar.classList.add('top-4', 'left-1/2', 'transform', '-translate-x-1/2', 'max-w-[95vw]');
                break;
            case 'down':
                toolbar.classList.add('bottom-4', 'left-1/2', 'transform', '-translate-x-1/2', 'max-w-[95vw]');
                break;
            case 'left':
                toolbar.classList.add('left-4', 'top-1/2', 'transform', '-translate-y-1/2');
                break;
            case 'right':
                toolbar.classList.add('right-4', 'top-1/2', 'transform', '-translate-y-1/2');
                break;
        }
    }

    applyToolbarSize() {
        const toolbar = document.getElementById('toolbar');
        const toolbarSize = this.urlParams.get('toolbarSize') || 'default';

        toolbar.classList.remove('toolbar-sm', 'toolbar-md', 'toolbar-lg');

        switch (toolbarSize) {
            case 'small':
                toolbar.classList.add('toolbar-sm');
                break;
            case 'large':
                toolbar.classList.add('toolbar-lg');
                break;
            default:
                toolbar.classList.add('toolbar-md');
        }
    }

    setupClearButtonPosition() {
        const clearBtn = document.getElementById('clearBtn');
        const position = this.ocrSettings.clearButtonPosition;

        // Remove all position classes
        clearBtn.classList.remove(
            'top-4', 'top-1/2', 'bottom-4',
            'left-4', 'left-1/2', 'right-4'
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

        // Apply horizontal positioning
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

    setupColorButtons() {
        const colorButtons = document.getElementById('colorButtons');
        colorButtons.innerHTML = '';

        this.availableColors.forEach((color, index) => {
            const btn = document.createElement('button');
            btn.className = 'w-8 h-8 rounded-lg border-2 border-border hover:scale-110 transition-transform flex-shrink-0';
            btn.style.backgroundColor = color;
            btn.onclick = () => this.selectColor(color, btn);

            if (index === 0) {
                btn.classList.add('ring-2', 'ring-primary');
                this.selectedColorButton = btn;
            }

            colorButtons.appendChild(btn);
        });
    }

    selectColor(color, button) {
        if (this.selectedColorButton) {
            this.selectedColorButton.classList.remove('ring-2', 'ring-primary');
        }

        button.classList.add('ring-2', 'ring-primary');
        this.selectedColorButton = button;
        this.currentColor = color;
    }

    setupToolButtons() {
        this.pencilBtn = document.getElementById('pencilBtn');
        this.eraserBtn = document.getElementById('eraserBtn');
        this.scanBtn = document.getElementById('scanBtn');

        this.pencilBtn.onclick = () => {
            this.currentTool = 'pencil';
            this.updateToolButtons();
        };

        this.eraserBtn.onclick = () => {
            this.currentTool = 'eraser';
            this.updateToolButtons();
        };

        this.scanBtn.onclick = () => this.performOCR();

        this.updateToolButtons();
    }

    updateToolButtons() {
        [this.pencilBtn, this.eraserBtn].forEach(btn => {
            btn.classList.remove('bg-primary', 'text-primary-foreground');
            btn.classList.add('bg-secondary', 'text-secondary-foreground');
        });

        if (this.currentTool === 'pencil') {
            this.pencilBtn.classList.add('bg-primary', 'text-primary-foreground');
        } else {
            this.eraserBtn.classList.add('bg-primary', 'text-primary-foreground');
        }
    }

    setupSliders() {
        // Size slider
        this.sizeSlider = document.getElementById('sizeSlider');
        this.sizeValue = document.getElementById('sizeValue');
        this.sizeSlider.value = this.currentSize;
        this.sizeValue.textContent = this.currentSize;

        this.sizeSlider.oninput = () => {
            this.currentSize = parseInt(this.sizeSlider.value);
            this.sizeValue.textContent = this.currentSize;
        };

        // Background controls
        this.setupBackgroundControls();
    }

    setupBackgroundControls() {
        // Background color
        this.bgColorPicker = document.getElementById('bgColorPicker');
        this.bgColorPicker.value = this.backgroundSettings.bgColor;
        this.bgColorPicker.oninput = () => {
            this.backgroundSettings.bgColor = this.bgColorPicker.value;
            this.drawBackgroundColor();
        };

        // Background opacity
        this.opacitySlider = document.getElementById('opacitySlider');
        this.opacityValue = document.getElementById('opacityValue');
        this.opacitySlider.value = (this.backgroundSettings.bgOpacity * 100).toString();
        this.opacityValue.textContent = `${Math.round(this.backgroundSettings.bgOpacity * 100)}%`;

        this.opacitySlider.oninput = () => {
            this.backgroundSettings.bgOpacity = parseInt(this.opacitySlider.value) / 100;
            this.opacityValue.textContent = `${this.opacitySlider.value}%`;
            this.drawBackgroundColor();
            this.loadBackgroundImage();
        };

        // Background image controls (only if image exists)
        if (this.urlParams.get('bgImage')) {
            this.setupBackgroundImageControls();
        }
    }

    setupBackgroundImageControls() {
        this.bgSizeSlider = document.getElementById('bgSizeSlider');
        this.bgSizeValue = document.getElementById('bgSizeValue');
        this.bgSizeSlider.value = this.backgroundSettings.bgImageSize.toString();
        this.bgSizeValue.textContent = `${this.backgroundSettings.bgImageSize}%`;

        this.bgSizeSlider.oninput = () => {
            this.backgroundSettings.bgImageSize = parseInt(this.bgSizeSlider.value);
            this.bgSizeValue.textContent = `${this.backgroundSettings.bgImageSize}%`;
            this.loadBackgroundImage();
        };

        // Position controls
        this.setupPositionControls();
    }

    setupPositionControls() {
        this.bgPosXSlider = document.getElementById('bgPosXSlider');
        this.bgPosXValue = document.getElementById('bgPosXValue');
        this.bgPosXSlider.value = this.backgroundSettings.bgImagePosition.x.toString();
        this.bgPosXValue.textContent = `${this.backgroundSettings.bgImagePosition.x}%`;

        this.bgPosXSlider.oninput = () => {
            this.backgroundSettings.bgImagePosition.x = parseInt(this.bgPosXSlider.value);
            this.bgPosXValue.textContent = `${this.backgroundSettings.bgImagePosition.x}%`;
            this.loadBackgroundImage();
        };

        this.bgPosYSlider = document.getElementById('bgPosYSlider');
        this.bgPosYValue = document.getElementById('bgPosYValue');
        this.bgPosYSlider.value = this.backgroundSettings.bgImagePosition.y.toString();
        this.bgPosYValue.textContent = `${this.backgroundSettings.bgImagePosition.y}%`;

        this.bgPosYSlider.oninput = () => {
            this.backgroundSettings.bgImagePosition.y = parseInt(this.bgPosYSlider.value);
            this.bgPosYValue.textContent = `${this.backgroundSettings.bgImagePosition.y}%`;
            this.loadBackgroundImage();
        };
    }

    setupGridControls() {
        this.gridToggle = document.getElementById('gridToggle');
        this.gridSizeSlider = document.getElementById('gridSize');
        this.gridSizeValue = document.getElementById('gridSizeValue');
        this.gridColorPicker = document.getElementById('gridColor');
        this.gridOpacitySlider = document.getElementById('gridOpacity');
        this.gridOpacityValue = document.getElementById('gridOpacityValue');
        this.gridStyleSelect = document.getElementById('gridStyle');

        // Initialize grid controls
        this.gridToggle.checked = this.gridSettings.gridEnabled;
        this.gridSizeSlider.value = this.gridSettings.gridCellSize.toString();
        this.gridSizeValue.textContent = this.gridSettings.gridCellSize.toString();
        this.gridColorPicker.value = this.gridSettings.gridColor;
        this.gridOpacitySlider.value = (this.gridSettings.gridOpacity * 100).toString();
        this.gridOpacityValue.textContent = `${Math.round(this.gridSettings.gridOpacity * 100)}%`;
        this.gridStyleSelect.value = this.gridSettings.gridStyle;

        // Grid event listeners
        this.gridToggle.onchange = () => {
            this.gridSettings.gridEnabled = this.gridToggle.checked;
            this.drawGrid();
        };

        this.gridSizeSlider.oninput = () => {
            this.gridSettings.gridCellSize = parseInt(this.gridSizeSlider.value);
            this.gridSizeValue.textContent = this.gridSettings.gridCellSize.toString();
            this.drawGrid();
        };

        this.gridColorPicker.oninput = () => {
            this.gridSettings.gridColor = this.gridColorPicker.value;
            this.drawGrid();
        };

        this.gridOpacitySlider.oninput = () => {
            this.gridSettings.gridOpacity = parseInt(this.gridOpacitySlider.value) / 100;
            this.gridOpacityValue.textContent = `${this.gridOpacitySlider.value}%`;
            this.drawGrid();
        };

        this.gridStyleSelect.onchange = () => {
            this.gridSettings.gridStyle = this.gridStyleSelect.value;
            this.drawGrid();
        };
    }

    setupClearButton() {
        this.clearBtn = document.getElementById('clearBtn');
        this.clearBtn.onclick = () => this.clearCanvas();
    }

    setupPopup() {
        this.popup = document.getElementById('popup');
        this.recognizedText = document.getElementById('recognizedText');
        this.correctAnswersSection = document.getElementById('correctAnswersSection');
        this.correctAnswersList = document.getElementById('correctAnswersList');
        this.tryAgainBtn = document.getElementById('tryAgainBtn');
        this.closePopupBtn = document.getElementById('closePopupBtn');

        this.tryAgainBtn.onclick = () => {
            this.clearCanvas();
            this.hidePopup();
        };

        this.closePopupBtn.onclick = () => this.hidePopup();

        // Hide popup buttons if configured
        if (this.ocrSettings.hidePopupButtons) {
            document.getElementById('buttonContainer').classList.add('hidden');
        }
    }

    setupEventListeners() {
        // Mouse events
        this.drawingCanvas.addEventListener('mousedown', (e) => this.startDrawing(e));
        this.drawingCanvas.addEventListener('mousemove', (e) => this.draw(e));
        this.drawingCanvas.addEventListener('mouseup', () => this.stopDrawing());
        this.drawingCanvas.addEventListener('mouseout', () => this.stopDrawing());

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
        });
    }

    // Drawing methods
    startDrawing(e) {
        const rect = this.drawingCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        this.isDrawing = true;
        this.lastX = x;
        this.lastY = y;
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

    stopDrawing() {
        this.isDrawing = false;
    }

    clearCanvas() {
        this.drawingCtx.clearRect(0, 0, this.drawingCanvas.width, this.drawingCanvas.height);
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

    // OCR Methods
    async performOCR() {
        try {
            // Get canvas data
            const canvasData = this.prepareCanvasForOCR();

            // Use Tesseract.js for OCR
            const result = await this.recognizeWithTesseract(canvasData);

            // Process and display results
            this.displayOCRResults(result);

        } catch (error) {
            console.error('OCR Error:', error);
            this.showError('OCR recognition failed. Please try again.');
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
            script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    displayOCRResults(result) {
        const recognizedText = result.data.text.trim();
        this.recognizedText.textContent = recognizedText || 'No text recognized';

        // Check against correct answers if provided
        if (this.ocrSettings.correctAnswersList.length > 0) {
            this.checkCorrectAnswers(recognizedText);
            this.correctAnswersSection.classList.remove('hidden');
        } else {
            this.correctAnswersSection.classList.add('hidden');
        }

        // Send results to parent window if in Vuplex
        this.sendResultsToParent(recognizedText, result);

        // Show popup unless configured to hide it
        if (!this.ocrSettings.hideResultsPopup) {
            this.showPopup();
        }
    }

    checkCorrectAnswers(recognizedText) {
        this.correctAnswersList.innerHTML = '';

        this.ocrSettings.correctAnswersList.forEach(answer => {
            const div = document.createElement('div');
            div.className = 'flex items-center gap-2';

            const isCorrect = this.compareText(recognizedText, answer);
            const icon = document.createElement('span');
            icon.className = isCorrect ? 'text-green-500' : 'text-red-500';
            icon.innerHTML = isCorrect ? '✓' : '✗';

            const text = document.createElement('span');
            text.className = 'text-foreground';
            text.textContent = answer;

            div.appendChild(icon);
            div.appendChild(text);
            this.correctAnswersList.appendChild(div);
        });
    }

    compareText(recognized, expected) {
        // Simple comparison - can be enhanced
        const cleanRecognized = recognized.toLowerCase().replace(/[^\w\s]/g, '');
        const cleanExpected = expected.toLowerCase().replace(/[^\w\s]/g, '');
        return cleanRecognized.includes(cleanExpected) ||
            cleanExpected.includes(cleanRecognized);
    }

    sendResultsToParent(recognizedText, ocrResult) {
        if (window.vuplex) {
            const sendData = {
                type: "NeuroExercises",
                activity: "OCR Drawing",
                dataNE: {
                    recognizedText: recognizedText,
                    confidence: ocrResult.data.confidence,
                    words: ocrResult.data.words,
                    correctAnswers: this.ocrSettings.correctAnswersList,
                    matches: this.checkAllAnswers(recognizedText),
                    timestamp: new Date().toISOString()
                }
            };
            window.vuplex.postMessage(JSON.stringify(sendData));
        }
    }

    checkAllAnswers(recognizedText) {
        return this.ocrSettings.correctAnswersList.map(answer => ({
            answer: answer,
            matches: this.compareText(recognizedText, answer)
        }));
    }

    showPopup() {
        this.popup.classList.remove('hidden');
    }

    hidePopup() {
        this.popup.classList.add('hidden');
    }

    showError(message) {
        this.recognizedText.textContent = message;
        this.recognizedText.className = 'text-red-500';
        this.correctAnswersSection.classList.add('hidden');
        this.showPopup();
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new OCRCanvasManager();
});