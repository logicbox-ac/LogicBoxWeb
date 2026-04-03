const STAGE_DIMENSIONS = [480, 360];
const CANVAS_FORMAT = 'canvas';

const HANDS_BASE_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240';
const FACE_MESH_BASE_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619';

const getGlobalScope = () => {
    if (typeof globalThis !== 'undefined') {
        return globalThis;
    }
    if (typeof window !== 'undefined') {
        return window;
    }
    return {};
};

const getCachedStore = key => {
    const scope = getGlobalScope();
    if (!scope[key]) {
        scope[key] = Object.create(null);
    }
    return scope[key];
};

const getTrackingPerformanceProfile = ({
    allowWorker = true,
    lowEndDimensions = [320, 240],
    standardDimensions = STAGE_DIMENSIONS
} = {}) => {
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
    const supportsWorker =
        allowWorker &&
        typeof Worker !== 'undefined' &&
        typeof URL !== 'undefined' &&
        typeof Blob !== 'undefined' &&
        typeof createImageBitmap === 'function';

    return {
        dimensions: isLowPerformance ? lowEndDimensions : standardDimensions,
        isLowPerformance,
        isMobile,
        useWorker: Boolean(supportsWorker && isMobile)
    };
};

const waitForVideoReady = video => new Promise(resolve => {
    if (!video) {
        resolve(false);
        return;
    }

    const isReady = () =>
        video.readyState >= 2 &&
        video.videoWidth > 0 &&
        video.videoHeight > 0 &&
        !video.ended;

    if (isReady()) {
        resolve(true);
        return;
    }

    let timeoutId = null;
    let onReady = null;
    const cleanup = () => {
        if (timeoutId !== null) {
            clearTimeout(timeoutId);
        }
        ['loadedmetadata', 'loadeddata', 'canplay', 'playing'].forEach(eventName => {
            video.removeEventListener(eventName, onReady);
        });
    };

    onReady = () => {
        if (!isReady()) {
            return;
        }
        cleanup();
        resolve(true);
    };

    ['loadedmetadata', 'loadeddata', 'canplay', 'playing'].forEach(eventName => {
        video.addEventListener(eventName, onReady);
    });

    timeoutId = setTimeout(() => {
        cleanup();
        resolve(isReady());
    }, 5000);

    try {
        const playPromise = video.play && video.play();
        Promise.resolve(playPromise).catch(() => null);
    } catch (error) {
        // Ignore autoplay rejections and rely on the readiness timeout.
    }
});

const loadBrowserScript = (url, globalName) => {
    const scope = getGlobalScope();
    if (scope[globalName]) {
        return Promise.resolve(scope[globalName]);
    }

    if (typeof document === 'undefined') {
        return Promise.reject(new Error(`Cannot load ${globalName} outside the browser`));
    }

    const loaders = getCachedStore('__logicboxMediaPipeScriptLoaders');
    if (loaders[url]) {
        return loaders[url];
    }

    loaders[url] = new Promise((resolve, reject) => {
        const existingScript = document.querySelector(`script[data-logicbox-src="${url}"]`);
        if (existingScript) {
            existingScript.addEventListener('load', () => resolve(scope[globalName]));
            existingScript.addEventListener('error', () => reject(new Error(`Failed to load ${url}`)));
            return;
        }

        const script = document.createElement('script');
        script.async = true;
        script.defer = true;
        script.src = url;
        script.dataset.logicboxSrc = url;
        script.onload = () => resolve(scope[globalName]);
        script.onerror = () => reject(new Error(`Failed to load ${url}`));
        document.head.appendChild(script);
    });

    return loaders[url];
};

const createInlineWorker = source => {
    const blob = new Blob([source], {type: 'application/javascript'});
    const workerUrl = URL.createObjectURL(blob);
    const worker = new Worker(workerUrl);
    worker.__logicboxUrl = workerUrl;
    return worker;
};

const destroyInlineWorker = worker => {
    if (!worker) {
        return;
    }
    worker.terminate();
    if (worker.__logicboxUrl) {
        URL.revokeObjectURL(worker.__logicboxUrl);
    }
};

const getPreviewFrameCanvas = (videoDevice, dimensions, mirror) => {
    if (!videoDevice || !videoDevice.provider || !videoDevice.provider.getFrame) {
        return null;
    }

    return videoDevice.provider.getFrame({
        cacheTimeout: 0,
        dimensions,
        format: CANVAS_FORMAT,
        mirror
    });
};

const createPreviewFrameBitmap = async (videoDevice, dimensions, mirror) => {
    const canvas = getPreviewFrameCanvas(videoDevice, dimensions, mirror);
    if (!canvas || typeof createImageBitmap !== 'function') {
        return null;
    }
    return createImageBitmap(canvas);
};

const getVideoMirrorState = videoDevice => {
    if (videoDevice && typeof videoDevice.mirror === 'boolean') {
        return videoDevice.mirror;
    }

    if (videoDevice && videoDevice.provider && typeof videoDevice.provider.mirror === 'boolean') {
        return videoDevice.provider.mirror;
    }

    return true;
};

const ensureVideoMirrorState = videoDevice => {
    const mirror = getVideoMirrorState(videoDevice);
    if (videoDevice && typeof videoDevice.mirror !== 'boolean') {
        videoDevice.mirror = mirror;
    }
    if (videoDevice && videoDevice.provider && typeof videoDevice.provider.mirror !== 'boolean') {
        videoDevice.provider.mirror = mirror;
    }
    return mirror;
};

const closeFrame = frame => {
    if (frame && typeof frame.close === 'function') {
        frame.close();
    }
};

const projectPreviewPointToStage = (point, dimensions, {
    mirror = false,
    ratio = 1
} = {}) => {
    if (!point || !dimensions || dimensions.length !== 2) {
        return null;
    }

    const [inputWidth, inputHeight] = dimensions;
    const pixelX = (typeof point.x === 'number' ? point.x : 0) * inputWidth;
    const pixelY = (typeof point.y === 'number' ? point.y : 0) * inputHeight;
    const scaledPixelX = pixelX * (STAGE_DIMENSIONS[0] / inputWidth);
    const stageX = (mirror ?
        (STAGE_DIMENSIONS[0] / 2) - scaledPixelX :
        scaledPixelX - (STAGE_DIMENSIONS[0] / 2)) * ratio;
    const stageY = ((STAGE_DIMENSIONS[1] / 2) - (pixelY * (STAGE_DIMENSIONS[1] / inputHeight))) * ratio;

    return {
        x: stageX,
        y: stageY,
        z: typeof point.z === 'number' ? point.z : 0
    };
};

module.exports = {
    CANVAS_FORMAT,
    FACE_MESH_BASE_URL,
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
};
