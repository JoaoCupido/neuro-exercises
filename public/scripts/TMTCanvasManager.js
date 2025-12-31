import { TMTSettings } from './TMTSettings.js';
import { BackgroundSettings } from './BackgroundSettings.js';
import { GridSettings } from './GridSettings.js';

class TMTCanvasManager {
    constructor() {
        this.urlParams = new URLSearchParams(window.location.search);

        // Load settings
        this.tmtSettings = new TMTSettings(this.urlParams);
        this.backgroundSettings = new BackgroundSettings(this.urlParams);
        this.gridSettings = new GridSettings(this.urlParams);

        this.init();
    }

    init() {
        this.setupState();
        this.setupCanvas();
        this.setupUI();
        this.setupEventListeners();
        this.startTest();
    }

    setupCanvas() {
        this.canvas = document.getElementById('trailCanvas');
        this.bgColorCanvas = document.getElementById('bgColorCanvas');
        this.bgImageCanvas = document.getElementById('bgImageCanvas');
        this.gridCanvas = document.getElementById('gridCanvas');

        this.ctx = this.canvas.getContext('2d');
        this.bgColorCtx = this.bgColorCanvas?.getContext('2d');
        this.bgImageCtx = this.bgImageCanvas?.getContext('2d');
        this.gridCtx = this.gridCanvas?.getContext('2d');

        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    setupState() {
        this.currentIndex = 0;
        this.selectedItemsMeta = [];
        this.errors = 0;
        this.startTime = null;
        this.popupTimer = 0;
        this.timerInterval = null;
        this.items = {};
        this.completeLog = [];

        // Generate trail data
        this.trailData = this.generateTrailData();
    }

    generateTrailData() {
        const numbers = Array.from({ length: Math.ceil(this.tmtSettings.trailLength/2) }, (_, i) => i + 1);
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.slice(0, Math.floor(this.tmtSettings.trailLength/2)).split('');

        let data;
        switch(this.tmtSettings.symbolType) {
            case 'numbers':
                data = Array.from({ length: this.tmtSettings.trailLength }, (_, i) => i + 1);
                break;
            case 'letters':
                data = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.slice(0, this.tmtSettings.trailLength).split('');
                break;
            case 'numbers-letters':
                data = numbers.flatMap((num, i) => [num, letters[i]]).slice(0, this.tmtSettings.trailLength);
                break;
            case 'letters-numbers':
                data = letters.flatMap((letter, i) => [letter, numbers[i]]).slice(0, this.tmtSettings.trailLength);
                break;
            default:
                data = Array.from({ length: this.tmtSettings.trailLength }, (_, i) => i + 1);
        }

        // Apply reverse order if needed
        if (this.tmtSettings.reverseOrder) {
            data.reverse();
        }

        return data;
    }

    setupUI() {
        this.timerElement = document.getElementById('timer');
        this.popup = document.getElementById('popup');
        this.popupTimerElement = document.getElementById('popupTimer');
        this.popupErrorsElement = document.getElementById('popupErrors');
        this.restartButton = document.getElementById('restartButton');

        // Show/hide timer based on settings
        if (!this.tmtSettings.showTimer) {
            this.timerElement.style.display = 'none';
        }

        // Setup restart button
        this.restartButton.addEventListener('click', () => this.startTest());
    }

    setupEventListeners() {
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
    }

    resizeCanvas() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;

        // Resize background canvases if they exist
        if (this.bgColorCanvas) {
            this.bgColorCanvas.width = container.clientWidth;
            this.bgColorCanvas.height = container.clientHeight;
            this.drawBackgroundColor();
        }

        if (this.bgImageCanvas) {
            this.bgImageCanvas.width = container.clientWidth;
            this.bgImageCanvas.height = container.clientHeight;
            this.loadBackgroundImage();
        }

        if (this.gridCanvas) {
            this.gridCanvas.width = container.clientWidth;
            this.gridCanvas.height = container.clientHeight;
            this.drawGrid();
        }

        this.drawItems();
    }

    drawBackgroundColor() {
        if (!this.bgColorCtx) return;
        this.bgColorCtx.fillStyle = this.backgroundSettings.bgColor;
        this.bgColorCtx.fillRect(0, 0, this.bgColorCanvas.width, this.bgColorCanvas.height);
    }

    loadBackgroundImage() {
        if (!this.bgImageCtx || !this.backgroundSettings.bgImage) return;

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
        img.src = this.backgroundSettings.bgImage;
    }

    processColoringBookImage(img) {
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
        if (!this.gridCtx || !this.gridSettings.gridEnabled) return;

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
        const dashLength = 4;
        const gapLength = 4;
        this.gridCtx.setLineDash([dashLength, gapLength]);

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

    findSelectionMeta(itemId) {
        return this.selectedItemsMeta.find(m => m.id === itemId) || null;
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    checkOverlap(x, y, items) {
        for (let item in items) {
            const itemX = items[item].x;
            const itemY = items[item].y;
            const distance = Math.sqrt((x - itemX) ** 2 + (y - itemY) ** 2);
            if (distance < this.tmtSettings.numberRadius * 2.5) {
                return true;
            }
        }
        return false;
    }

    generateRandomPosition(items) {
        let x, y;
        let attempts = 0;
        const maxAttempts = 100;

        do {
            x = Math.floor(Math.random() * (this.canvas.width - 2 * this.tmtSettings.numberRadius)) + this.tmtSettings.numberRadius;
            y = Math.floor(Math.random() * (this.canvas.height - 2 * this.tmtSettings.numberRadius)) + this.tmtSettings.numberRadius;
            attempts++;
            if (attempts > maxAttempts) {
                break;
            }
        } while (this.checkOverlap(x, y, items));

        return { x, y };
    }

    initializeItems() {
        this.items = {};
        const shuffledData = [...this.trailData];

        // Only shuffle if we don't have custom positions
        if (!this.tmtSettings.customPositions) {
            this.shuffleArray(shuffledData);
        }

        for (let i = 0; i < shuffledData.length; i++) {
            let x, y;

            if (this.tmtSettings.customPositions && i < this.tmtSettings.customPositions.length) {
                // Use custom position
                const customPos = this.tmtSettings.customPositions[i];
                x = (customPos.x / 100) * this.canvas.width;
                y = (customPos.y / 100) * this.canvas.height;
            } else {
                // Generate random position
                const pos = this.generateRandomPosition(this.items);
                x = pos.x;
                y = pos.y;
            }

            this.items[shuffledData[i]] = { x, y };
        }

        this.drawItems();
    }

    createLine(x1, y1, x2, y2) {
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.strokeStyle = '#3b82f6';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();
        this.ctx.closePath();
    }

    createErrorLine(x1, y1, x2, y2) {
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.strokeStyle = '#ef4444';
        this.ctx.lineWidth = 3;
        this.ctx.setLineDash([5, 5]);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        this.ctx.closePath();
    }

    createItem(x, y, item) {
        const meta = this.findSelectionMeta(item);
        const isSelected = !!meta;

        // Draw circle
        this.ctx.beginPath();
        this.ctx.arc(x, y, this.tmtSettings.numberRadius, 0, Math.PI * 2);
        this.ctx.fillStyle = isSelected ? '#6b7280' : '#ffffff';
        this.ctx.fill();
        this.ctx.strokeStyle = isSelected ? '#4b5563' : '#374151';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        this.ctx.closePath();

        // Draw text
        this.ctx.font = 'bold 18px Arial';
        this.ctx.fillStyle = isSelected ? '#ffffff' : '#1f2937';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(item, x, y);
    }

    createErrorItem(x, y, item) {
        // Draw circle with error color
        this.ctx.beginPath();
        this.ctx.arc(x, y, this.tmtSettings.numberRadius, 0, Math.PI * 2);
        this.ctx.fillStyle = '#fecaca';
        this.ctx.fill();
        this.ctx.strokeStyle = '#dc2626';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        this.ctx.closePath();

        // Draw text
        this.ctx.font = 'bold 18px Arial';
        this.ctx.fillStyle = '#dc2626';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(item, x, y);
    }

    drawAllConnections() {
        for (let i = 1; i < this.selectedItemsMeta.length; i++) {
            const prevMeta = this.selectedItemsMeta[i - 1];
            const currMeta = this.selectedItemsMeta[i];
            if (!prevMeta || !currMeta) continue;
            const prevItem = prevMeta.id;
            const currentItem = currMeta.id;

            if (!this.items[prevItem] || !this.items[currentItem]) continue;

            if (currMeta.isError && this.tmtSettings.showWrongSelections) {
                this.createErrorLine(this.items[prevItem].x, this.items[prevItem].y, this.items[currentItem].x, this.items[currentItem].y);
            } else {
                this.createLine(this.items[prevItem].x, this.items[prevItem].y, this.items[currentItem].x, this.items[currentItem].y);
            }
        }
    }

    drawItems() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Always draw lines first if they should be under dots
        if (this.tmtSettings.linesUnderDots) {
            this.drawAllConnections();
        }

        for (let item in this.items) {
            const meta = this.findSelectionMeta(item);
            if (meta && meta.isError && this.tmtSettings.showWrongSelections) {
                this.createErrorItem(this.items[item].x, this.items[item].y, item);
            } else {
                this.createItem(this.items[item].x, this.items[item].y, item);
            }
        }

        // Draw lines last if they should be over dots
        if (!this.tmtSettings.linesUnderDots) {
            this.drawAllConnections();
        }
    }

    updateTimer() {
        const currentTime = new Date();
        const timeInSeconds = (currentTime - this.startTime) / 1000;
        this.timerElement.textContent = `${timeInSeconds.toFixed(2)}`;
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

    showPopup() {
        if (this.tmtSettings.hidePopupAll) return;

        // Update results if not hidden
        if (!this.tmtSettings.hidePopupResults) {
            this.popupTimerElement.textContent = `Time: ${this.popupTimer.toFixed(2)}s`;
            this.popupErrorsElement.textContent = `Errors: ${this.errors}`;
            this.popupTimerElement.classList.remove('hidden');
            this.popupErrorsElement.classList.remove('hidden');
        } else {
            this.popupTimerElement.classList.add('hidden');
            this.popupErrorsElement.classList.add('hidden');
        }

        // Hide buttons if configured
        const buttonContainer = this.popup.querySelector('.flex.gap-4');
        if (this.tmtSettings.hidePopupButtons && buttonContainer) {
            buttonContainer.classList.add('hidden');
        }

        this.popup.classList.remove('hidden');
    }

    hidePopup() {
        this.popup.classList.add('hidden');
    }

    getNextExpectedItem() {
        return this.trailData[this.currentIndex];
    }

    startTest() {
        this.currentIndex = 0;
        this.selectedItemsMeta = [];
        this.errors = 0;
        this.popupTimer = 0;
        this.timerElement.textContent = '0';
        this.hidePopup();

        this.initializeItems();
        this.startTimer();
    }

    endTest() {
        this.stopTimer();
        this.showPopup();

        this.pushLogEntry({
            state: "FINISHED",
            item: "-",
            positionInTime: this.popupTimer
        });
    }

    pushLogEntry(logEntry) {
        this.completeLog.push(logEntry);

        if (window.vuplex) {
            const sendData = {
                type: "NeuroExercises",
                activity: "TMT",
                dataNE: {
                    log: logEntry,
                    time: parseFloat(this.popupTimer.toFixed(2)),
                    errors: this.errors,
                }
            };
            window.vuplex.postMessage(JSON.stringify(sendData));
        } else {
            console.log("VUPLEX bridge not available", logEntry);
        }
    }

    handleClick(event) {
        if (!this.startTime) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        for (let item in this.items) {
            const itemX = this.items[item].x;
            const itemY = this.items[item].y;
            const distance = Math.sqrt((x - itemX) ** 2 + (y - itemY) ** 2);

            if (distance <= this.tmtSettings.numberRadius) {
                const expectedItem = this.getNextExpectedItem().toString();

                // ignore taps on already selected item
                if (this.findSelectionMeta(item)) {
                    break;
                }

                if (item === expectedItem) {
                    // Correct selection
                    this.selectedItemsMeta.push({ id: item, isError: false });

                    this.pushLogEntry({
                        state: "CORRECT",
                        item: item,
                        positionInTime: this.popupTimer
                    });

                    this.currentIndex++;
                    this.drawItems();
                    if (this.currentIndex >= this.trailData.length) {
                        this.endTest();
                    }
                } else {
                    // Wrong selection
                    this.pushLogEntry({
                        state: "WRONG",
                        item: item,
                        positionInTime: this.popupTimer
                    });

                    this.errors++;

                    if (this.tmtSettings.allowWrongSelections) {
                        // Add wrong item to selection (flagged as error)
                        this.selectedItemsMeta.push({ id: item, isError: true });

                        this.currentIndex++;
                        this.drawItems();
                        if (this.currentIndex >= this.trailData.length) {
                            this.endTest();
                        }
                    }
                }

                break;
            }
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TMTCanvasManager();
});