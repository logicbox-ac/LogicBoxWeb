const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');
const Cast = require('../../util/cast');
const formatMessage = require('format-message');
const {
    FACE_MESH_BASE_URL,
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
        'ja': '[PERSON_NUMBER] 人目の [KEYPOINT] のx座標',
        'ja-Hira': '[PERSON_NUMBER] にんめの [KEYPOINT] のxざひょう',
        'en': 'x of person [PERSON_NUMBER], point [KEYPOINT]'
    },
    getY: {
        'ja': '[PERSON_NUMBER] 人目の [KEYPOINT] のy座標',
        'ja-Hira': '[PERSON_NUMBER] にんめの [KEYPOINT] のyざひょう',
        'en': 'y of person [PERSON_NUMBER], point [KEYPOINT]'
    },
    peopleCount: {
        'ja': '人数',
        'ja-Hira': 'にんずう',
        'en': 'people count'
    },
    videoToggle: {
        'ja': 'ビデオを [VIDEO_STATE] にする',
        'ja-Hira': 'ビデオを [VIDEO_STATE] にする',
        'en': 'turn video [VIDEO_STATE]'
    },
    setRatio: {
        'ja': '倍率を [RATIO] にする',
        'ja-Hira': 'ばいりつを [RATIO] にする',
        'en': 'set ratio to [RATIO]'
    },
    on: {
        'ja': '入',
        'ja-Hira': 'いり',
        'en': 'on'
    },
    off: {
        'ja': '切',
        'ja-Hira': 'きり',
        'en': 'off'
    },
    video_on_flipped: {
        'ja': '左右反転',
        'ja-Hira': 'さゆうはんてん',
        'en': 'on flipped'
    }
};

const FACEMESH_KEYPOINT_TOTAL = 468;

const FACEMESH_KEYPOINT_GROUPS = [
    {
        label: 'nose',
        indices: [168, 6, 197, 195, 5, 4, 1, 19, 94, 2, 98, 97, 326, 327, 294, 278, 344, 440, 275, 45, 220, 115, 48, 64]
    },
    {
        label: 'mouth / lips',
        indices: [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 185, 40, 39, 37, 0, 267, 269, 270, 409, 78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308, 191, 80, 81, 82, 13, 312, 311, 310, 415]
    },
    {
        label: 'left eye',
        indices: [263, 249, 390, 373, 374, 380, 381, 382, 362, 466, 388, 387, 386, 385, 384, 398]
    },
    {
        label: 'right eye',
        indices: [33, 7, 163, 144, 145, 153, 154, 155, 133, 246, 161, 160, 159, 158, 157, 173]
    },
    {
        label: 'left eyebrow',
        indices: [276, 283, 282, 295, 285, 300, 293, 334, 296, 336]
    },
    {
        label: 'right eyebrow',
        indices: [46, 53, 52, 65, 55, 70, 63, 105, 66, 107]
    },
    {
        label: 'face outline',
        indices: [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109]
    }
];

const buildKeypointMenu = () => {
    const keypointMenu = [];
    const seenValues = new Set();

    FACEMESH_KEYPOINT_GROUPS.forEach(group => {
        group.indices.forEach((index, indexInGroup) => {
            const value = String(index + 1);
            if (seenValues.has(value)) {
                return;
            }
            seenValues.add(value);
            keypointMenu.push({
                text: `${group.label} ${indexInGroup + 1} (${value})`,
                value
            });
        });
    });

    for (let i = 1; i <= FACEMESH_KEYPOINT_TOTAL; i++) {
        const value = String(i);
        if (seenValues.has(value)) {
            continue;
        }
        keypointMenu.push({
            text: `other face point (${value})`,
            value
        });
    }

    return keypointMenu;
};

const AvailableLocales = ['en', 'ja', 'ja-Hira'];

const simplifyFaceResults = results => {
    if (!results || !results.multiFaceLandmarks || !results.multiFaceLandmarks.length) {
        return [];
    }

    return results.multiFaceLandmarks.map(face =>
        face.slice(0, 468).map(point => ({
            x: typeof point.x === 'number' ? point.x : 0,
            y: typeof point.y === 'number' ? point.y : 0,
            z: typeof point.z === 'number' ? point.z : 0
        }))
    );
};

const buildFaceWorkerSource = () => `
let faceMesh = null;
let currentRequestId = null;
const faceMeshBaseUrl = ${JSON.stringify(FACE_MESH_BASE_URL)};
const simplifyFaceResults = results => {
    if (!results || !results.multiFaceLandmarks || !results.multiFaceLandmarks.length) {
        return [];
    }
    return results.multiFaceLandmarks.map(face =>
        face.slice(0, 468).map(point => ({
            x: typeof point.x === 'number' ? point.x : 0,
            y: typeof point.y === 'number' ? point.y : 0,
            z: typeof point.z === 'number' ? point.z : 0
        }))
    );
};
self.onmessage = async event => {
    const data = event.data || {};
    if (data.type === 'init') {
        try {
            importScripts(faceMeshBaseUrl + '/face_mesh.js');
            const FaceMeshCtor = self.FaceMesh || FaceMesh;
            faceMesh = new FaceMeshCtor({
                locateFile: file => faceMeshBaseUrl + '/' + file
            });
            faceMesh.setOptions(data.options || {});
            faceMesh.onResults(results => {
                const requestId = currentRequestId;
                currentRequestId = null;
                self.postMessage({
                    faces: simplifyFaceResults(results),
                    requestId,
                    type: 'result'
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
        if (!faceMesh) {
            if (data.frame && data.frame.close) {
                data.frame.close();
            }
            self.postMessage({faces: [], requestId: data.requestId, type: 'result'});
            return;
        }
        currentRequestId = data.requestId;
        try {
            await faceMesh.send({image: data.frame});
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
                self.postMessage({faces: [], requestId: data.requestId, type: 'result'});
            }
        }
        return;
    }
    if (data.type === 'dispose') {
        try {
            if (faceMesh && typeof faceMesh.close === 'function') {
                await faceMesh.close();
            }
        } catch (error) {
            // Ignore shutdown races.
        }
        faceMesh = null;
        self.close();
    }
};
`;

class MainThreadFaceDetector {
    constructor (options) {
        this._options = options;
        this._detector = null;
        this._pendingRequest = null;
    }

    async init () {
        const scope = typeof window !== 'undefined' ? window : globalThis;
        await loadBrowserScript(`${FACE_MESH_BASE_URL}/face_mesh.js`, 'FaceMesh');
        const FaceMeshCtor = scope.FaceMesh;
        this._detector = new FaceMeshCtor({
            locateFile: file => `${FACE_MESH_BASE_URL}/${file}`
        });
        this._detector.setOptions(this._options);
        this._detector.onResults(results => {
            const pendingRequest = this._pendingRequest;
            this._pendingRequest = null;
            if (pendingRequest) {
                pendingRequest.resolve(simplifyFaceResults(results));
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

class WorkerFaceDetector {
    constructor (options) {
        this._options = options;
        this._worker = null;
        this._nextRequestId = 1;
        this._pendingRequests = new Map();
    }

    async init () {
        this._worker = createInlineWorker(buildFaceWorkerSource());
        this._worker.onmessage = this._handleMessage.bind(this);

        await new Promise((resolve, reject) => {
            const cleanup = () => {
                this._worker.removeEventListener('error', onError);
                this._worker.removeEventListener('message', onMessage);
            };
            const onError = event => {
                cleanup();
                reject(event.error || new Error('Face worker failed to initialize'));
            };
            const onMessage = event => {
                const data = event.data || {};
                if (data.type === 'ready') {
                    cleanup();
                    resolve();
                } else if (data.type === 'error' && data.phase === 'init') {
                    cleanup();
                    reject(new Error(data.message || 'Face worker failed to initialize'));
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
            pendingRequest.reject(new Error(data.message || 'Face worker estimate failed'));
            return;
        }

        pendingRequest.resolve(Array.isArray(data.faces) ? data.faces : []);
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

class Scratch3Facemesh2ScratchBlocks {
    get PERSON_NUMBER_MENU () {
        const personNumberMenu = [];
        for (let i = 1; i <= 10; i++) {
            personNumberMenu.push({text: String(i), value: String(i)});
        }
        return personNumberMenu;
    }

    get KEYPOINT_MENU () {
        return buildKeypointMenu();
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
        this.faces = [];
        this.ratio = 1;
        this._detector = null;
        this._frameDimensions = STAGE_DIMENSIONS;
        this._facemeshReady = false;
        this._facemeshStartPromise = null;
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
            maxNumFaces: 1,
            minDetectionConfidence: profile.isLowPerformance ? 0.45 : 0.55,
            minTrackingConfidence: profile.isLowPerformance ? 0.35 : 0.5,
            refineLandmarks: false,
            selfieMode: false
        };
    }

    async _createDetector (forceMainThread = false) {
        this._profile = this._getPerformanceProfile(forceMainThread);
        this._frameDimensions = this._profile.dimensions;
        this._usingWorker = this._profile.useWorker && !forceMainThread;

        const detector = this._usingWorker ?
            new WorkerFaceDetector(this._getDetectorOptions()) :
            new MainThreadFaceDetector(this._getDetectorOptions());

        await detector.init();
        return detector;
    }

    _stopPredictionLoop () {
        if (this._predictionTimeout) {
            clearTimeout(this._predictionTimeout);
            this._predictionTimeout = null;
        }
    }

    async _resetFacemesh () {
        this._stopPredictionLoop();
        this._predictionInFlight = false;
        this._facemeshReady = false;
        this._facemeshStartPromise = null;
        this.faces = [];
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
        this._facemeshReady = true;
        return true;
    }

    _startPredictionLoop () {
        if (!this._detector) {
            return;
        }

        this._stopPredictionLoop();
        const intervalMs = this._profile && this._profile.isLowPerformance ? 140 : 80;
        const runPrediction = async () => {
            if (!this._facemeshReady || !this._detector || this._predictionInFlight) {
                return;
            }

            this._predictionInFlight = true;
            try {
                const frame = await this._captureFrame();
                if (!frame) {
                    this.faces = [];
                } else {
                    this.faces = await this._detector.estimate(frame);
                }
            } catch (error) {
                this.faces = [];
                const didFallback = await this._fallbackToMainThread();
                if (!didFallback) {
                    this._facemeshReady = false;
                }
            } finally {
                this._predictionInFlight = false;
                if (this._facemeshReady && this._detector) {
                    this._predictionTimeout = setTimeout(runPrediction, intervalMs);
                }
            }
        };

        runPrediction();
    }

    _ensureFacemesh () {
        const videoDevice = this._getVideoDevice();
        if (!videoDevice || !videoDevice.provider) {
            return Promise.resolve(false);
        }

        ensureVideoMirrorState(videoDevice);

        if (this._facemeshReady && this._detector && videoDevice.videoReady) {
            if (!this._predictionTimeout) {
                this._startPredictionLoop();
            }
            return Promise.resolve(true);
        }

        if (this._facemeshStartPromise) {
            return this._facemeshStartPromise;
        }

        this._facemeshStartPromise = Promise.resolve(videoDevice.enableVideo())
            .then(() => waitForVideoReady(videoDevice.provider.video))
            .then(videoReady => {
                if (!videoReady) {
                    return false;
                }
                return this._createDetector()
                    .catch(() => this._createDetector(true))
                    .then(detector => {
                        this._detector = detector;
                        this._facemeshReady = true;
                        this._fallbackAttempted = !this._usingWorker;
                        this._startPredictionLoop();
                        return true;
                    });
            })
            .catch(() => false)
            .then(result => {
                this._facemeshStartPromise = null;
                if (!result) {
                    return this._resetFacemesh().then(() => false);
                }
                return result;
            });

        return this._facemeshStartPromise;
    }

    getInfo () {
        this._locale = this.setLocale();

        return {
            id: 'facemesh2scratch',
            name: 'Facemesh2Scratch',
            blockIconURI,
            blocks: [
                {
                    opcode: 'getX',
                    blockType: BlockType.REPORTER,
                    text: Message.getX[this._locale],
                    arguments: {
                        PERSON_NUMBER: {
                            defaultValue: '1',
                            menu: 'personNumberMenu',
                            type: ArgumentType.STRING
                        },
                        KEYPOINT: {
                            defaultValue: '169',
                            menu: 'keypointMenu',
                            type: ArgumentType.STRING
                        }
                    }
                },
                {
                    opcode: 'getY',
                    blockType: BlockType.REPORTER,
                    text: Message.getY[this._locale],
                    arguments: {
                        PERSON_NUMBER: {
                            defaultValue: '1',
                            menu: 'personNumberMenu',
                            type: ArgumentType.STRING
                        },
                        KEYPOINT: {
                            defaultValue: '169',
                            menu: 'keypointMenu',
                            type: ArgumentType.STRING
                        }
                    }
                },
                {
                    opcode: 'getPeopleCount',
                    blockType: BlockType.REPORTER,
                    text: Message.peopleCount[this._locale]
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
                keypointMenu: {
                    acceptReporters: true,
                    items: this.KEYPOINT_MENU
                },
                personNumberMenu: {
                    acceptReporters: true,
                    items: this.PERSON_NUMBER_MENU
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
        if (!this._facemeshReady) {
            this._ensureFacemesh();
        }

        const faceIndex = parseInt(args.PERSON_NUMBER, 10) - 1;
        const keypointIndex = parseInt(args.KEYPOINT, 10) - 1;
        const point = this.faces[faceIndex] && this.faces[faceIndex][keypointIndex];
        if (!point) {
            return '';
        }
        return this._projectPoint(point).x;
    }

    getY (args) {
        if (!this._facemeshReady) {
            this._ensureFacemesh();
        }

        const faceIndex = parseInt(args.PERSON_NUMBER, 10) - 1;
        const keypointIndex = parseInt(args.KEYPOINT, 10) - 1;
        const point = this.faces[faceIndex] && this.faces[faceIndex][keypointIndex];
        if (!point) {
            return '';
        }
        return this._projectPoint(point).y;
    }

    getPeopleCount () {
        if (!this._facemeshReady) {
            this._ensureFacemesh();
        }
        return this.faces.length;
    }

    videoToggle (args) {
        const state = args.VIDEO_STATE;
        if (state === 'off') {
            this.runtime.ioDevices.video.disableVideo();
            this._resetFacemesh();
            return;
        }

        const mirror = state === 'on';
        this.runtime.ioDevices.video.mirror = mirror;
        if (this.runtime.ioDevices.video.provider) {
            this.runtime.ioDevices.video.provider.mirror = mirror;
        }
        this._ensureFacemesh();
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

module.exports = Scratch3Facemesh2ScratchBlocks;
