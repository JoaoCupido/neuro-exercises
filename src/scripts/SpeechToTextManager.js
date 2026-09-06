import { BackgroundSettings } from "./BackgroundSettings.js";
import { GridSettings } from "./GridSettings.js";

export class SpeechToTextManager {
    constructor() {
        this.urlParams = new URLSearchParams(window.location.search);

        // Load reusable settings
        this.backgroundSettings = new BackgroundSettings(this.urlParams);
        this.gridSettings = new GridSettings(this.urlParams);

        this.audioContext = null;
        this.mediaStream = null;
        this.processor = null;
        this.source = null;

        this.audioData = [];

        this.isListening = false;
        this.modelLoading = false;
        this.transcriber = null;

        this.init();
    }

    async init() {
        this.startTime = null;
        this.completeLog = [];

        this.setupCanvases();
        this.setupUI();
        this.setupPopup();

        this.drawBackgroundColor();
        this.loadBackgroundImage();
        this.drawGrid();

        await this.loadWhisperModel();

        this.startTimer();
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

    /**
     * Load locally hosted Whisper model.
     *
     * Expected structure:
     *
     * public/
     * └── models/
     *     └── whisper-tiny-en/
     *         ├── config.json
     *         ├── generation_config.json
     *         ├── preprocessor_config.json
     *         ├── tokenizer.json
     *         ├── tokenizer_config.json
     *         └── onnx/
     *             ├── encoder_model_quantized.onnx
     *             └── decoder_model_merged_quantized.onnx
     */
    async loadWhisperModel() {
        const statusEl =
            document.getElementById('speechLiveText');

        const container =
            document.getElementById('speechLiveResult');

        try {
            this.modelLoading = true;

            container?.classList.remove(
                'hidden',
                'opacity-0'
            );

            if (statusEl) {
                statusEl.textContent =
                    'Loading local Whisper model...';
            }

            console.log(
                '[SpeechToText] Loading Transformers.js...'
            );

            /*
             * Browser-only dynamic import.
             *
             * This is important in Astro because Whisper,
             * ONNX Runtime and browser APIs should not be
             * initialized during SSR.
             */
            const { pipeline, env } =
                await import('@huggingface/transformers');

            console.log(
                '[SpeechToText] Transformers.js loaded.'
            );

            if (statusEl) {
                statusEl.textContent =
                    'Loading Whisper model...';
            }

            console.log(
                '[SpeechToText] Loading local Whisper model...'
            );

            // Tell Transformers.js that local models are allowed
            env.allowLocalModels = true;

            // This is the URL corresponding to your Astro `public/` directory.
            // Your model is:
            // public/scripts/speechToTextModels/whisper-tiny-en/
            env.localModelPath = '/scripts/speechToTextModels/onnx-community';

            // Optional: prevent it from falling back to Hugging Face
            env.allowRemoteModels = false;

            console.log('[SpeechToText] Transformers environment:', {
                version: env.version,
                allowLocalModels: env.allowLocalModels,
                allowRemoteModels: env.allowRemoteModels,
                localModelPath: env.localModelPath,
            });

            /*
             * The model is served from:
             *
             * public/models/whisper-tiny-en/
             *
             * Therefore the browser URL is:
             *
             * /models/whisper-tiny-en
             */
            this.transcriber = await pipeline(
                'automatic-speech-recognition',
                'whisper-tiny-en',
                {
                    dtype: 'q8',
                    device: 'webgpu',

                    progress_callback: (progress) => {
                        console.log(
                            '[Whisper]',
                            progress
                        );

                        if (
                            !statusEl ||
                            !progress
                        ) {
                            return;
                        }

                        if (
                            progress.status ===
                            'progress'
                        ) {
                            const percent =
                                typeof progress.progress ===
                                'number'
                                    ? Math.round(
                                        progress.progress
                                    )
                                    : null;

                            statusEl.textContent =
                                percent !== null
                                    ? `Loading Whisper ${percent}%...`
                                    : 'Loading Whisper...';
                        } else if (
                            progress.status ===
                            'initiate'
                        ) {
                            statusEl.textContent =
                                'Initializing Whisper...';
                        } else if (
                            progress.status ===
                            'done'
                        ) {
                            statusEl.textContent =
                                'Preparing Whisper...';
                        }
                    },
                }
            );

            console.log(
                '[SpeechToText] Whisper ready.'
            );

            if (statusEl) {
                statusEl.textContent =
                    'Ready! Click mic to speak.';
            }

            setTimeout(() => {
                if (!this.isListening) {
                    container?.classList.add(
                        'opacity-0'
                    );
                }
            }, 2000);

        } catch (error) {
            console.error(
                '[SpeechToText] Failed to load Whisper:',
                error
            );

            this.transcriber = null;

            if (statusEl) {
                statusEl.textContent =
                    'Failed to load Whisper model.';
            }

            /*
             * Keep the detailed error in the console.
             * This makes debugging much easier.
             */
            console.error(
                'Whisper initialization error:',
                {
                    name: error?.name,
                    message: error?.message,
                    stack: error?.stack,
                }
            );

        } finally {
            this.modelLoading = false;
        }
    }

    /**
     * Toggle microphone recording.
     */
    async toggleListening() {
        if (this.modelLoading) {
            console.log(
                '[SpeechToText] Model is still loading.'
            );

            return;
        }

        if (!this.transcriber) {
            console.error(
                '[SpeechToText] Whisper is not available.'
            );

            const statusEl =
                document.getElementById(
                    'speechLiveText'
                );

            if (statusEl) {
                statusEl.textContent =
                    'Whisper model is not ready.';
            }

            return;
        }

        if (this.isListening) {
            await this.stopRecordingAndTranscribe();
        } else {
            await this.startRecording();
        }
    }

    /**
     * Start microphone recording.
     */
    async startRecording() {
        try {
            if (!navigator.mediaDevices?.getUserMedia) {
                throw new Error(
                    'Your browser does not support microphone access.'
                );
            }

            console.log(
                '[SpeechToText] Requesting microphone...'
            );

            this.mediaStream =
                await navigator.mediaDevices.getUserMedia(
                    {
                        audio: {
                            channelCount: 1,
                            echoCancellation: true,
                            noiseSuppression: true,
                            autoGainControl: true,
                        },
                    }
                );

            console.log(
                '[SpeechToText] Microphone granted.'
            );

            /*
             * Ask for 16 kHz.
             *
             * NOTE:
             * Browsers are allowed to ignore this request
             * and use their native sample rate (often 48 kHz).
             * We handle resampling later.
             */
            this.audioContext =
                new (
                    window.AudioContext ||
                    window.webkitAudioContext
                )({
                    sampleRate: 16000,
                });

            console.log(
                '[SpeechToText] Audio sample rate:',
                this.audioContext.sampleRate
            );

            this.source =
                this.audioContext.createMediaStreamSource(
                    this.mediaStream
                );

            /*
             * ScriptProcessorNode is deprecated but widely
             * supported and simple for this use case.
             */
            this.processor =
                this.audioContext.createScriptProcessor(
                    4096,
                    1,
                    1
                );

            this.audioData = [];

            this.processor.onaudioprocess = (
                event
            ) => {
                if (!this.isListening) {
                    return;
                }

                const channelData =
                    event.inputBuffer.getChannelData(
                        0
                    );

                /*
                 * Copy the Float32Array because the browser
                 * can reuse the underlying AudioBuffer.
                 */
                this.audioData.push(
                    new Float32Array(channelData)
                );
            };

            this.source.connect(this.processor);

            /*
             * Connecting to destination keeps the
             * ScriptProcessorNode processing in browsers
             * that require it.
             *
             * The gain is muted so the user doesn't hear
             * their own microphone.
             */
            const gainNode =
                this.audioContext.createGain();

            gainNode.gain.value = 0;

            this.processor.connect(gainNode);
            gainNode.connect(
                this.audioContext.destination
            );

            this.isListening = true;

            this.updateMicButtonUI();

            const statusEl =
                document.getElementById(
                    'speechLiveText'
                );

            const container =
                document.getElementById(
                    'speechLiveResult'
                );

            container?.classList.remove(
                'hidden',
                'opacity-0'
            );

            if (statusEl) {
                statusEl.textContent =
                    'Listening...';
            }

            console.log(
                '[SpeechToText] Recording started.'
            );

        } catch (error) {
            console.error(
                '[SpeechToText] Microphone error:',
                error
            );

            this.cleanupRecording();

            alert(
                'Unable to access microphone: ' +
                (error?.message ||
                    'Unknown error')
            );
        }
    }

    /**
     * Stop recording and send audio to Whisper.
     */
    async stopRecordingAndTranscribe() {
        if (!this.isListening) {
            return;
        }

        console.log(
            '[SpeechToText] Stopping recording...'
        );

        this.isListening = false;

        this.updateMicButtonUI();

        const statusEl =
            document.getElementById(
                'speechLiveText'
            );

        if (statusEl) {
            statusEl.textContent =
                'Preparing audio...';
        }

        /*
         * Stop microphone capture but preserve
         * this.audioData.
         */
        if (this.processor) {
            this.processor.onaudioprocess = null;
            this.processor.disconnect();
        }

        if (this.source) {
            this.source.disconnect();
        }

        if (this.mediaStream) {
            this.mediaStream
                .getTracks()
                .forEach((track) => track.stop());
        }

        /*
         * Merge recorded Float32Arrays.
         */
        const totalLength =
            this.audioData.reduce(
                (total, chunk) =>
                    total + chunk.length,
                0
            );

        console.log(
            '[SpeechToText] Captured samples:',
            totalLength
        );

        if (totalLength === 0) {
            if (statusEl) {
                statusEl.textContent =
                    'No audio captured.';
            }

            await this.closeAudioContext();

            return;
        }

        const mergedAudio =
            new Float32Array(totalLength);

        let offset = 0;

        for (const chunk of this.audioData) {
            mergedAudio.set(chunk, offset);
            offset += chunk.length;
        }

        /*
         * Get the actual sample rate used by
         * the AudioContext.
         */
        const sourceSampleRate =
            this.audioContext?.sampleRate ||
            16000;

        await this.closeAudioContext();

        /*
         * Convert to 16 kHz if the browser didn't
         * actually create a 16 kHz AudioContext.
         */
        const audio16k =
            this.resampleAudio(
                mergedAudio,
                sourceSampleRate,
                16000
            );

        console.log(
            '[SpeechToText] Source sample rate:',
            sourceSampleRate
        );

        console.log(
            '[SpeechToText] Resampled samples:',
            audio16k.length
        );

        console.log(
            '[SpeechToText] Audio duration:',
            (
                audio16k.length / 16000
            ).toFixed(2),
            'seconds'
        );

        if (statusEl) {
            statusEl.textContent =
                'Transcribing...';
        }

        try {
            console.log(
                '[SpeechToText] Starting Whisper inference...'
            );

            const output =
                await this.transcriber(
                    audio16k,
                    {
                        chunk_length_s: 30,
                        stride_length_s: 5,
                        return_timestamps: false,
                    }
                );

            console.log(
                '[SpeechToText] Whisper output:',
                output
            );

            const recognized =
                (output?.text || '').trim();

            if (statusEl) {
                statusEl.textContent =
                    recognized ||
                    'No speech detected';
            }

            if (recognized) {
                this.checkForCorrectAnswer(
                    recognized
                );
            }

        } catch (error) {
            console.error(
                '[SpeechToText] Transcription error:',
                error
            );

            if (statusEl) {
                statusEl.textContent =
                    'Transcription failed.';
            }

        } finally {
            this.audioData = [];
        }
    }

    /**
     * Resample audio to 16 kHz.
     *
     * Whisper expects Float32 PCM at 16 kHz.
     */
    resampleAudio(
        audio,
        inputSampleRate,
        outputSampleRate
    ) {
        if (
            inputSampleRate ===
            outputSampleRate
        ) {
            return audio;
        }

        const ratio =
            inputSampleRate /
            outputSampleRate;

        const outputLength = Math.round(
            audio.length / ratio
        );

        const output =
            new Float32Array(outputLength);

        /*
         * Linear interpolation.
         *
         * This is sufficient for speech recognition
         * and avoids creating another AudioContext.
         */
        for (
            let i = 0;
            i < outputLength;
            i++
        ) {
            const position = i * ratio;

            const index =
                Math.floor(position);

            const fraction =
                position - index;

            const sample1 =
                audio[index] || 0;

            const sample2 =
                audio[index + 1] || sample1;

            output[i] =
                sample1 +
                (sample2 - sample1) *
                fraction;
        }

        return output;
    }

    /**
     * Close AudioContext safely.
     */
    async closeAudioContext() {
        if (!this.audioContext) {
            return;
        }

        try {
            await this.audioContext.close();
        } catch (error) {
            console.warn(
                '[SpeechToText] AudioContext close failed:',
                error
            );
        }

        this.audioContext = null;
    }

    /**
     * Clean up microphone resources.
     */
    cleanupRecording() {
        if (this.processor) {
            this.processor.onaudioprocess = null;

            try {
                this.processor.disconnect();
            } catch (_) {}

            this.processor = null;
        }

        if (this.source) {
            try {
                this.source.disconnect();
            } catch (_) {}

            this.source = null;
        }

        if (this.mediaStream) {
            this.mediaStream
                .getTracks()
                .forEach((track) => track.stop());

            this.mediaStream = null;
        }

        this.closeAudioContext();

        this.audioData = [];
        this.isListening = false;

        this.updateMicButtonUI();
    }

    /**
     * Update microphone button.
     */
    updateMicButtonUI() {
        const micBtn =
            document.getElementById('micBtn');

        const micIcon =
            document.getElementById('micIcon');

        const micMutedIcon =
            document.getElementById(
                'micMutedIcon'
            );

        const micPulse =
            document.getElementById('micPulse');

        if (!micBtn) {
            return;
        }

        if (this.isListening) {
            micBtn.classList.replace(
                'bg-primary',
                'bg-red-600'
            );

            micIcon?.classList.remove(
                'hidden'
            );

            micMutedIcon?.classList.add(
                'hidden'
            );

            micPulse?.classList.remove(
                'hidden'
            );

        } else {
            micBtn.classList.replace(
                'bg-red-600',
                'bg-primary'
            );

            micIcon?.classList.add(
                'hidden'
            );

            micMutedIcon?.classList.remove(
                'hidden'
            );

            micPulse?.classList.add(
                'hidden'
            );
        }
    }

    /**
     * Check recognized speech against
     * correctAnswers URL parameter.
     */
    checkForCorrectAnswer(recognized) {
        const correctAnswers =
            this.urlParams.get(
                'correctAnswers'
            );

        if (
            !correctAnswers ||
            !recognized
        ) {
            return;
        }

        const targets =
            correctAnswers
                .toLowerCase()
                .split(',')
                .map((value) =>
                    value.trim()
                )
                .filter(Boolean);

        /*
         * Normalize punctuation and whitespace.
         */
        const cleanRecognized =
            this.normalizeText(
                recognized
            );

        const isMatch =
            targets.some((target) => {
                const cleanTarget =
                    this.normalizeText(
                        target
                    );

                return (
                    cleanRecognized.includes(
                        cleanTarget
                    )
                );
            });

        console.log(
            '[SpeechToText] Answer match:',
            isMatch
        );

        if (!isMatch) {
            return;
        }

        /*
         * Show success popup.
         */
        document
            .getElementById('popup')
            ?.classList.remove(
            'hidden'
        );

        this.stopTimer();
        this.showResultsPopup(recognized, );
    }

    showResultsPopup(recognizedText, state = "STOPPED_TRANSCRIBING") {
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

        const correctAnswers =
            this.urlParams.get(
                'correctAnswers'
            );

        if (window.vuplex) {
            const sendData = {
                type: "NeuroExercises",
                activity: "TextRecognition",
                dataNE: {
                    activity: "TextRecognition",
                    log: this.completeLog,
                    correctText: correctAnswers,
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

    /**
     * Normalize text for answer matching.
     */
    normalizeText(text) {
        return text
            .toLowerCase()
            .normalize('NFD')
            .replace(
                /[\u0300-\u036f]/g,
                ''
            )
            .replace(
                /[^\p{L}\p{N}\s]/gu,
                ''
            )
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Wire up UI buttons and popups.
     */
    setupUI() {
        const micBtn =
            document.getElementById(
                'micBtn'
            );

        if (micBtn) {
            micBtn.addEventListener(
                'click',
                () => {
                    this.toggleListening();
                }
            );
        }

        const clearBtn =
            document.getElementById(
                'clearBtn'
            );

        if (clearBtn) {
            clearBtn.addEventListener(
                'click',
                () => {
                    const statusEl =
                        document.getElementById(
                            'speechLiveText'
                        );

                    if (statusEl) {
                        statusEl.textContent =
                            '';
                    }

                    document
                        .getElementById(
                            'speechLiveResult'
                        )
                        ?.classList.add(
                        'opacity-0'
                    );
                }
            );
        }
    }

    setupPopup() {
        this.popup = document.getElementById('popup');
        this.tryAgainBtn = document.getElementById('tryAgainBtn');
        this.popupTimerElement = document.getElementById('popupTimer');

        this.tryAgainBtn.onclick = () => {
            this.hidePopup();
            const statusEl =
                document.getElementById(
                    'speechLiveText'
                );

            if (statusEl) {
                statusEl.textContent =
                    '';
            }

            document
                .getElementById(
                    'speechLiveResult'
                )
                ?.classList.add(
                'opacity-0'
            );

            this.startTimer();
        };
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

    // Canvas resize and background methods (similar to DrawingCanvasManager)
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

    /**
     * Public cleanup method.
     *
     * Useful if the page/component is destroyed.
     */
    async destroy() {
        this.cleanupRecording();

        await this.closeAudioContext();

        this.transcriber = null;
    }
}