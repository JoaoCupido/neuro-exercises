import { BackgroundSettings } from "./BackgroundSettings.js";
import { GridSettings } from "./GridSettings.js";

export class SpeechToTextManager {
    constructor() {
        this.urlParams = new URLSearchParams(window.location.search);

        // Load reusable settings
        this.backgroundSettings = new BackgroundSettings(this.urlParams);
        this.gridSettings = new GridSettings(this.urlParams);

        // Speech/UI settings from URL
        this.speechSettings = {
            speechModel:
                this.urlParams.get('speechModel') || 'web-speech',

            speechLanguage:
                this.urlParams.get('speechLanguage') || 'en-US',

            continuous:
                this.urlParams.get('continuous') !== 'false',

            autoStart:
                this.urlParams.get('autoStart') === 'true',

            hideLiveTranscript:
                this.urlParams.get('hideLiveTranscript') === 'true',

            hideResultsPopup:
                this.urlParams.get('hideResultsPopup') === 'true',

            micButtonPosition:
                this.urlParams.get('micButtonPosition') || 'bottom-center',

            clearButtonPosition:
                this.urlParams.get('clearButtonPosition') || 'bottom-right'
        };

        this.audioContext = null;
        this.mediaStream = null;
        this.processor = null;
        this.source = null;
        this.audioData = [];

        this.isListening = false;
        this.modelLoading = false;
        this.transcriber = null;
        this.recognition = null; // Web Speech API instance
        this.isFinished = false; // Prevents overwriting result after correct answer

        this.init();
    }

    async init() {
        this.startTime = null;
        this.completeLog = [];

        this.setupCanvases();
        this.setupUI();
        this.setupPopup();

        this.applySpeechSettings();

        this.drawBackgroundColor();
        this.loadBackgroundImage();
        this.drawGrid();

        if (this.speechSettings.speechModel === 'web-speech') {
            this.setupWebSpeech();
        } else {
            await this.loadWhisperModel();
        }

        this.startTimer();

        if (this.speechSettings.autoStart) {
            await this.startRecording();
        }
    }

    applySpeechSettings() {
        const {
            micButtonPosition,
            clearButtonPosition,
            hideLiveTranscript
        } = this.speechSettings;

        const micContainer = document.getElementById('micBtnContainer');
        const clearBtn = document.getElementById('clearBtn');
        const liveResult = document.getElementById('speechLiveResult');

        // Microphone button position
        if (micContainer) {
            micContainer.classList.remove(
                'bottom-6', 'top-6', 'left-6', 'right-6', 'left-1/2', '-translate-x-1/2'
            );

            switch (micButtonPosition) {
                case 'bottom-left':
                    micContainer.classList.add('bottom-6', 'left-6');
                    break;
                case 'bottom-right':
                    micContainer.classList.add('bottom-6', 'right-6');
                    break;
                case 'top-right':
                    micContainer.classList.add('top-6', 'right-6');
                    break;
                case 'top-left':
                    micContainer.classList.add('top-6', 'left-6');
                    break;
                case 'bottom-center':
                default:
                    micContainer.classList.add('bottom-6', 'left-1/2', '-translate-x-1/2');
                    break;
            }
        }

        // Clear button position
        if (clearBtn) {
            clearBtn.classList.remove('bottom-6', 'top-6', 'left-6', 'right-6');

            switch (clearButtonPosition) {
                case 'bottom-left':
                    clearBtn.classList.add('bottom-6', 'left-6');
                    break;
                case 'top-right':
                    clearBtn.classList.add('top-6', 'right-6');
                    break;
                case 'top-left':
                    clearBtn.classList.add('top-6', 'left-6');
                    break;
                case 'bottom-right':
                default:
                    clearBtn.classList.add('bottom-6', 'right-6');
                    break;
            }
        }

        // Live transcript bubble visibility
        if (liveResult) {
            if (hideLiveTranscript) {
                liveResult.classList.add('hidden');
            } else {
                liveResult.classList.add('opacity-0');
            }
        }
    }

    showLiveTranscript(text) {
        if (this.speechSettings.hideLiveTranscript) return;
        const liveResult = document.getElementById('speechLiveResult');
        const liveText = document.getElementById('speechLiveText');

        if (liveText) liveText.textContent = text;
        if (liveResult) {
            liveResult.classList.remove('hidden', 'opacity-0');
        }
    }

    hideLiveTranscript() {
        const liveResult = document.getElementById('speechLiveResult');
        if (liveResult) {
            liveResult.classList.add('opacity-0');
        }
    }

    /* =========================================================
       WEB SPEECH API
       ========================================================= */
    setupWebSpeech() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            console.error('[SpeechToText] SpeechRecognition Web API is not supported in this browser.');
            this.showLiveTranscript('SpeechRecognition not supported in this browser.');
            return;
        }

        this.recognition = new SpeechRecognition();
        this.recognition.continuous = this.speechSettings.continuous;
        this.recognition.interimResults = true;
        this.recognition.lang = this.speechSettings.speechLanguage;

        this.recognition.onstart = () => {
            this.isListening = true;
            this.updateMicButtonUI();
            //this.showLiveTranscript('Listening...');
        };

        this.recognition.onresult = (event) => {
            if (this.isFinished) return;

            let interim = '';
            let final = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    final += event.results[i][0].transcript;
                } else {
                    interim += event.results[i][0].transcript;
                }
            }

            const recognized = (final || interim).trim();

            if (recognized) {
                this.showLiveTranscript(recognized);
                this.checkForCorrectAnswer(recognized);
            }
        };

        this.recognition.onerror = (event) => {
            console.error('[SpeechToText] Web Speech error:', event.error);
            if (event.error === 'not-allowed') {
                this.isListening = false;
                this.updateMicButtonUI();
            }
        };

        this.recognition.onend = () => {
            if (this.isListening && this.speechSettings.continuous && !this.isFinished) {
                try {
                    this.recognition.start();
                } catch (e) {
                    console.warn('[SpeechToText] Web Speech restart error:', e);
                }
            } else {
                this.isListening = false;
                this.updateMicButtonUI();
            }
        };
    }

    /* =========================================================
       WHISPER LOCAL MODEL
       ========================================================= */
    async loadWhisperModel() {
        const loadingContainer = document.getElementById('modelLoadingIndicator');
        const loadingText = document.getElementById('modelLoadingText');

        try {
            this.modelLoading = true;
            loadingContainer?.classList.remove('hidden', 'opacity-0');

            if (loadingText) loadingText.textContent = 'Loading Transformers.js...';

            const { pipeline, env } = await import('@huggingface/transformers');

            if (loadingText) loadingText.textContent = 'Loading local Whisper model...';

            env.allowLocalModels = true;
            env.localModelPath = '/scripts/speechToTextModels/onnx-community';
            env.allowRemoteModels = false;

            this.transcriber = await pipeline(
                'automatic-speech-recognition',
                'whisper-tiny-en',
                {
                    dtype: 'q8',
                    device: 'webgpu',
                    progress_callback: (progress) => {
                        if (!loadingText || !progress) return;
                        if (progress.status === 'progress') {
                            const percent = typeof progress.progress === 'number' ? Math.round(progress.progress) : null;
                            loadingText.textContent = percent !== null ? `Loading Whisper ${percent}%...` : 'Loading Whisper...';
                        } else if (progress.status === 'initiate') {
                            loadingText.textContent = 'Initializing Whisper...';
                        } else if (progress.status === 'done') {
                            loadingText.textContent = 'Preparing Whisper...';
                        }
                    },
                }
            );

            if (loadingText) loadingText.textContent = 'Whisper ready!';
        } catch (error) {
            console.error('[SpeechToText] Failed to load Whisper:', error);
            this.transcriber = null;
            if (loadingText) loadingText.textContent = 'Failed to load Whisper model.';
        } finally {
            this.modelLoading = false;
            setTimeout(() => {
                loadingContainer?.classList.add('opacity-0');
                setTimeout(() => loadingContainer?.classList.add('hidden'), 300);
            }, 1200);
        }
    }

    async toggleListening() {
        if (this.modelLoading) {
            console.log('[SpeechToText] Model is still loading.');
            return;
        }

        if (this.isListening) {
            await this.stopRecording();
        } else {
            await this.startRecording();
        }
    }

    async startRecording() {
        if (this.isFinished) return;

        // Web Speech API execution path
        if (this.speechSettings.speechModel === 'web-speech') {
            if (!this.recognition) return;
            try {
                this.recognition.start();
            } catch (err) {
                console.warn('[SpeechToText] Web Speech already active or starting:', err);
            }
            return;
        }

        // Whisper inference microphone capture
        if (!this.transcriber) {
            console.error('[SpeechToText] Whisper is not available.');
            return;
        }

        try {
            if (!navigator.mediaDevices?.getUserMedia) {
                throw new Error('Microphone access is not supported in this browser.');
            }

            this.mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
            });

            this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
                sampleRate: 16000,
            });

            this.source = this.audioContext.createMediaStreamSource(this.mediaStream);
            this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
            this.audioData = [];

            this.processor.onaudioprocess = (event) => {
                if (!this.isListening || this.isFinished) return;
                const channelData = event.inputBuffer.getChannelData(0);
                this.audioData.push(new Float32Array(channelData));
            };

            this.source.connect(this.processor);

            const gainNode = this.audioContext.createGain();
            gainNode.gain.value = 0;
            this.processor.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            this.isListening = true;
            this.updateMicButtonUI();
            //this.showLiveTranscript('Listening...');
        } catch (error) {
            console.error('[SpeechToText] Microphone error:', error);
            this.cleanupRecording();
            alert('Unable to access microphone: ' + (error?.message || 'Unknown error'));
        }
    }

    async stopRecording() {
        if (this.speechSettings.speechModel === 'web-speech') {
            this.isListening = false;
            this.updateMicButtonUI();
            if (this.recognition) {
                try {
                    this.recognition.stop();
                } catch (_) {}
            }
            return;
        }

        await this.stopRecordingAndTranscribe();
    }

    async stopRecordingAndTranscribe() {
        if (!this.isListening) return;

        this.isListening = false;
        this.updateMicButtonUI();

        if (this.isFinished) {
            this.cleanupRecording();
            return;
        }

        this.showLiveTranscript('...');

        if (this.processor) {
            this.processor.onaudioprocess = null;
            this.processor.disconnect();
        }

        if (this.source) {
            this.source.disconnect();
        }

        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach((track) => track.stop());
        }

        const totalLength = this.audioData.reduce((total, chunk) => total + chunk.length, 0);

        if (totalLength === 0) {
            this.hideLiveTranscript();
            await this.closeAudioContext();
            return;
        }

        const mergedAudio = new Float32Array(totalLength);
        let offset = 0;
        for (const chunk of this.audioData) {
            mergedAudio.set(chunk, offset);
            offset += chunk.length;
        }

        const sourceSampleRate = this.audioContext?.sampleRate || 16000;
        await this.closeAudioContext();

        const audio16k = this.resampleAudio(mergedAudio, sourceSampleRate, 16000);

        try {
            const output = await this.transcriber(audio16k, {
                chunk_length_s: 30,
                stride_length_s: 5,
                return_timestamps: false,
            });

            if (this.isFinished) return;

            const recognized = (output?.text || '').trim();
            this.showLiveTranscript(recognized || 'No speech detected');

            if (recognized) {
                this.checkForCorrectAnswer(recognized);
            }
        } catch (error) {
            console.error('[SpeechToText] Transcription error:', error);
            this.showLiveTranscript('Transcription failed.');
        } finally {
            this.audioData = [];

            if (
                this.speechSettings.continuous &&
                !this.modelLoading &&
                !this.isFinished
            ) {
                setTimeout(() => {
                    if (!this.isListening && !this.isFinished && this.transcriber) {
                        this.startRecording();
                    }
                }, 300);
            }
        }
    }

    resampleAudio(audio, inputSampleRate, outputSampleRate) {
        if (inputSampleRate === outputSampleRate) return audio;

        const ratio = inputSampleRate / outputSampleRate;
        const outputLength = Math.round(audio.length / ratio);
        const output = new Float32Array(outputLength);

        for (let i = 0; i < outputLength; i++) {
            const position = i * ratio;
            const index = Math.floor(position);
            const fraction = position - index;
            const sample1 = audio[index] || 0;
            const sample2 = audio[index + 1] || sample1;
            output[i] = sample1 + (sample2 - sample1) * fraction;
        }

        return output;
    }

    async closeAudioContext() {
        if (!this.audioContext) return;
        try {
            await this.audioContext.close();
        } catch (error) {
            console.warn('[SpeechToText] AudioContext close failed:', error);
        }
        this.audioContext = null;
    }

    cleanupRecording() {
        if (this.processor) {
            this.processor.onaudioprocess = null;
            try { this.processor.disconnect(); } catch (_) {}
            this.processor = null;
        }

        if (this.source) {
            try { this.source.disconnect(); } catch (_) {}
            this.source = null;
        }

        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach((track) => track.stop());
            this.mediaStream = null;
        }

        this.closeAudioContext();
        this.audioData = [];
        this.isListening = false;
        this.updateMicButtonUI();
    }

    updateMicButtonUI() {
        const micBtn = document.getElementById('micBtn');
        const micIcon = document.getElementById('micIcon');
        const micMutedIcon = document.getElementById('micMutedIcon');
        const micPulse = document.getElementById('micPulse');

        if (!micBtn) return;

        if (this.isListening) {
            micBtn.classList.replace('bg-primary', 'bg-red-600');
            micIcon?.classList.remove('hidden');
            micMutedIcon?.classList.add('hidden');
            micPulse?.classList.remove('hidden');
        } else {
            micBtn.classList.replace('bg-red-600', 'bg-primary');
            micIcon?.classList.add('hidden');
            micMutedIcon?.classList.remove('hidden');
            micPulse?.classList.add('hidden');
        }
    }

    checkForCorrectAnswer(recognized) {
        if (this.isFinished) return;

        const correctAnswers = this.urlParams.get('correctAnswers');
        if (!correctAnswers || !recognized) return;

        let targets = [];
        try {
            const parsed = JSON.parse(correctAnswers);
            targets = Array.isArray(parsed) ? parsed : [correctAnswers];
        } catch {
            targets = correctAnswers.split(',');
        }

        targets = targets.map((v) => String(v).trim()).filter(Boolean);

        const cleanRecognized = this.normalizeText(recognized);

        const isMatch = targets.some((target) => {
            const cleanTarget = this.normalizeText(target);
            return cleanRecognized.includes(cleanTarget);
        });

        if (!isMatch) return;

        // Correct answer found: Halt listening completely
        this.isFinished = true;
        this.stopTimer();

        if (this.speechSettings.speechModel === 'web-speech') {
            this.isListening = false;
            this.updateMicButtonUI();
            if (this.recognition) {
                try { this.recognition.stop(); } catch (_) {}
            }
        } else {
            this.cleanupRecording();
        }

        if (!this.speechSettings.hideResultsPopup) {
            document.getElementById('popup')?.classList.remove('hidden');
            this.showResultsPopup(recognized);
        }
    }

    showResultsPopup(recognizedText, state = "STOPPED_TRANSCRIBING") {
        this.popupTimerElement.textContent = `Time: ${this.popupTimer.toFixed(2)}s`;
        this.popupTimerElement.classList.remove('hidden');

        const recognizedTextElement = document.getElementById('recognizedText');
        if (recognizedTextElement) {
            recognizedTextElement.textContent = recognizedText || 'No text recognized';
        }

        const correctAnswersSection = document.getElementById('correctAnswersSection');
        if (correctAnswersSection) {
            correctAnswersSection.classList.add('hidden');
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

        const correctAnswers = this.urlParams.get('correctAnswers');

        if (window.vuplex) {
            const sendData = {
                type: "NeuroExercises",
                activity: "TextRecognition",
                dataNE: {
                    activity: "TextRecognition",
                    log: this.completeLog,
                    correctText: correctAnswers,
                    time: parseFloat(this.popupTimer.toFixed(2)),
                }
            };
            window.vuplex.postMessage(JSON.stringify(sendData));
        } else {
            console.log("VUPLEX bridge not available");
        }
    }

    normalizeText(text) {
        return text
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^\p{L}\p{N}\s]/gu, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    setupUI() {
        const micBtn = document.getElementById('micBtn');
        if (micBtn) {
            micBtn.addEventListener('click', () => {
                this.toggleListening();
            });
        }

        const clearBtn = document.getElementById('clearBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                const statusEl = document.getElementById('speechLiveText');
                if (statusEl) statusEl.textContent = '';
                this.hideLiveTranscript();
            });
        }
    }

    setupPopup() {
        this.popup = document.getElementById('popup');
        this.tryAgainBtn = document.getElementById('tryAgainBtn');
        this.popupTimerElement = document.getElementById('popupTimer');

        this.tryAgainBtn.onclick = () => {
            this.hidePopup();
            this.isFinished = false;

            const statusEl = document.getElementById('speechLiveText');
            if (statusEl) statusEl.textContent = '';
            this.hideLiveTranscript();

            this.startTimer();

            if (this.speechSettings.autoStart || this.speechSettings.continuous) {
                this.startRecording();
            }
        };
    }

    hidePopup() {
        if (this.popupTimer) {
            clearTimeout(this.popupTimer);
            this.popupTimer = null;
        }
        this.popup?.classList.add('hidden');
    }

    updateTimer() {
        const currentTime = new Date();
        this.popupTimer = (currentTime - this.startTime) / 1000;
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

    setupCanvases() {
        this.bgColorCanvas = document.getElementById('bgColorCanvas');
        this.bgImageCanvas = document.getElementById('bgImageCanvas');
        this.gridCanvas = document.getElementById('gridCanvas');

        this.bgColorCtx = this.bgColorCanvas.getContext('2d', { willReadFrequently: true });
        this.bgImageCtx = this.bgImageCanvas.getContext('2d', { willReadFrequently: true });
        this.gridCtx = this.gridCanvas.getContext('2d', { willReadFrequently: true });

        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        const container = this.bgColorCanvas.parentElement;
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

    async destroy() {
        this.isFinished = true;
        this.cleanupRecording();
        if (this.recognition) {
            try { this.recognition.stop(); } catch (_) {}
            this.recognition = null;
        }
        await this.closeAudioContext();
        this.transcriber = null;
    }
}