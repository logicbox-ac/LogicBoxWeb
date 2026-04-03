const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');
const Cast = require('../../util/cast');
const formatMessage = require('format-message');
const {
    HANDS_BASE_URL,
    STAGE_DIMENSIONS,
    closeFrame,
    ensureVideoMirrorState,
    createInlineWorker,
    createPreviewFrameBitmap,
    destroyInlineWorker,
    getVideoMirrorState,
    getPreviewFrameCanvas,
    getTrackingPerformanceProfile,
    loadBrowserScript,
    projectPreviewPointToStage,
    waitForVideoReady
} = require('../logicboxTracking/runtime');

const blockIconURI = null;

const Message = {
    getX: {
        'ja': '[LANDMARK] のx座標',
        'ja-Hira': '[LANDMARK] のxざひょう',
        'en': 'x of [LANDMARK]',
        'fr': 'x de [LANDMARK]'
    },
    getY: {
        'ja': '[LANDMARK] のy座標',
        'ja-Hira': '[LANDMARK] のyざひょう',
        'en': 'y of [LANDMARK]',
        'fr': 'y de [LANDMARK]'
    },
    getZ: {
        'ja': '[LANDMARK] のz座標',
        'ja-Hira': '[LANDMARK] のzざひょう',
        'en': 'z of [LANDMARK]',
        'fr': 'z de [LANDMARK]'
    },
    videoToggle: {
        'ja': 'ビデオを [VIDEO_STATE] にする',
        'ja-Hira': 'ビデオを [VIDEO_STATE] にする',
        'en': 'turn video [VIDEO_STATE]',
        'fr': 'mettre la video [VIDEO_STATE]'
    },
    setRatio: {
        'ja': '倍率を [RATIO] にする',
        'ja-Hira': 'ばいりつを [RATIO] にする',
        'en': 'set ratio to [RATIO]',
        'fr': 'definir le ratio a [RATIO]'
    },
    on: {
        'ja': '入',
        'ja-Hira': 'いり',
        'en': 'on',
        'fr': 'active'
    },
    off: {
        'ja': '切',
        'ja-Hira': 'きり',
        'en': 'off',
        'fr': 'desactive'
    },
    video_on_flipped: {
        'ja': '左右反転',
        'ja-Hira': 'さゆうはんてん',
        'en': 'on flipped',
        'fr': 'video inversee'
    },
    landmarks: [
        {
            'ja': '手首',
            'ja-Hira': 'てくび',
            'en': 'wrist',
            'fr': 'poignet'
        },
        {
            'ja': '親指の根元',
            'ja-Hira': 'おやゆびのねもと',
            'en': 'the base of thumb',
            'fr': 'base du pouce'
        },
        {
            'ja': '親指の第2関節',
            'ja-Hira': 'おやゆびのだい2かんせつ',
            'en': 'the 2nd joint of thumb',
            'fr': '2e articulation du pouce'
        },
        {
            'ja': '親指の第1関節',
            'ja-Hira': 'おやゆびのだい1かんせつ',
            'en': 'the 1st joint of thumb',
            'fr': '1re articulation du pouce'
        },
        {
            'ja': '親指の先端',
            'ja-Hira': 'おやゆびのさき',
            'en': 'thumb',
            'fr': 'bout du pouce'
        },
        {
            'ja': '人差し指の第3関節',
            'ja-Hira': 'ひとさしゆびのだい3かんせつ',
            'en': 'the 3rd joint of index finger',
            'fr': '3e articulation de l index'
        },
        {
            'ja': '人差し指の第2関節',
            'ja-Hira': 'ひとさしゆびのだい2かんせつ',
            'en': 'the 2nd joint of index finger',
            'fr': '2e articulation de l index'
        },
        {
            'ja': '人差し指の第1関節',
            'ja-Hira': 'ひとさしゆびのだい1かんせつ',
            'en': 'the 1st joint of index finger',
            'fr': '1re articulation de l index'
        },
        {
            'ja': '人差し指の先端',
            'ja-Hira': 'ひとさしゆびのせんたん',
            'en': 'index finger',
            'fr': 'bout de l index'
        },
        {
            'ja': '中指の第3関節',
            'ja-Hira': 'なかゆびのだい3かんせつ',
            'en': 'the 3rd joint of middle finger',
            'fr': '3e articulation du majeur'
        },
        {
            'ja': '中指の第2関節',
            'ja-Hira': 'なかゆびのだい2かんせつ',
            'en': 'the 2nd joint of middle finger',
            'fr': '2e articulation du majeur'
        },
        {
            'ja': '中指の第1関節',
            'ja-Hira': 'なかゆびのだい1かんせつ',
            'en': 'the 1st joint of middle finger',
            'fr': '1re articulation du majeur'
        },
        {
            'ja': '中指の先端',
            'ja-Hira': 'なかゆびのせんたん',
            'en': 'middle finger',
            'fr': 'bout du majeur'
        },
        {
            'ja': '薬指の第3関節',
            'ja-Hira': 'くすりゆびのだい3かんせつ',
            'en': 'the 3rd joint of ring finger',
            'fr': '3e articulation de l annulaire'
        },
        {
            'ja': '薬指の第2関節',
            'ja-Hira': 'くすりゆびのだい2かんせつ',
            'en': 'the 2nd joint of ring finger',
            'fr': '2e articulation de l annulaire'
        },
        {
            'ja': '薬指の第1関節',
            'ja-Hira': 'くすりゆびのだい1かんせつ',
            'en': 'the 1st joint of ring finger',
            'fr': '1re articulation de l annulaire'
        },
        {
            'ja': '薬指の先端',
            'ja-Hira': 'くすりゆびのせんたん',
            'en': 'ring finger',
            'fr': 'bout de l annulaire'
        },
        {
            'ja': '小指の第3関節',
            'ja-Hira': 'こゆびのだい3かんせつ',
            'en': 'the 3rd joint of little finger',
            'fr': '3e articulation de l auriculaire'
        },
        {
            'ja': '小指の第2関節',
            'ja-Hira': 'こゆびのだい2かんせつ',
            'en': 'the 2nd joint of little finger',
            'fr': '2e articulation de l auriculaire'
        },
        {
            'ja': '小指の第1関節',
            'ja-Hira': 'こゆびのだい1かんせつ',
            'en': 'the 1st joint of little finger',
            'fr': '1re articulation de l auriculaire'
        },
        {
            'ja': '小指の先端',
            'ja-Hira': 'こゆびのせんたん',
            'en': 'little finger',
            'fr': 'bout de l auriculaire'
        }
    ]
};

const AvailableLocales = ['en', 'ja', 'ja-Hira', 'fr'];

const simplifyHandResults = results => {
    if (!results || !results.multiHandLandmarks || !results.multiHandLandmarks[0]) {
        return [];
    }

    return results.multiHandLandmarks[0].map(point => ({
        x: typeof point.x === 'number' ? point.x : 0,
        y: typeof point.y === 'number' ? point.y : 0,
        z: typeof point.z === 'number' ? point.z : 0
    }));
};

const buildHandsWorkerSource = () => `
let hands = null;
let currentRequestId = null;
const handsBaseUrl = ${JSON.stringify(HANDS_BASE_URL)};
const simplifyHandResults = results => {
    if (!results || !results.multiHandLandmarks || !results.multiHandLandmarks[0]) {
        return [];
    }
    return results.multiHandLandmarks[0].map(point => ({
        x: typeof point.x === 'number' ? point.x : 0,
        y: typeof point.y === 'number' ? point.y : 0,
        z: typeof point.z === 'number' ? point.z : 0
    }));
};
self.onmessage = async event => {
    const data = event.data || {};
    if (data.type === 'init') {
        try {
            importScripts(handsBaseUrl + '/hands.js');
            const HandsCtor = self.Hands || Hands;
            hands = new HandsCtor({
                locateFile: file => handsBaseUrl + '/' + file
            });
            hands.setOptions(data.options || {});
            hands.onResults(results => {
                const requestId = currentRequestId;
                currentRequestId = null;
                self.postMessage({
                    type: 'result',
                    landmarks: simplifyHandResults(results),
                    requestId
                });
            });
            self.postMessage({type: 'ready'});
        } catch (error) {
            self.postMessage({
                type: 'error',
                phase: 'init',
                message: error && error.message ? error.message : String(error)
            });
        }
        return;
    }
    if (data.type === 'estimate') {
        if (!hands) {
            if (data.frame && data.frame.close) {
                data.frame.close();
            }
            self.postMessage({type: 'result', landmarks: [], requestId: data.requestId});
            return;
        }
        currentRequestId = data.requestId;
        try {
            await hands.send({image: data.frame});
        } catch (error) {
            self.postMessage({
                type: 'error',
                phase: 'estimate',
                message: error && error.message ? error.message : String(error),
                requestId: data.requestId
            });
            currentRequestId = null;
        } finally {
            if (data.frame && data.frame.close) {
                data.frame.close();
            }
            if (currentRequestId === data.requestId) {
                currentRequestId = null;
                self.postMessage({type: 'result', landmarks: [], requestId: data.requestId});
            }
        }
        return;
    }
    if (data.type === 'dispose') {
        try {
            if (hands && typeof hands.close === 'function') {
                await hands.close();
            }
        } catch (error) {
            // Ignore disposal issues in the worker shutdown path.
        }
        hands = null;
        self.close();
    }
};
`;

class MainThreadHandsDetector {
    constructor (options) {
        this._options = options;
        this._detector = null;
        this._pendingRequest = null;
    }

    async init () {
        const scope = typeof window !== 'undefined' ? window : globalThis;
        await loadBrowserScript(`${HANDS_BASE_URL}/hands.js`, 'Hands');
        const HandsCtor = scope.Hands;
        this._detector = new HandsCtor({
            locateFile: file => `${HANDS_BASE_URL}/${file}`
        });
        this._detector.setOptions(this._options);
        this._detector.onResults(results => {
            const pendingRequest = this._pendingRequest;
            this._pendingRequest = null;
            if (pendingRequest) {
                pendingRequest.resolve(simplifyHandResults(results));
            }
        });
    }

    estimate (frame) {
        return new Promise((resolve, reject) => {
            if (!this._detector) {
                closeFrame(frame);
                resolve([]);
                return;
            }

            this._pendingRequest = {resolve, reject};
            Promise.resolve(this._detector.send({image: frame}))
                .catch(error => {
                    if (this._pendingRequest) {
                        this._pendingRequest = null;
                    }
                    reject(error);
                })
                .finally(() => {
                    closeFrame(frame);
                });
        });
    }

    async dispose () {
        if (this._pendingRequest) {
            this._pendingRequest.resolve([]);
            this._pendingRequest = null;
        }
        if (this._detector && typeof this._detector.close === 'function') {
            await this._detector.close();
        }
        this._detector = null;
    }
}

class WorkerHandsDetector {
    constructor (options) {
        this._options = options;
        this._worker = null;
        this._nextRequestId = 1;
        this._pendingRequests = new Map();
    }

    async init () {
        this._worker = createInlineWorker(buildHandsWorkerSource());
        this._worker.onmessage = this._handleMessage.bind(this);

        await new Promise((resolve, reject) => {
            const cleanup = () => {
                this._worker.removeEventListener('error', onError);
                this._worker.removeEventListener('message', onMessage);
            };
            const onError = event => {
                cleanup();
                reject(event.error || new Error('Hand worker failed to initialize'));
            };
            const onMessage = event => {
                const data = event.data || {};
                if (data.type === 'ready') {
                    cleanup();
                    resolve();
                } else if (data.type === 'error' && data.phase === 'init') {
                    cleanup();
                    reject(new Error(data.message || 'Hand worker failed to initialize'));
                }
            };
            this._worker.addEventListener('error', onError);
            this._worker.addEventListener('message', onMessage);
            this._worker.postMessage({
                options: this._options,
                type: 'init'
            });
        });
    }

    estimate (frame) {
        return new Promise((resolve, reject) => {
            if (!this._worker) {
                closeFrame(frame);
                resolve([]);
                return;
            }

            const requestId = String(this._nextRequestId++);
            this._pendingRequests.set(requestId, {reject, resolve});

            try {
                this._worker.postMessage({
                    frame,
                    requestId,
                    type: 'estimate'
                }, [frame]);
            } catch (error) {
                this._pendingRequests.delete(requestId);
                closeFrame(frame);
                reject(error);
            }
        });
    }

    _handleMessage (event) {
        const data = event.data || {};
        if (!data.requestId) {
            return;
        }

        const pendingRequest = this._pendingRequests.get(String(data.requestId));
        if (!pendingRequest) {
            return;
        }

        this._pendingRequests.delete(String(data.requestId));

        if (data.type === 'error') {
            pendingRequest.reject(new Error(data.message || 'Hand worker estimate failed'));
            return;
        }

        pendingRequest.resolve(Array.isArray(data.landmarks) ? data.landmarks : []);
    }

    async dispose () {
        for (const pendingRequest of this._pendingRequests.values()) {
            pendingRequest.resolve([]);
        }
        this._pendingRequests.clear();
        if (this._worker) {
            try {
                this._worker.postMessage({type: 'dispose'});
            } catch (error) {
                // Ignore worker shutdown races.
            }
            destroyInlineWorker(this._worker);
            this._worker = null;
        }
    }
}

class Scratch3Handpose2ScratchBlocks {
    get LANDMARK_MENU () {
        const landmarkMenu = [];
        for (let i = 1; i <= 21; i++) {
            landmarkMenu.push({text: `${Message.landmarks[i - 1][this._locale]} (${i})`, value: String(i)});
        }
        return landmarkMenu;
    }

    get VIDEO_MENU () {
        return [
            {
                text: Message.off[this._locale],
                value: 'off'
            },
            {
                text: Message.on[this._locale],
                value: 'on'
            },
            {
                text: Message.video_on_flipped[this._locale],
                value: 'on-flipped'
            }
        ];
    }

    get RATIO_MENU () {
        return [
            {text: '0.5', value: '0.5'},
            {text: '0.75', value: '0.75'},
            {text: '1', value: '1'},
            {text: '1.5', value: '1.5'},
            {text: '2.0', value: '2.0'}
        ];
    }

    constructor (runtime) {
        this.runtime = runtime;
        this.landmarks = [];
        this.ratio = 1;
        this._detector = null;
        this._frameDimensions = STAGE_DIMENSIONS;
        this._handposeReady = false;
        this._handposeStarting = false;
        this._handposeStartPromise = null;
        this._predictionTimeout = null;
        this._predictionInFlight = false;
        this._profile = null;
        this._usingWorker = false;
        this._fallbackAttempted = false;
    }

    _getVideoDevice () {
        return this.runtime.ioDevices && this.runtime.ioDevices.video;
    }

    _getPerformanceProfile (forceMainThread = false) {
        return getTrackingPerformanceProfile({
            allowWorker: !forceMainThread,
            lowEndDimensions: [320, 240],
            standardDimensions: STAGE_DIMENSIONS
        });
    }

    _getDetectorOptions () {
        const profile = this._profile || this._getPerformanceProfile();
        return {
            maxNumHands: 1,
            minDetectionConfidence: profile.isLowPerformance ? 0.45 : 0.55,
            minTrackingConfidence: profile.isLowPerformance ? 0.35 : 0.5,
            modelComplexity: profile.isLowPerformance ? 0 : 1,
            selfieMode: false
        };
    }

    async _createDetector (forceMainThread = false) {
        this._profile = this._getPerformanceProfile(forceMainThread);
        this._frameDimensions = this._profile.dimensions;
        this._usingWorker = this._profile.useWorker && !forceMainThread;

        const detector = this._usingWorker ?
            new WorkerHandsDetector(this._getDetectorOptions()) :
            new MainThreadHandsDetector(this._getDetectorOptions());

        await detector.init();
        return detector;
    }

    _stopPredictionLoop () {
        if (this._predictionTimeout) {
            clearTimeout(this._predictionTimeout);
            this._predictionTimeout = null;
        }
    }

    async _resetHandpose () {
        this._stopPredictionLoop();
        this._predictionInFlight = false;
        this._handposeReady = false;
        this._handposeStarting = false;
        this._handposeStartPromise = null;
        this.landmarks = [];
        if (this._detector) {
            await this._detector.dispose();
            this._detector = null;
        }
    }

    async _captureFrame () {
        const videoDevice = this._getVideoDevice();
        if (!videoDevice || !videoDevice.provider || !videoDevice.videoReady) {
            return null;
        }

        if (this._usingWorker) {
            return createPreviewFrameBitmap(videoDevice, this._frameDimensions, false);
        }
        return getPreviewFrameCanvas(videoDevice, this._frameDimensions, false);
    }

    _projectPoint (point) {
        const videoDevice = this._getVideoDevice();
        return projectPreviewPointToStage(point, this._frameDimensions, {
            mirror: getVideoMirrorState(videoDevice),
            ratio: this.ratio
        });
    }

    async _fallbackToMainThread () {
        if (!this._usingWorker || this._fallbackAttempted) {
            return false;
        }

        this._fallbackAttempted = true;
        if (this._detector) {
            await this._detector.dispose();
        }
        this._detector = await this._createDetector(true);
        this._handposeReady = true;
        return true;
    }

    _startPredictionLoop () {
        if (!this._detector) {
            return;
        }

        this._stopPredictionLoop();
        const intervalMs = this._profile && this._profile.isLowPerformance ? 120 : 66;
        const runPrediction = async () => {
            if (!this._handposeReady || !this._detector || this._predictionInFlight) {
                return;
            }

            this._predictionInFlight = true;
            try {
                const frame = await this._captureFrame();
                if (!frame) {
                    this.landmarks = [];
                } else {
                    this.landmarks = await this._detector.estimate(frame);
                }
            } catch (error) {
                this.landmarks = [];
                const didFallback = await this._fallbackToMainThread();
                if (!didFallback) {
                    this._handposeReady = false;
                }
            } finally {
                this._predictionInFlight = false;
                if (this._handposeReady && this._detector) {
                    this._predictionTimeout = setTimeout(runPrediction, intervalMs);
                }
            }
        };

        runPrediction();
    }

    _ensureHandpose () {
        const videoDevice = this._getVideoDevice();
        if (!videoDevice || !videoDevice.provider) {
            return Promise.resolve(false);
        }

        ensureVideoMirrorState(videoDevice);

        if (this._handposeReady && this._detector && videoDevice.videoReady) {
            if (!this._predictionTimeout) {
                this._startPredictionLoop();
            }
            return Promise.resolve(true);
        }

        if (this._handposeStartPromise) {
            return this._handposeStartPromise;
        }

        this._handposeStarting = true;
        this._handposeStartPromise = Promise.resolve(videoDevice.enableVideo())
            .then(() => waitForVideoReady(videoDevice.provider.video))
            .then(videoReady => {
                if (!videoReady) {
                    return false;
                }
                return this._createDetector()
                    .catch(() => this._createDetector(true))
                    .then(detector => {
                        this._detector = detector;
                        this._handposeReady = true;
                        this._fallbackAttempted = !this._usingWorker;
                        this._startPredictionLoop();
                        return true;
                    });
            })
            .catch(() => false)
            .then(result => {
                this._handposeStarting = false;
                this._handposeStartPromise = null;
                if (!result) {
                    return this._resetHandpose().then(() => false);
                }
                return result;
            });

        return this._handposeStartPromise;
    }

    getInfo () {
        this._locale = this.setLocale();

        return {
            id: 'handpose2scratch',
            name: 'Handpose2Scratch',
            blockIconURI,
            blocks: [
                {
                    opcode: 'getX',
                    blockType: BlockType.REPORTER,
                    text: Message.getX[this._locale],
                    arguments: {
                        LANDMARK: {
                            defaultValue: '1',
                            menu: 'landmark',
                            type: ArgumentType.STRING
                        }
                    }
                },
                {
                    opcode: 'getY',
                    blockType: BlockType.REPORTER,
                    text: Message.getY[this._locale],
                    arguments: {
                        LANDMARK: {
                            defaultValue: '1',
                            menu: 'landmark',
                            type: ArgumentType.STRING
                        }
                    }
                },
                {
                    opcode: 'getZ',
                    blockType: BlockType.REPORTER,
                    text: Message.getZ[this._locale],
                    arguments: {
                        LANDMARK: {
                            defaultValue: '1',
                            menu: 'landmark',
                            type: ArgumentType.STRING
                        }
                    }
                },
                {
                    opcode: 'videoToggle',
                    blockType: BlockType.COMMAND,
                    text: Message.videoToggle[this._locale],
                    arguments: {
                        VIDEO_STATE: {
                            defaultValue: 'off',
                            menu: 'videoMenu',
                            type: ArgumentType.STRING
                        }
                    }
                },
                {
                    opcode: 'setVideoTransparency',
                    text: formatMessage({
                        default: 'set video transparency to [TRANSPARENCY]',
                        description: 'Controls transparency of the video preview layer',
                        id: 'videoSensing.setVideoTransparency'
                    }),
                    arguments: {
                        TRANSPARENCY: {
                            defaultValue: 50,
                            type: ArgumentType.NUMBER
                        }
                    }
                },
                {
                    opcode: 'setRatio',
                    blockType: BlockType.COMMAND,
                    text: Message.setRatio[this._locale],
                    arguments: {
                        RATIO: {
                            defaultValue: '1',
                            menu: 'ratioMenu',
                            type: ArgumentType.STRING
                        }
                    }
                }
            ],
            menus: {
                landmark: {
                    acceptReporters: true,
                    items: this.LANDMARK_MENU
                },
                ratioMenu: {
                    acceptReporters: true,
                    items: this.RATIO_MENU
                },
                videoMenu: {
                    acceptReporters: true,
                    items: this.VIDEO_MENU
                }
            }
        };
    }

    getX (args) {
        if (!this._handposeReady) {
            this._ensureHandpose();
        }
        const landmark = this.landmarks[parseInt(args.LANDMARK, 10) - 1];
        if (!landmark) {
            return '';
        }
        return this._projectPoint(landmark).x;
    }

    getY (args) {
        if (!this._handposeReady) {
            this._ensureHandpose();
        }
        const landmark = this.landmarks[parseInt(args.LANDMARK, 10) - 1];
        if (!landmark) {
            return '';
        }
        return this._projectPoint(landmark).y;
    }

    getZ (args) {
        if (!this._handposeReady) {
            this._ensureHandpose();
        }
        const landmark = this.landmarks[parseInt(args.LANDMARK, 10) - 1];
        if (!landmark) {
            return '';
        }
        return landmark.z;
    }

    videoToggle (args) {
        const state = args.VIDEO_STATE;
        if (state === 'off') {
            this.runtime.ioDevices.video.disableVideo();
            this._resetHandpose();
            return;
        }

        const mirror = state === 'on';
        this.runtime.ioDevices.video.mirror = mirror;
        if (this.runtime.ioDevices.video.provider) {
            this.runtime.ioDevices.video.provider.mirror = mirror;
        }
        this._ensureHandpose();
    }

    setVideoTransparency (args) {
        const transparency = Cast.toNumber(args.TRANSPARENCY);
        this.globalVideoTransparency = transparency;
        this.runtime.ioDevices.video.setPreviewGhost(transparency);
    }

    setRatio (args) {
        const nextRatio = parseFloat(args.RATIO);
        this.ratio = Number.isFinite(nextRatio) ? nextRatio : 1;
    }

    setLocale () {
        const locale = formatMessage.setup().locale;
        if (AvailableLocales.includes(locale)) {
            return locale;
        }
        return 'en';
    }
}

module.exports = Scratch3Handpose2ScratchBlocks;
