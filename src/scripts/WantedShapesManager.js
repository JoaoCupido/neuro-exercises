// WantedShapesManager.js
import { BackgroundSettings } from './BackgroundSettings.js';
import { GridSettings } from './GridSettings.js';

class WantedShapesManager {
    constructor() {
        this.urlParams = new URLSearchParams(window.location.search);

        // Load settings
        this.backgroundSettings = new BackgroundSettings(this.urlParams);
        this.gridSettings = new GridSettings(this.urlParams);
        this.loadGameSettings();

        this.init();
    }

    // Update the loadGameSettings method in WantedShapesManager.js
    loadGameSettings() {
        // Parse colors list from URL or use default
        const colorsParam = this.urlParams.get('colors');
        if (colorsParam) {
            try {
                this.availableColors = decodeURIComponent(colorsParam).split(',');
            } catch {
                this.availableColors = ['red', 'yellow', 'blue', 'green'];
            }
        } else {
            this.availableColors = ['red', 'yellow', 'blue', 'green'];
        }

        // Parse shapes list from URL or use default
        const shapesParam = this.urlParams.get('shapes');
        if (shapesParam) {
            try {
                this.availableShapes = decodeURIComponent(shapesParam).split(',');
            } catch {
                this.availableShapes = ['square', 'triangle', 'circle', 'star'];
            }
        } else {
            this.availableShapes = ['square', 'triangle', 'circle', 'star'];
        }

        // Game parameters from URL
        this.numShapes = parseInt(this.urlParams.get('numShapes')) || 20;
        this.targetCount = parseInt(this.urlParams.get('targetCount')) || null;
        this.shapeSize = parseInt(this.urlParams.get('shapeSize')) || 40;
        this.movementType = this.urlParams.get('movement') || 'linear';
        this.borderBehavior = this.urlParams.get('borderBehavior') || 'collision';
        this.targetCriteria = this.urlParams.get('target') || 'red%2520shapes';
        this.targetValidationError = this.validateTargetCriteria();

        // Animation settings
        this.speed = parseFloat(this.urlParams.get('speed')) || 1.00;
        this.swirlSpeed = parseFloat(this.urlParams.get('swirlSpeed')) || 0.02;
        this.bounceAmplitude = parseFloat(this.urlParams.get('bounceAmplitude')) || 50;
        this.bounceFrequency = parseFloat(this.urlParams.get('bounceFrequency')) || 0.005;

        // Display settings
        this.showTimer = this.urlParams.get('showTimer') !== 'false';
        this.hidePopupAll = this.urlParams.get('hidePopupAll') || false;

        // Parse target criteria
        this.parseTargetCriteria();
    }

    validateTargetCriteria() {
        const criteria = this.targetCriteria
            .replaceAll("%2520", "%20")
            .toLowerCase().trim();

        // Check for combination: "all [color] [shape]"
        if (criteria.includes('all')) {
            const parts = criteria.replaceAll(" ", "%20").split('%20');
            if (parts.length >= 3) {
                const color = parts[1];
                const shape = parts[2];
                if (!this.availableColors.includes(color)) {
                    return `Color "${color}" is not available. Available colors: ${this.availableColors.join(', ')}`;
                }
                if (!this.availableShapes.includes(shape)) {
                    return `Shape "${shape}" is not available. Available shapes: ${this.availableShapes.join(', ')}`;
                }
            }
        }
        // Check for color target: "[color] shapes"
        else if (criteria.endsWith('shapes')) {
            const color = criteria
                .replace('%20shapes', '')
                .replace(' shapes', '');
            if (!this.availableColors.includes(color)) {
                return `Color "${color}" is not available. Available colors: ${this.availableColors.join(', ')}`;
            }
        }
        // Check for shape target: "[shape]s"
        else if (criteria.endsWith('s')) {
            const shape = criteria.slice(0, -1);
            if (!this.availableShapes.includes(shape)) {
                return `Shape "${shape}" is not available. Available shapes: ${this.availableShapes.join(', ')}`;
            }
        }

        return null; // No error
    }

    parseTargetCriteria() {
        this.targetType = 'shape'; // 'shape', 'color', 'combination'
        this.targetShape = null;
        this.targetColor = null;

        const criteria = this.targetCriteria
            .replaceAll("%2520", "%20")
            .toLowerCase().trim();

        // Check for combination first (contains "all")
        if (criteria.includes('all')) {
            this.targetType = 'combination';
            // Extract color and shape from "all [color] [shape]"
            const parts = criteria.replaceAll(" ", "%20").split('%20');
            if (parts.length >= 3) {
                this.targetColor = parts[1];
                this.targetShape = parts[2];
            }
        }
        // Check for color-based targets (ends with "shapes")
        else if (criteria.endsWith('shapes')) {
            this.targetType = 'color';
            const colorMatch = criteria.match(/^(\w+)(?: |%20)shapes$/);
            if (colorMatch) {
                this.targetColor = colorMatch[1];
            }
        }
        // Check for shape-based targets (ends with "s" and is a shape)
        else if (criteria.endsWith('s')) {
            this.targetType = 'shape';
            const shapeMatch = criteria.match(/^(\w+)s$/);
            if (shapeMatch) {
                this.targetShape = shapeMatch[1];
            }
        }

        // Update display
        this.updateTargetDisplay();
    }

    updateTargetDisplay() {
        const targetInfo = document.getElementById('targetInfo');
        const targetDisplay = document.getElementById('targetDisplay');
        if (!targetInfo || !targetDisplay) return;

        let html = '';

        switch (this.targetType) {

            case 'color':
                targetDisplay.style.backgroundColor = this.getColorValue(this.targetColor);
                targetDisplay.style.color = '';

                html = `
                    <span class="flex items-center gap-2">
                        ${this.getShapeIcon("circle", this.targetColor)}
                    </span>
                `;
                break;

            case 'shape':
                targetDisplay.style.backgroundColor = '';
                targetDisplay.style.color = '';

                html = `
                    <span class="flex items-center gap-2">
                        ${this.getShapeIcon(this.targetShape, "mono")}
                    </span>
                `;
                break;

            case 'combination':
                targetDisplay.style.backgroundColor = '';
                targetDisplay.style.color = '';

                html = `
                    <span class="flex items-center gap-2">
                        ${this.getShapeIcon(this.targetShape, this.targetColor)}
                    </span>
                `;
                break;

            default:
                html = this.targetCriteria;
        }

        targetInfo.innerHTML = html;
    }

    getShapeIcon(shape, mode = 'mono') {
        const iconMap = {
            square: 'square',
            rectangle: 'rectangle-horizontal',
            circle: 'circle',
            triangle: 'triangle',
            cross: 'cross',
            heart: 'heart',
            star: 'star',
            pentagon: 'pentagon',
            hexagon: 'hexagon',
            diamond: 'diamond'
        };

        const icon = iconMap[shape] || shape;

        // 🎯 single color mode (combination case)
        const color = this.getColorValue(mode);

        return `
        <span style="color: ${color};">
            <i data-lucide="${icon}" style="
                width: 28px;
                height: 28px;
                fill: currentColor;
                stroke: currentColor;
            "></i>
        </span>
    `;
    }

    init() {
        this.setupState();
        this.setupCanvas();

        if (this.targetValidationError) {
            this.showErrorPopup();
            return;
        }

        this.setupUI();
        this.setupEventListeners();
        this.startGame();
    }

    showErrorPopup() {
        const errorMessage = document.getElementById('errorMessage');
        const errorPopup = document.getElementById('errorPopup');
        if (errorMessage && errorPopup) {
            errorMessage.textContent = this.targetValidationError;
            errorPopup.classList.remove('hidden');
        }
    }

    setupCanvas() {
        this.canvas = document.getElementById('shapesCanvas');
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
        this.shapes = [];
        this.foundShapes = [];
        this.targetFoundCount = 0;
        this.totalTargets = 0;
        this.wrongClicks = 0;
        this.startTime = null;
        this.popupTimer = 0;
        this.timerInterval = null;
        this.animationId = null;
        this.timeOffset = 0;
    }

    setupUI() {
        this.timerElement = document.getElementById('timer');
        this.popup = document.getElementById('popup');
        this.popupTimerElement = document.getElementById('popupTimer');
        this.popupFoundElement = document.getElementById('popupFound');
        this.popupWrongElement = document.getElementById('popupWrong');
        this.restartButton = document.getElementById('restartButton');

        if (!this.showTimer) {
            this.timerElement.style.display = 'none';
        }

        this.restartButton.addEventListener('click', () => this.startGame());
    }

    setupEventListeners() {
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
    }

    resizeCanvas() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;

        if (this.bgColorCanvas) {
            this.bgColorCanvas.width = container.clientWidth;
            this.bgColorCanvas.height = container.clientHeight;
            this.drawBackgroundColor();
        }

        if (this.bgImageCanvas) {
            this.bgImageCanvas.width = container.clientWidth;
            this.bgImageCanvas.height = container.clientHeight;
            if (this.backgroundSettings.bgImage) {
                this.loadBackgroundImage();
            }
        }

        if (this.gridCanvas) {
            this.gridCanvas.width = container.clientWidth;
            this.gridCanvas.height = container.clientHeight;
            this.drawGrid();
        }

        if (this.shapes.length > 0) {
            this.initializeShapes();
        }
    }

    drawBackgroundColor() {
        if (!this.bgColorCtx) return;

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
        if (!this.bgImageCtx || !this.backgroundSettings.bgImage) return;

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            this.bgImageCtx.clearRect(0, 0, this.bgImageCanvas.width, this.bgImageCanvas.height);
            this.bgImageCtx.globalAlpha = this.backgroundSettings.bgOpacity;

            const scale = Math.max(
                this.bgImageCanvas.width / img.width,
                this.bgImageCanvas.height / img.height
            ) * (this.backgroundSettings.bgImageSize / 100);

            const x = (this.bgImageCanvas.width - img.width * scale) * (this.backgroundSettings.bgImagePosition.x / 100);
            const y = (this.bgImageCanvas.height - img.height * scale) * (this.backgroundSettings.bgImagePosition.y / 100);

            this.bgImageCtx.drawImage(img, x, y, img.width * scale, img.height * scale);
            this.bgImageCtx.globalAlpha = 1;
        };
        img.src = this.backgroundSettings.bgImage;
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

    initializeShapes() {
        this.shapes = [];
        this.foundShapes = [];
        this.targetFoundCount = 0;
        this.totalTargets = 0;

        // If targetCount is specified, we'll generate exactly that many target shapes
        if (this.targetCount !== null && this.targetCount > 0) {
            // First, create the exact number of target shapes
            for (let i = 0; i < this.targetCount; i++) {
                const shape = this.createShapeWithTargetCriteria();
                this.shapes.push(shape);
                this.totalTargets++;
            }

            // Then fill the remaining shapes with non-target shapes
            const remainingShapes = Math.max(0, this.numShapes - this.targetCount);
            for (let i = 0; i < remainingShapes; i++) {
                let shape;
                do {
                    shape = this.createRandomShape();
                } while (this.isTarget(shape)); // Ensure it's NOT a target
                this.shapes.push(shape);
            }

            // Shuffle the array to mix targets and non-targets
            this.shapes = this.shuffleArray(this.shapes);
        } else {
            // Original behavior: generate random shapes and count targets naturally
            for (let i = 0; i < this.numShapes; i++) {
                const shape = this.createRandomShape();
                this.shapes.push(shape);

                // Count targets
                if (this.isTarget(shape)) {
                    this.totalTargets++;
                }
            }

            // Ensure at least one target exists
            if (this.totalTargets === 0 && this.numShapes > 0) {
                const firstShape = this.shapes[0];
                if (this.targetType === 'color') {
                    if (this.availableColors.includes(this.targetColor)) {
                        firstShape.color = this.targetColor;
                    } else {
                        firstShape.color = this.availableColors[0];
                    }
                } else if (this.targetType === 'shape') {
                    if (this.availableShapes.includes(this.targetShape)) {
                        firstShape.type = this.targetShape;
                    } else {
                        firstShape.type = this.availableShapes[0];
                    }
                } else if (this.targetType === 'combination') {
                    if (this.availableColors.includes(this.targetColor)) {
                        firstShape.color = this.targetColor;
                    } else {
                        firstShape.color = this.availableColors[0];
                    }
                    if (this.availableShapes.includes(this.targetShape)) {
                        firstShape.type = this.targetShape;
                    } else {
                        firstShape.type = this.availableShapes[0];
                    }
                }
                this.totalTargets = 1;
            }
        }
    }

// Add these two new helper methods
    createRandomShape() {
        return {
            id: Math.random(),
            type: this.availableShapes[Math.floor(Math.random() * this.availableShapes.length)],
            color: this.availableColors[Math.floor(Math.random() * this.availableColors.length)],
            x: Math.random() * (this.canvas.width - 100) + 50,
            y: Math.random() * (this.canvas.height - 100) + 50,
            vx: (Math.random() - 0.5) * 4 * this.speed,
            vy: (Math.random() - 0.5) * 4 * this.speed,
            angle: Math.random() * Math.PI * 2,
            swirlRadius: Math.random() * 100 + 50,
            bouncePhase: Math.random() * Math.PI * 2,
            found: false
        };
    }

    createShapeWithTargetCriteria() {
        const shape = {
            id: Math.random(),
            type: null,
            color: null,
            x: Math.random() * (this.canvas.width - 100) + 50,
            y: Math.random() * (this.canvas.height - 100) + 50,
            vx: (Math.random() - 0.5) * 4 * this.speed,
            vy: (Math.random() - 0.5) * 4 * this.speed,
            angle: Math.random() * Math.PI * 2,
            swirlRadius: Math.random() * 100 + 50,
            bouncePhase: Math.random() * Math.PI * 2,
            found: false
        };

        // Set properties based on target type
        switch(this.targetType) {
            case 'color':
                shape.type = this.availableShapes[Math.floor(Math.random() * this.availableShapes.length)];
                shape.color = this.targetColor;
                break;
            case 'shape':
                shape.type = this.targetShape;
                shape.color = this.availableColors[Math.floor(Math.random() * this.availableColors.length)];
                break;
            case 'combination':
                shape.type = this.targetShape;
                shape.color = this.targetColor;
                break;
            default:
                shape.type = this.availableShapes[0];
                shape.color = this.availableColors[0];
        }

        return shape;
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    isTarget(shape) {
        switch(this.targetType) {
            case 'color':
                return shape.color === this.targetColor;
            case 'shape':
                return shape.type === this.targetShape;
            case 'combination':
                return shape.type === this.targetShape && shape.color === this.targetColor;
            default:
                return false;
        }
    }

    updateShapePositions() {
        const now = Date.now();
        this.timeOffset = now;

        for (const shape of this.shapes) {
            if (shape.found) continue;

            switch(this.movementType) {
                case 'linear':
                    shape.x += shape.vx;
                    shape.y += shape.vy;
                    break;

                case 'swirly':
                    shape.angle += this.swirlSpeed * this.speed;
                    shape.x += Math.cos(shape.angle) * this.speed;
                    shape.y += Math.sin(shape.angle) * this.speed;
                    break;

                case 'bouncy':
                    shape.y += Math.sin(now * this.bounceFrequency + shape.bouncePhase) * this.bounceAmplitude * 0.01 * this.speed;
                    shape.x += shape.vx;
                    break;

                case 'wavy':
                    shape.x += shape.vx;
                    shape.y += Math.sin(now * 0.005 + shape.x * 0.01) * 2 * this.speed;
                    break;

                case 'spiral':
                    shape.angle += 0.05 * this.speed;
                    shape.x += Math.cos(shape.angle) * this.speed;
                    shape.y += Math.sin(shape.angle) * this.speed;
                    shape.swirlRadius *= 0.995;
                    break;

                case 'random':
                    shape.vx += (Math.random() - 0.5) * 0.2;
                    shape.vy += (Math.random() - 0.5) * 0.2;
                    const maxSpeed = 5;
                    shape.vx = Math.min(maxSpeed, Math.max(-maxSpeed, shape.vx));
                    shape.vy = Math.min(maxSpeed, Math.max(-maxSpeed, shape.vy));
                    shape.x += shape.vx;
                    shape.y += shape.vy;
                    break;
            }

            // Apply border behavior
            this.applyBorderBehavior(shape);
        }
    }

    applyBorderBehavior(shape) {
        const margin = this.shapeSize;

        switch(this.borderBehavior) {
            case 'wrap':
                if (shape.x + margin < 0) shape.x = this.canvas.width + margin;
                if (shape.x - margin > this.canvas.width) shape.x = -margin;
                if (shape.y + margin < 0) shape.y = this.canvas.height + margin;
                if (shape.y - margin > this.canvas.height) shape.y = -margin;
                break;

            case 'collision':
            default:
                if (shape.x - margin < 0) {
                    shape.x = margin;
                    shape.vx = Math.abs(shape.vx);
                }
                if (shape.x + margin > this.canvas.width) {
                    shape.x = this.canvas.width - margin;
                    shape.vx = -Math.abs(shape.vx);
                }
                if (shape.y - margin < 0) {
                    shape.y = margin;
                    shape.vy = Math.abs(shape.vy);
                }
                if (shape.y + margin > this.canvas.height) {
                    shape.y = this.canvas.height - margin;
                    shape.vy = -Math.abs(shape.vy);
                }
                break;
        }
    }

    // Add this color mapping function to the WantedShapesManager class
    getColorValue(colorName) {
        const colorMap = {
            'red': '#ff0000',
            'yellow': '#ffff00',
            'blue': '#0000ff',
            'green': '#00ff00',
            'white': '#ffffff',
            'black': '#000000',
            'purple': '#800080',
            'pink': '#ffc0cb',
            'orange': '#ffa500',
            'brown': '#8b4513',      // Saddle brown - warm, recognizable brown
            'transparent': 'transparent',
        };

        return colorMap[colorName.toLowerCase()] || '#808080';
    }

    // Update the drawShape method to use the color mapping
    drawShape(shape) {
        const x = shape.x;
        const y = shape.y;
        const size = this.shapeSize;

        this.ctx.save();
        this.ctx.shadowBlur = 0;

        // Get the actual color value
        const fillColor = this.getColorValue(shape.color);
        this.ctx.fillStyle = fillColor;

        this.ctx.strokeStyle = fillColor;
        this.ctx.lineWidth = 2;

        // Draw shape based on type
        switch(shape.type) {
            case 'square':
                this.ctx.fillRect(x - size/2, y - size/2, size, size);
                this.ctx.strokeRect(x - size/2, y - size/2, size, size);
                break;

            case 'triangle':
                this.ctx.beginPath();
                this.ctx.moveTo(x, y - size/2);
                this.ctx.lineTo(x + size/2, y + size/2);
                this.ctx.lineTo(x - size/2, y + size/2);
                this.ctx.closePath();
                this.ctx.fill();
                this.ctx.stroke();
                break;

            case 'circle':
                this.ctx.beginPath();
                this.ctx.arc(x, y, size/2, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.stroke();
                break;

            case 'rectangle':
                this.ctx.fillRect(x - size/1.5, y - size/2, size * 1.5, size * 0.8);
                this.ctx.strokeRect(x - size/1.5, y - size/2, size * 1.5, size * 0.8);
                break;

            case 'star':
                this.drawStar(x, y, 5, size/2, size/4);
                this.ctx.fill();
                this.ctx.stroke();
                break;

            case 'pentagon':
                this.drawPolygon(x, y, 5, size/2);
                this.ctx.fill();
                this.ctx.stroke();
                break;

            case 'hexagon':
                this.drawPolygon(x, y, 6, size/2);
                this.ctx.fill();
                this.ctx.stroke();
                break;

            case 'diamond':
                this.drawDiamond(x, y, size);
                this.ctx.fill();
                this.ctx.stroke();
                break;

            case 'heart':
                this.drawHeart(x, y, size);
                this.ctx.fill();
                this.ctx.stroke();
                break;

            case 'cross':
                this.drawCross(x, y, size);
                this.ctx.fill();
                this.ctx.stroke();
                break;
        }

        this.ctx.restore();
    }

    drawStar(cx, cy, spikes, outerR, innerR) {
        let rot = Math.PI / 2 * 3;
        const step = Math.PI / spikes;
        this.ctx.beginPath();

        for (let i = 0; i < spikes; i++) {
            const x1 = cx + Math.cos(rot) * outerR;
            const y1 = cy + Math.sin(rot) * outerR;
            this.ctx.lineTo(x1, y1);
            rot += step;

            const x2 = cx + Math.cos(rot) * innerR;
            const y2 = cy + Math.sin(rot) * innerR;
            this.ctx.lineTo(x2, y2);
            rot += step;
        }

        this.ctx.closePath();
    }

    drawPolygon(cx, cy, sides, radius) {
        const angle = (Math.PI * 2) / sides;
        this.ctx.beginPath();

        for (let i = 0; i <= sides; i++) {
            const x = cx + radius * Math.cos(i * angle - Math.PI / 2);
            const y = cy + radius * Math.sin(i * angle - Math.PI / 2);
            if (i === 0) this.ctx.moveTo(x, y);
            else this.ctx.lineTo(x, y);
        }

        this.ctx.closePath();
    }

    drawDiamond(x, y, size) {
        this.ctx.beginPath();
        this.ctx.moveTo(x, y - size / 2); // Top point
        this.ctx.lineTo(x + size / 2, y); // Right point
        this.ctx.lineTo(x, y + size / 2); // Bottom point
        this.ctx.lineTo(x - size / 2, y); // Left point
        this.ctx.closePath();
    }

    drawHeart(x, y, size) {
        this.ctx.beginPath();
        const scale = size / 50; // Scale to fit size parameter

        // Heart shape using bezier curves
        this.ctx.moveTo(x, y - 15 * scale);
        this.ctx.bezierCurveTo(x - 20 * scale, y - 35 * scale,
            x - 40 * scale, y - 10 * scale,
            x, y + 25 * scale);
        this.ctx.bezierCurveTo(x + 40 * scale, y - 10 * scale,
            x + 20 * scale, y - 35 * scale,
            x, y - 15 * scale);
        this.ctx.closePath();
    }

    drawCross(x, y, size) {
        const s = size / 2;
        const arm = s / 2.5; // arm thickness
        this.ctx.beginPath();
        this.ctx.moveTo(x - arm, y - s);
        this.ctx.lineTo(x + arm, y - s);
        this.ctx.lineTo(x + arm, y - arm);
        this.ctx.lineTo(x + s, y - arm);
        this.ctx.lineTo(x + s, y + arm);
        this.ctx.lineTo(x + arm, y + arm);
        this.ctx.lineTo(x + arm, y + s);
        this.ctx.lineTo(x - arm, y + s);
        this.ctx.lineTo(x - arm, y + arm);
        this.ctx.lineTo(x - s, y + arm);
        this.ctx.lineTo(x - s, y - arm);
        this.ctx.lineTo(x - arm, y - arm);
        this.ctx.closePath();
    }

    draw() {
        if (!this.ctx) return;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        for (const shape of this.shapes) {
            if (!shape.found) {
                this.drawShape(shape);
            }
        }
    }

    animate() {
        if (!this.startTime) return;

        this.updateShapePositions();
        this.draw();

        this.animationId = requestAnimationFrame(() => this.animate());
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
        if (this.hidePopupAll) return;

        this.popupTimerElement.textContent = `Time: ${this.popupTimer.toFixed(2)}s`;
        this.popupFoundElement.textContent = `Found: ${this.targetFoundCount} / ${this.totalTargets}`;
        this.popupWrongElement.textContent = `Wrong clicks: ${this.wrongClicks}`;
        this.popup.classList.remove('hidden');
    }

    hidePopup() {
        this.popup.classList.add('hidden');
    }

    startGame() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }

        this.stopTimer();
        this.hidePopup();

        this.setupState();
        this.initializeShapes();

        this.draw();

        this.startTimer();
        this.animate();
    }

    handleClick(event) {
        if (!this.startTime) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        // Check from back to front (topmost first)
        for (let i = this.shapes.length - 1; i >= 0; i--) {
            const shape = this.shapes[i];
            if (shape.found) continue;

            // Simple distance-based hit detection
            const dx = x - shape.x;
            const dy = y - shape.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance <= this.shapeSize) {
                if (this.isTarget(shape) && !shape.found) {
                    // Correct click
                    shape.found = true;
                    this.foundShapes.push(shape);
                    this.targetFoundCount++;

                    this.draw();

                    // Check if game is complete
                    if (this.targetFoundCount >= this.totalTargets) {
                        this.endGame();
                    }
                } else {
                    // Wrong click
                    this.wrongClicks++;

                    // Flash red effect could be added here
                    const originalFill = this.ctx.fillStyle;
                    this.ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
                    this.ctx.fillRect(x - 20, y - 20, 40, 40);
                    setTimeout(() => {
                        this.ctx.fillStyle = originalFill;
                    }, 100);
                }
                break;
            }
        }
    }

    endGame() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }

        this.stopTimer();
        this.draw();
        this.showPopup();
    }
}

function startManager() {
    new WantedShapesManager();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startManager);
} else {
    startManager();
}