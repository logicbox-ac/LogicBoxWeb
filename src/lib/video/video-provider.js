import {requestVideoStream, requestDisableVideo} from './camera.js';
import log from '../log.js';

const DEFAULT_VIDEO_ASPECT_RATIO = 4 / 3;

const getVideoPerformanceProfile = () => {
    const nav = typeof navigator === 'undefined' ? null : navigator;
    const connection = nav && nav.connection ? nav.connection : null;
    const effectiveType = connection && connection.effectiveType ? connection.effectiveType : '';
    const saveData = Boolean(connection && connection.saveData);
    const deviceMemory = nav && typeof nav.deviceMemory === 'number' ? nav.deviceMemory : null;
    const hardwareConcurrency = nav && typeof nav.hardwareConcurrency === 'number' ? nav.hardwareConcurrency : null;
    const isMobileUserAgent = nav && typeof nav.userAgent === 'string' ?
        /android|iphone|ipad|ipod|mobile/i.test(nav.userAgent) :
        false;
    const isNarrowViewport = typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(max-width: 767px)').matches;
    const isMobile = isMobileUserAgent || isNarrowViewport;
    const isLowPerformance = saveData ||
        effectiveType === 'slow-2g' ||
        effectiveType === '2g' ||
        (deviceMemory !== null && deviceMemory <= 4) ||
        (hardwareConcurrency !== null && hardwareConcurrency <= 4);

    return {
        isLowPerformance,
        isMobile
    };
};

const getPreferredVideoConstraints = () => {
    const profile = getVideoPerformanceProfile();
    if (profile.isLowPerformance) {
        return {
            width: {ideal: 320, max: 480},
            height: {ideal: 240, max: 360},
            aspectRatio: {ideal: DEFAULT_VIDEO_ASPECT_RATIO}
        };
    }

    if (profile.isMobile) {
        return {
            width: {ideal: 480, max: 640},
            height: {ideal: 360, max: 480},
            aspectRatio: {ideal: DEFAULT_VIDEO_ASPECT_RATIO}
        };
    }

    return {
        width: {min: 480, ideal: 640},
        height: {min: 360, ideal: 480},
        aspectRatio: {ideal: DEFAULT_VIDEO_ASPECT_RATIO}
    };
};

const getVideoProjection = ({sourceWidth, sourceHeight, targetWidth, targetHeight}) => {
    if (!sourceWidth || !sourceHeight || !targetWidth || !targetHeight) {
        return null;
    }

    const scale = Math.min(targetWidth / sourceWidth, targetHeight / sourceHeight);
    const drawWidth = sourceWidth * scale;
    const drawHeight = sourceHeight * scale;

    return {
        drawHeight,
        drawWidth,
        offsetX: (targetWidth - drawWidth) / 2,
        offsetY: (targetHeight - drawHeight) / 2,
        scale,
        sourceHeight,
        sourceWidth,
        targetHeight,
        targetWidth
    };
};

const configureVideoElement = video => {
    if (!video) return;
    video.muted = true;
    video.autoplay = true;
    video.preload = 'auto';
    video.playsInline = true;
    video.setAttribute('muted', '');
    video.setAttribute('autoplay', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
};

const mountVideoElement = video => {
    if (!video || typeof document === 'undefined' || video.isConnected) {
        return;
    }

    video.setAttribute('aria-hidden', 'true');
    video.style.position = 'fixed';
    video.style.left = '-10000px';
    video.style.top = '0';
    video.style.width = '1px';
    video.style.height = '1px';
    video.style.opacity = '0';
    video.style.pointerEvents = 'none';
    video.style.zIndex = '-1';

    const mountTarget = document.body || document.documentElement;
    if (mountTarget) {
        mountTarget.appendChild(video);
    }
};

const unmountVideoElement = video => {
    if (video && video.parentNode) {
        video.parentNode.removeChild(video);
    }
};

const waitForVideoMetadata = video => new Promise(resolve => {
    if (!video) {
        resolve();
        return;
    }
    const isReady = () => video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0;
    if (isReady()) {
        resolve();
        return;
    }
    let timeoutId = null;
    let onReady = null;
    const cleanup = () => {
        if (timeoutId !== null) {
            clearTimeout(timeoutId);
        }
        video.removeEventListener('loadedmetadata', onReady);
        video.removeEventListener('loadeddata', onReady);
        video.removeEventListener('canplay', onReady);
        video.removeEventListener('playing', onReady);
    };
    onReady = () => {
        if (!isReady()) return;
        cleanup();
        resolve();
    };
    video.addEventListener('loadedmetadata', onReady);
    video.addEventListener('loadeddata', onReady);
    video.addEventListener('canplay', onReady);
    video.addEventListener('playing', onReady);
    timeoutId = setTimeout(() => {
        cleanup();
        resolve();
    }, 5000);
});

/**
 * Video Manager for video extensions.
 */
class VideoProvider {
    constructor () {
        /**
         * Default value for mirrored frames.
         * @type boolean
         */
        this.mirror = true;

        /**
         * Cache frames for this many ms.
         * @type number
         */
        this._frameCacheTimeout = 16;

        /**
         * DOM Video element
         * @private
         */
        this._video = null;

        /**
         * Usermedia stream track
         * @private
         */
        this._track = null;

        /**
         * Stores some canvas/frame data per resolution/mirror states
         */
        this._workspace = [];
    }

    static get FORMAT_IMAGE_DATA () {
        return 'image-data';
    }

    static get FORMAT_CANVAS () {
        return 'canvas';
    }

    /**
     * Dimensions the video stream is analyzed at after its rendered to the
     * sample canvas.
     * @type {Array.<number>}
     */
    static get DIMENSIONS () {
        return [480, 360];
    }

    /**
     * Order preview drawable is inserted at in the renderer.
     * @type {number}
     */
    static get ORDER () {
        return 1;
    }

    /**
     * Get the HTML video element containing the stream
     */
    get video () {
        return this._video;
    }

    getPerformanceProfile () {
        return getVideoPerformanceProfile();
    }

    getPreviewProjection ({
        dimensions = VideoProvider.DIMENSIONS
    } = {}) {
        if (!this.videoReady) {
            return null;
        }

        const [targetWidth, targetHeight] = dimensions;
        return getVideoProjection({
            sourceHeight: this._video.videoHeight,
            sourceWidth: this._video.videoWidth,
            targetHeight,
            targetWidth
        });
    }

    projectVideoPointToStage (x, y, {
        dimensions = VideoProvider.DIMENSIONS,
        mirror = this.mirror
    } = {}) {
        const projection = this.getPreviewProjection({dimensions});
        if (!projection) {
            return null;
        }

        const stageX = mirror ?
            (projection.targetWidth / 2) - (projection.offsetX + (x * projection.scale)) :
            (projection.offsetX + (x * projection.scale)) - (projection.targetWidth / 2);
        const stageY = (projection.targetHeight / 2) - (projection.offsetY + (y * projection.scale));

        return {
            projection,
            x: stageX,
            y: stageY
        };
    }

    /**
     * Request video be enabled.  Sets up video, creates video skin and enables preview.
     *
     * @return {Promise.<Video>} resolves a promise to this video provider when video is ready.
     */
    enableVideo () {
        this.enabled = true;
        return this._setupVideo();
    }

    /**
     * Disable video stream (turn video off)
     */
    disableVideo () {
        this.enabled = false;
        // If we have begun a setup process, call _teardown after it completes
        if (this._singleSetup) {
            this._singleSetup
                .then(this._teardown.bind(this))
                .catch(err => this.onError(err));
        }
    }

    /**
     * async part of disableVideo
     * @private
     */
    _teardown () {
        // we might be asked to re-enable before _teardown is called, just ignore it.
        if (this.enabled === false) {
            const disableTrack = requestDisableVideo();
            this._singleSetup = null;
            // by clearing refs to video and track, we should lose our hold over the camera
            if (this._video) {
                try {
                    this._video.pause();
                } catch (error) {
                    log.warn('Could not pause hidden video element during teardown', error);
                }
                try {
                    this._video.srcObject = null;
                } catch (error) {
                    this._video.src = '';
                }
                unmountVideoElement(this._video);
            }
            this._video = null;
            if (this._track && disableTrack) {
                this._track.stop();
            }
            this._track = null;
        }
    }

    /**
     * Return frame data from the video feed in a specified dimensions, format, and mirroring.
     *
     * @param {object} frameInfo A descriptor of the frame you would like to receive.
     * @param {Array.<number>} frameInfo.dimensions [width, height] array of numbers.  Defaults to [480,360]
     * @param {boolean} frameInfo.mirror If you specificly want a mirror/non-mirror frame, defaults to true
     * @param {string} frameInfo.format Requested video format, available formats are 'image-data' and 'canvas'.
     * @param {number} frameInfo.cacheTimeout Will reuse previous image data if the time since capture is less than
     *                                        the cacheTimeout.  Defaults to 16ms.
     *
     * @return {ArrayBuffer|Canvas|string|null} Frame data in requested format, null when errors.
     */
    getFrame ({
        dimensions = VideoProvider.DIMENSIONS,
        mirror = this.mirror,
        format = VideoProvider.FORMAT_IMAGE_DATA,
        cacheTimeout = this._frameCacheTimeout
    }) {
        if (!this.videoReady) {
            return null;
        }
        const [width, height] = dimensions;
        const workspace = this._getWorkspace({dimensions, mirror: Boolean(mirror)});
        const {videoWidth, videoHeight} = this._video;
        const {canvas, context, lastUpdate, cacheData} = workspace;
        const now = Date.now();
        const projection = getVideoProjection({
            sourceHeight: videoHeight,
            sourceWidth: videoWidth,
            targetHeight: height,
            targetWidth: width
        });

        // if the canvas hasn't been updated...
        if (lastUpdate + cacheTimeout < now) {
            context.clearRect(0, 0, width, height);

            if (mirror) {
                context.scale(-1, 1);
                context.translate(width * -1, 0);
            }

            context.drawImage(this._video,
                // source x, y, width, height
                0, 0, videoWidth, videoHeight,
                // dest x, y, width, height
                projection.offsetX, projection.offsetY, projection.drawWidth, projection.drawHeight
            );

            // context.resetTransform() doesn't work on Edge but the following should
            context.setTransform(1, 0, 0, 1, 0, 0);
            workspace.lastUpdate = now;
        }

        // each data type has it's own data cache, but the canvas is the same
        if (!cacheData[format]) {
            cacheData[format] = {lastUpdate: 0};
        }
        const formatCache = cacheData[format];

        if (formatCache.lastUpdate + cacheTimeout < now) {
            if (format === VideoProvider.FORMAT_IMAGE_DATA) {
                formatCache.lastData = context.getImageData(0, 0, width, height);
            } else if (format === VideoProvider.FORMAT_CANVAS) {
                // this will never change
                formatCache.lastUpdate = Infinity;
                formatCache.lastData = canvas;
            } else {
                log.error(`video io error - unimplemented format ${format}`);
                // cache the null result forever, don't log about it again..
                formatCache.lastUpdate = Infinity;
                formatCache.lastData = null;
            }

            // rather than set to now, this data is as stale as it's canvas is
            formatCache.lastUpdate = Math.max(workspace.lastUpdate, formatCache.lastUpdate);
        }

        return formatCache.lastData;
    }

    /**
     * Method called when an error happens.  Default implementation is just to log error.
     *
     * @abstract
     * @param {Error} error An error object from getUserMedia or other source of error.
     */
    onError (error) {
        log.error('Unhandled video io device error', error);
    }

    /**
     * Create a video stream.
     * @private
     * @return {Promise} When video has been received, rejected if video is not received
     */
    _setupVideo () {
        // We cache the result of this setup so that we can only ever have a single
        // video/getUserMedia request happen at a time.
        if (this._singleSetup) {
            return this._singleSetup;
        }

        this._singleSetup = requestVideoStream(getPreferredVideoConstraints())
            .then(stream => {
                this._video = document.createElement('video');
                configureVideoElement(this._video);
                mountVideoElement(this._video);

                // Use the new srcObject API, falling back to createObjectURL
                try {
                    this._video.srcObject = stream;
                } catch (error) {
                    this._video.src = window.URL.createObjectURL(stream);
                }
                // Hint to the stream that it should load. A standard way to do this
                // is add the video tag to the DOM. Since this extension wants to
                // hide the video tag and instead render a sample of the stream into
                // the webgl rendered Scratch canvas, another hint like this one is
                // needed.
                let playPromise;
                try {
                    playPromise = this._video.play(); // Needed for Safari/Firefox, Chrome auto-plays.
                } catch (error) {
                    playPromise = Promise.resolve();
                }
                return Promise.resolve(playPromise)
                    .catch(() => null)
                    .then(() => waitForVideoMetadata(this._video))
                    .then(() => {
                        this._track = stream.getTracks()[0];
                        return this;
                    });
            })
            .catch(error => {
                this._singleSetup = null;
                this.onError(error);
            });

        return this._singleSetup;
    }

    get videoReady () {
        if (!this.enabled) {
            return false;
        }
        if (!this._video) {
            return false;
        }
        if (!this._track) {
            return false;
        }
        const {videoWidth, videoHeight} = this._video;
        if (typeof videoWidth !== 'number' || typeof videoHeight !== 'number') {
            return false;
        }
        if (videoWidth === 0 || videoHeight === 0) {
            return false;
        }
        return true;
    }

    /**
     * get an internal workspace for canvas/context/caches
     * this uses some document stuff to create a canvas and what not, probably needs abstraction
     * into the renderer layer?
     * @private
     * @return {object} A workspace for canvas/data storage.  Internal format not documented intentionally
     */
    _getWorkspace ({dimensions, mirror}) {
        let workspace = this._workspace.find(space => (
            space.dimensions.join('-') === dimensions.join('-') &&
            space.mirror === mirror
        ));
        if (!workspace) {
            workspace = {
                dimensions,
                mirror,
                canvas: document.createElement('canvas'),
                lastUpdate: 0,
                cacheData: {}
            };
            workspace.canvas.width = dimensions[0];
            workspace.canvas.height = dimensions[1];
            workspace.context = workspace.canvas.getContext('2d');
            this._workspace.push(workspace);
        }
        return workspace;
    }
}

export default VideoProvider;
