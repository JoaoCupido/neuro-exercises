class CameraCanvasManager {
    constructor() {
        this.urlParams = new URLSearchParams(window.location.search);
        this.video = document.getElementById('cameraFeed');
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.predictionDisplay = document.getElementById('predictionDisplay');
        this.predictionList = document.getElementById('predictionList');

        this.gamemode = this.urlParams.get('gamemode') || 'detectObject';
        this.cameraFacing = this.urlParams.get('cameraFacing') || 'user';
        this.debug = this.urlParams.get('debug') === 'true';
        this.sensitivity = parseFloat(this.urlParams.get('sensitivity')) || 0.6;

        // Add new positioning parameters with defaults
        this.displayPositioning = {
            horizontal: this.urlParams.get('displayHorizontal') || 'right', // left, center, right
            vertical: this.urlParams.get('displayVertical') || 'top' // top, middle, bottom
        };
        this.maxDisplayItems = parseInt(this.urlParams.get('maxDisplayItems')) || 5;

        this.model = null;
        this.predictions = [];
        this.displayPredictions = []; // Filtered predictions for display

        this.init();
    }

    async init() {
        this.setupCanvas();
        await this.setupCamera();
        await this.loadScripts();
        await this.loadModels();
        this.setupDisplayPosition();
        this.hideLoading();
        this.startRendering();
    }

    setupCanvas() {
        this.canvas = document.getElementById('overlayCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();
        window.addEventListener('resize', () => {
            this.resizeCanvas();
            this.setupDisplayPosition(); // Reposition on resize
        });
    }

    resizeCanvas() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
    }

    setupDisplayPosition() {
        if (!this.predictionDisplay) return;

        // Remove all positioning classes
        this.predictionDisplay.classList.remove(
            'left-4', 'right-4', 'left-1/2', '-translate-x-1/2',
            'top-4', 'bottom-4', 'top-1/2', '-translate-y-1/2'
        );

        // Horizontal positioning
        switch(this.displayPositioning.horizontal) {
            case 'left':
                this.predictionDisplay.classList.add('left-4');
                break;
            case 'center':
                this.predictionDisplay.classList.add('left-1/2', '-translate-x-1/2');
                break;
            case 'right':
                this.predictionDisplay.classList.add('right-4');
                break;
            default:
                this.predictionDisplay.classList.add('right-4');
        }

        // Vertical positioning
        switch(this.displayPositioning.vertical) {
            case 'top':
                this.predictionDisplay.classList.add('top-4');
                break;
            case 'middle':
                this.predictionDisplay.classList.add('top-1/2', '-translate-y-1/2');
                break;
            case 'bottom':
                this.predictionDisplay.classList.add('bottom-4');
                break;
            default:
                this.predictionDisplay.classList.add('top-4');
        }
    }

    async setupCamera() {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: false,
                video: { facingMode: this.cameraFacing }
            });
            this.video.srcObject = mediaStream;
            await this.video.play();
        } catch (err) {
            console.error("Camera access failed:", err);
        }
    }

    async loadScripts() {
        if (!window.tf && this.gamemode !== 'detectFaceEmotion') {
            await new Promise(resolve => {
                const s = document.createElement('script');
                s.src = "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs";
                s.onload = resolve;
                document.head.appendChild(s);
            });
        }

        if (this.gamemode === 'detectObject' && !window.cocoSsd) {
            await new Promise(resolve => {
                const s = document.createElement('script');
                s.src = "https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd";
                s.onload = resolve;
                document.head.appendChild(s);
            });
        }

        if (this.gamemode === 'detectFaceEmotion' && !window.faceapi) {
            await new Promise(resolve => {
                const s = document.createElement('script');
                s.src = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/dist/face-api.min.js";
                s.onload = resolve;
                document.head.appendChild(s);
            });
        }
    }

    async loadModels() {
        if (this.gamemode === 'detectObject') {
            console.log("Loading COCO-SSD...");
            this.model = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
            console.log("Object detection model loaded.");
        } else if (this.gamemode === 'detectFaceEmotion') {
            console.log("Loading Face API models...");
            async function safeIsTauri() {
                try {
                    const { isTauri } = await import('@tauri-apps/api/core');
                    return isTauri();
                } catch {
                    return false; // Browser
                }
            }
            const windowTauri = await safeIsTauri();
            const isGithubPages = window.location.hostname.includes('github.io');

            const MODEL_URL = windowTauri ?
                'tauri://localhost/weights' :
                isGithubPages ? '/neuro-exercises/weights' : '/weights';
            console.log(MODEL_URL);
            await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL)
            await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
            await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);
            console.log("Face API models loaded.");
        }
    }

    hideLoading() {
        if (this.loadingOverlay) this.loadingOverlay.style.display = 'none';
        if (this.predictionDisplay) this.predictionDisplay.classList.remove('hidden');
    }

    async detectObjects() {
        if (!this.model || this.video.readyState < 2) return;
        this.predictions = await this.model.detect(this.video);
        this.updateDisplayPredictions();
    }

    async detectFaces() {
        if (this.video.readyState < 2) return;

        const detections = await faceapi.detectAllFaces(
            this.video,
            new faceapi.TinyFaceDetectorOptions()
        ).withFaceExpressions();

        this.predictions = detections.map(det => ({
            bbox: [
                det.detection.box.x,
                det.detection.box.y,
                det.detection.box.width,
                det.detection.box.height
            ],
            class: Object.entries(det.expressions).sort((a,b)=>b[1]-a[1])[0][0], // top expression
            score: Math.max(...Object.values(det.expressions)) // expression probability
        }));
        this.updateDisplayPredictions();
    }

    updateDisplayPredictions() {
        // Filter predictions by sensitivity and sort by score
        this.displayPredictions = this.predictions
            .filter(p => p.score >= this.sensitivity)
            .sort((a, b) => b.score - a.score)
            .slice(0, this.maxDisplayItems);

        // Update the display
        this.updatePredictionDisplay();
    }

    updatePredictionDisplay() {
        if (!this.predictionList || !this.predictionDisplay) return;

        // Clear current list
        this.predictionList.innerHTML = '';

        // Add each prediction
        this.displayPredictions.forEach(prediction => {
            const div = document.createElement('div');
            div.className = 'flex justify-between items-center';

            const nameSpan = document.createElement('span');
            nameSpan.textContent = this.formatClassName(prediction.class);
            nameSpan.className = 'truncate flex-1 text-left mr-2';

            const scoreSpan = document.createElement('span');
            scoreSpan.textContent = `${(prediction.score * 100).toFixed(1)}%`;
            scoreSpan.className = 'font-bold';

            div.appendChild(nameSpan);
            div.appendChild(scoreSpan);
            this.predictionList.appendChild(div);
        });
    }

    formatClassName(className) {
        // Convert class names to more readable format
        return className
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    startRendering() {
        const renderLoop = async () => {
            if (this.video.readyState >= 2) {
                // Canvas rendering would go here if needed
            }

            if (this.gamemode === 'detectObject') {
                await this.detectObjects();
            } else if (this.gamemode === 'detectFaceEmotion') {
                await this.detectFaces();
            }

            requestAnimationFrame(renderLoop);
        };
        renderLoop();
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new CameraCanvasManager();
});
