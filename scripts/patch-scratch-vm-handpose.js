#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const patchFilePath = path.join(projectRoot, 'patches', 'scratch-vm+5.0.300.patch');
const scratchVmRoot = path.join(projectRoot, 'node_modules', 'scratch-vm', 'src');
const extensionManagerPath = path.join(
    scratchVmRoot,
    'extension-support',
    'extension-manager.js'
);
const handposeExtensionPath = path.join(
    scratchVmRoot,
    'extensions',
    'scratch3_handpose2scratch',
    'index.js'
);

const VIDEO_SENSING_IMPORT_LINE =
    "    videoSensing: () => require('../extensions/scratch3_video_sensing'),";
const MICROBIT_IMPORT_LINE =
    "    microbit: () => require('../extensions/scratch3_microbit'),";
const ARGUMENT_INFO_COMMENT = `/**
 * @typedef {object} ArgumentInfo - Information about an extension block argument
`;

const HANDPOSE_IMPORT_LINE_OLD =
    "    handpose2scratch: () => require('../extensions/scratch3_handpose2scratch'),";
const ML2SCRATCH_IMPORT_LINE_OLD =
    "    ml2scratch: () => require('../extensions/scratch3_ml2scratch'),";
const FACEMESH2SCRATCH_IMPORT_LINE_OLD =
    "    facemesh2scratch: () => require('../extensions/scratch3_facemesh2scratch'),";
const SPEECH2SCRATCH_IMPORT_LINE_OLD =
    "    speech2scratch: () => require('../extensions/scratch3_speech2scratch'),";
const MICROBIT_MORE_IMPORT_LINE_OLD = `    microbitMore: () => {
        const formatMessage = require('format-message');
        const ext = require('../extensions/microbitMore/microbitMore.mjs');
        const blockClass = ext.blockClass;
        blockClass.formatMessage = formatMessage;
        return blockClass;
    },`;
const CAMERASELECTOR_IMPORT_LINE_OLD = `    cameraselector: () => {
        const formatMessage = require('format-message');
        const ext = require('../extensions/cameraselector/cameraselector.mjs');
        const blockClass = ext.blockClass;
        blockClass.formatMessage = formatMessage;
        return blockClass;
    },`;

const HANDPOSE_IMPORT_LINE = `    handpose2scratch: () => import(
        /* webpackChunkName: "extension-handpose2scratch" */
        '../extensions/scratch3_handpose2scratch/index.js'
    ),`;
const ML2SCRATCH_IMPORT_LINE = `    ml2scratch: () => import(
        /* webpackChunkName: "extension-ml2scratch" */
        '../extensions/scratch3_ml2scratch/index.js'
    ),`;
const FACEMESH2SCRATCH_IMPORT_LINE = `    facemesh2scratch: () => import(
        /* webpackChunkName: "extension-facemesh2scratch" */
        '../extensions/scratch3_facemesh2scratch/index.js'
    ),`;
const SPEECH2SCRATCH_IMPORT_LINE = `    speech2scratch: () => import(
        /* webpackChunkName: "extension-speech2scratch" */
        '../extensions/scratch3_speech2scratch/index.js'
    ),`;
const CAMERASELECTOR_IMPORT_LINE = `    cameraselector: () => import(
        /* webpackChunkName: "extension-cameraselector" */
        '../extensions/cameraselector/cameraselector.mjs'
    ),`;
const MICROBIT_MORE_IMPORT_LINE = `    microbitMore: () => import(
        /* webpackChunkName: "extension-microbit-more" */
        '../extensions/microbitMore/microbitMore.mjs'
    ),`;

const OLD_HANDPOSE_BOOTSTRAP_SNIPPET = `    constructor (runtime) {
        this.runtime = runtime;

        this.landmarks = [];
        this.ratio = 0.75;
        this._handposeModel = null;
        this._handposeReady = false;
        this._handposeStarting = false;
    }

    _ensureHandpose () {
      const videoDevice = this.runtime.ioDevices && this.runtime.ioDevices.video;
      if (!videoDevice || !videoDevice.provider) {
        return Promise.resolve(false);
      }

      if (this._handposeReady || this._handposeStarting) {
        return Promise.resolve(this._handposeReady);
      }

      this._handposeStarting = true;
      return Promise.resolve(videoDevice.enableVideo())
        .then(() => {
          if (!videoDevice.provider || !videoDevice.provider.video) {
            return false;
          }

          this.video = videoDevice.provider.video;
          this._locale = this._locale || this.setLocale();

          alert(Message.please_wait[this._locale]);

          this._handposeModel = ml5.handpose(this.video, () => {});

          this._handposeModel.on('predict', hands => {
            hands.forEach(hand => {
              this.landmarks = hand.landmarks;
            });
          });
          this._handposeReady = true;
          return true;
        })
        .catch(() => false)
        .then(result => {
          this._handposeStarting = false;
          return result;
        });
    }`;

const NEW_HANDPOSE_BOOTSTRAP_SNIPPET = `    constructor (runtime) {
        this.runtime = runtime;

        this.landmarks = [];
        this.ratio = 1;
        this._handposeModel = null;
        this._handposeReady = false;
        this._handposeStarting = false;
        this._handposeStartPromise = null;
        this._predictionTimeout = null;
        this.video = null;
    }

    _getVideoDevice () {
      return this.runtime.ioDevices && this.runtime.ioDevices.video;
    }

    _getPerformanceProfile () {
      const nav = typeof navigator === 'undefined' ? null : navigator;
      const connection = nav && nav.connection ? nav.connection : null;
      const effectiveType = connection && connection.effectiveType ? connection.effectiveType : '';
      const deviceMemory = nav && typeof nav.deviceMemory === 'number' ? nav.deviceMemory : null;
      const hardwareConcurrency = nav && typeof nav.hardwareConcurrency === 'number' ? nav.hardwareConcurrency : null;
      const saveData = Boolean(connection && connection.saveData);

      const isLowPerformance = saveData ||
        effectiveType === 'slow-2g' ||
        effectiveType === '2g' ||
        (deviceMemory !== null && deviceMemory <= 4) ||
        (hardwareConcurrency !== null && hardwareConcurrency <= 4);

      return {
        isLowPerformance,
        predictionIntervalMs: isLowPerformance ? 120 : 66
      };
    }

    _getModelOptions () {
      const profile = this._getPerformanceProfile();
      return {
        detectionConfidence: profile.isLowPerformance ? 0.65 : 0.8,
        flipHorizontal: false,
        iouThreshold: 0.3,
        maxContinuousChecks: profile.isLowPerformance ? 1 : Infinity,
        scoreThreshold: profile.isLowPerformance ? 0.35 : 0.5
      };
    }

    _waitForVideoReady (video) {
      return new Promise(resolve => {
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
          // Ignore play() rejections here and rely on the readiness timeout.
        }
      });
    }

    _stopPredictionLoop () {
      if (this._predictionTimeout) {
        clearTimeout(this._predictionTimeout);
        this._predictionTimeout = null;
      }
    }

    _startPredictionLoop () {
      if (!this._handposeModel || !this.video) {
        return;
      }

      this._stopPredictionLoop();
      const intervalMs = this._getPerformanceProfile().predictionIntervalMs;
      const runPrediction = () => {
        if (!this._handposeModel || !this.video || !this._handposeReady) {
          return;
        }

        Promise.resolve(this._handposeModel.predict(this.video))
          .then(hands => {
            if (!hands || hands.length === 0) {
              this.landmarks = [];
              return;
            }

            this.landmarks = hands[0].landmarks || [];
          })
          .catch(() => {
            this.landmarks = [];
          })
          .then(() => {
            if (this._handposeModel && this.video && this._handposeReady) {
              this._predictionTimeout = setTimeout(runPrediction, intervalMs);
            }
          });
      };

      runPrediction();
    }

    _projectPoint (point) {
      const videoDevice = this._getVideoDevice();
      const provider = videoDevice && videoDevice.provider;
      if (provider && provider.projectVideoPointToStage) {
        const projectedPoint = provider.projectVideoPointToStage(
          point[0],
          point[1],
          {mirror: videoDevice.mirror}
        );
        if (projectedPoint) {
          return {
            x: projectedPoint.x * this.ratio,
            y: projectedPoint.y * this.ratio
          };
        }
      }

      const legacyScale = 0.75 * this.ratio;
      return {
        x: videoDevice && videoDevice.mirror === false ?
          (point[0] * legacyScale) - 240 :
          240 - (point[0] * legacyScale),
        y: 180 - (point[1] * legacyScale)
      };
    }

    _resetHandpose () {
      this._stopPredictionLoop();
      if (this._handposeModel) {
        try {
          this._handposeModel.video = null;
        } catch (error) {
          // Ignore ml5 cleanup errors and continue with a fresh setup.
        }
      }
      this._handposeModel = null;
      this._handposeReady = false;
      this._handposeStarting = false;
      this._handposeStartPromise = null;
      this.video = null;
      this.landmarks = [];
    }

    _ensureHandpose () {
      const videoDevice = this._getVideoDevice();
      if (!videoDevice || !videoDevice.provider) {
        return Promise.resolve(false);
      }

      const activeVideo = videoDevice.provider.video;
      const hasMatchingVideo = this.video && activeVideo && this.video === activeVideo;
      if (this._handposeReady && hasMatchingVideo && videoDevice.videoReady) {
        if (!this._predictionTimeout) {
          this._startPredictionLoop();
        }
        return Promise.resolve(true);
      }

      if (this._handposeStartPromise) {
        return this._handposeStartPromise;
      }

      this._resetHandpose();
      this._handposeStarting = true;
      this._handposeStartPromise = Promise.resolve(videoDevice.enableVideo())
        .then(() => {
          if (!videoDevice.provider || !videoDevice.provider.video) {
            return false;
          }

          this.video = videoDevice.provider.video;
          this._locale = this._locale || this.setLocale();
          return this._waitForVideoReady(this.video);
        })
        .then(videoReady => {
          if (!videoReady || !this.video) {
            return false;
          }

          alert(Message.please_wait[this._locale]);
          return new Promise(resolve => {
            this._handposeModel = ml5.handpose(this._getModelOptions(), () => {
              resolve(true);
            });
          });
        })
        .then(modelReady => {
          if (!modelReady || !this._handposeModel) {
            return false;
          }

          this._handposeReady = true;
          this._startPredictionLoop();
          return true;
        })
        .catch(() => false)
        .then(result => {
          this._handposeStarting = false;
          this._handposeStartPromise = null;
          if (!result) {
            this._resetHandpose();
          }
          return result;
        });

      return this._handposeStartPromise;
    }`;

const OLD_HANDPOSE_GET_X_SNIPPET = `    getX (args) {
      if (!this._handposeReady) {
        this._ensureHandpose();
      }
      let landmark = parseInt(args.LANDMARK, 10) - 1;
      if (this.landmarks[landmark]) {
        if (this.runtime.ioDevices.video.mirror === false) {
          return -1 * (240 - this.landmarks[landmark][0] * this.ratio);
        } else {
          return 240 - this.landmarks[landmark][0] * this.ratio;
        }
      } else {
        return "";
      }
    }`;

const NEW_HANDPOSE_GET_X_SNIPPET = `    getX (args) {
      if (!this._handposeReady) {
        this._ensureHandpose();
      }
      let landmark = parseInt(args.LANDMARK, 10) - 1;
      if (!this.landmarks[landmark]) {
        return "";
      }
      return this._projectPoint(this.landmarks[landmark]).x;
    }`;

const OLD_HANDPOSE_GET_Y_SNIPPET = `    getY (args) {
      if (!this._handposeReady) {
        this._ensureHandpose();
      }
      let landmark = parseInt(args.LANDMARK, 10) - 1;
      if (this.landmarks[landmark]) {
        return 180 - this.landmarks[landmark][1] * this.ratio;
      } else {
        return "";
      }
    }`;

const NEW_HANDPOSE_GET_Y_SNIPPET = `    getY (args) {
      if (!this._handposeReady) {
        this._ensureHandpose();
      }
      let landmark = parseInt(args.LANDMARK, 10) - 1;
      if (!this.landmarks[landmark]) {
        return "";
      }
      return this._projectPoint(this.landmarks[landmark]).y;
    }`;

const OLD_HANDPOSE_SET_RATIO_DEFAULT_SNIPPET = `                        RATIO: {
                            type: ArgumentType.STRING,
                            menu: 'ratioMenu',
                            defaultValue: '0.75'
                        }`;

const NEW_HANDPOSE_SET_RATIO_DEFAULT_SNIPPET = `                        RATIO: {
                            type: ArgumentType.STRING,
                            menu: 'ratioMenu',
                            defaultValue: '1'
                        }`;

const OLD_HANDPOSE_VIDEO_TOGGLE_SNIPPET = `    videoToggle (args) {
      let state = args.VIDEO_STATE;
      if (state === 'off') {
        this.runtime.ioDevices.video.disableVideo();
      } else {
        this._ensureHandpose();
        this.runtime.ioDevices.video.mirror = state === "on";
      }
    }`;

const NEW_HANDPOSE_VIDEO_TOGGLE_SNIPPET = `    videoToggle (args) {
      let state = args.VIDEO_STATE;
      if (state === 'off') {
        this.runtime.ioDevices.video.disableVideo();
        this._resetHandpose();
      } else {
        this._ensureHandpose();
        this.runtime.ioDevices.video.mirror = state === "on";
      }
    }`;

const BUILTIN_EXTENSION_HELPERS_SNIPPET = `const getBuiltinExtensionClass = extensionModule => {
    if (extensionModule && extensionModule.blockClass) {
        return extensionModule.blockClass;
    }
    if (extensionModule && extensionModule.default) {
        if (extensionModule.default.blockClass) {
            return extensionModule.default.blockClass;
        }
        return extensionModule.default;
    }
    return extensionModule;
};

const maybeAttachFormatMessage = extensionClass => {
    if (extensionClass &&
        (typeof extensionClass === 'function' || typeof extensionClass === 'object') &&
        !extensionClass.formatMessage) {
        extensionClass.formatMessage = require('format-message');
    }
    return extensionClass;
};

const isThenable = value => value && typeof value.then === 'function';

`;

const LOAD_EXTENSION_ID_SYNC_OLD = `        const extension = builtinExtensions[extensionId]();
        const extensionInstance = new extension(this.runtime);
        const serviceName = this._registerInternalExtension(extensionInstance);
        this._loadedExtensions.set(extensionId, serviceName);`;
const LOAD_EXTENSION_ID_SYNC_NEW = `        const extension = builtinExtensions[extensionId]();
        if (isThenable(extension)) {
            log.warn(\`Extension \${extensionId} must be loaded asynchronously.\`);
            return;
        }

        const extensionClass = maybeAttachFormatMessage(getBuiltinExtensionClass(extension));
        const extensionInstance = new extensionClass(this.runtime);
        const serviceName = this._registerInternalExtension(extensionInstance);
        this._loadedExtensions.set(extensionId, serviceName);`;

const LOAD_EXTENSION_URL_BUILTIN_OLD = `            const extension = builtinExtensions[extensionURL]();
            const extensionInstance = new extension(this.runtime);
            const serviceName = this._registerInternalExtension(extensionInstance);
            this._loadedExtensions.set(extensionURL, serviceName);
            return Promise.resolve();`;
const LOAD_EXTENSION_URL_BUILTIN_NEW = `            return Promise.resolve(builtinExtensions[extensionURL]())
                .then(extension => {
                    const extensionClass = maybeAttachFormatMessage(getBuiltinExtensionClass(extension));
                    const extensionInstance = new extensionClass(this.runtime);
                    const serviceName = this._registerInternalExtension(extensionInstance);
                    this._loadedExtensions.set(extensionURL, serviceName);
                });`;

const OLD_HANDPOSE_URL_NORMALIZER_SNIPPET = `        // Treat legacy handpose URLs as the built-in extension ID.
        if (typeof extensionURL === 'string') {
            const normalizedExtensionURL = extensionURL.trim().toLowerCase();
            if (normalizedExtensionURL.endsWith('/handpose2scratch') ||
                normalizedExtensionURL.endsWith('/handpose2scratch/') ||
                normalizedExtensionURL.includes('/handpose2scratch.js')) {
                extensionURL = 'handpose2scratch';
            }
        }
`;
const LEGACY_URL_NORMALIZER_SNIPPET = `        // Treat known custom-extension URLs as built-in extension IDs.
        if (typeof extensionURL === 'string') {
            const normalizedExtensionURL = extensionURL.trim().toLowerCase();
            const legacyBuiltinExtensionAliases = [
                ['handpose2scratch', 'handpose2scratch'],
                ['ml2scratch', 'ml2scratch'],
                ['facemesh2scratch', 'facemesh2scratch'],
                ['speech2scratch', 'speech2scratch'],
                ['cameraselector.mjs', 'cameraselector'],
                ['xcx-cameraselector', 'cameraselector'],
                ['microbitmore.mjs', 'microbitMore'],
                ['microbit-more.github.io', 'microbitMore']
            ];
            const matchingAlias = legacyBuiltinExtensionAliases.find(([needle]) =>
                normalizedExtensionURL.includes(needle)
            );
            if (matchingAlias) {
                extensionURL = matchingAlias[1];
            }
        }
`;
const BUNDLED_EXTENSION_FILES = [
    {
        label: 'scratch3_handpose2scratch/index.js',
        sourcePath: path.join(projectRoot, 'vendor', 'custom-extensions', 'handpose2scratch', 'index.js'),
        destPath: path.join(scratchVmRoot, 'extensions', 'scratch3_handpose2scratch', 'index.js')
    },
    {
        label: 'scratch3_ml2scratch/index.js',
        sourcePath: path.join(projectRoot, 'vendor', 'custom-extensions', 'ml2scratch', 'index.js'),
        destPath: path.join(scratchVmRoot, 'extensions', 'scratch3_ml2scratch', 'index.js')
    },
    {
        label: 'scratch3_facemesh2scratch/index.js',
        sourcePath: path.join(projectRoot, 'vendor', 'custom-extensions', 'facemesh2scratch', 'index.js'),
        destPath: path.join(scratchVmRoot, 'extensions', 'scratch3_facemesh2scratch', 'index.js')
    },
    {
        label: 'scratch3_speech2scratch/index.js',
        sourcePath: path.join(projectRoot, 'vendor', 'custom-extensions', 'speech2scratch', 'index.js'),
        destPath: path.join(scratchVmRoot, 'extensions', 'scratch3_speech2scratch', 'index.js')
    },
    {
        label: 'cameraselector/cameraselector.mjs',
        sourcePath: path.join(projectRoot, 'vendor', 'custom-extensions', 'cameraselector', 'cameraselector.mjs'),
        destPath: path.join(scratchVmRoot, 'extensions', 'cameraselector', 'cameraselector.mjs')
    },
    {
        label: 'microbitMore/microbitMore.mjs',
        sourcePath: path.join(projectRoot, 'vendor', 'custom-extensions', 'microbitMore', 'microbitMore.mjs'),
        destPath: path.join(scratchVmRoot, 'extensions', 'microbitMore', 'microbitMore.mjs')
    },
    {
        label: 'logicboxTracking/runtime.js',
        sourcePath: path.join(projectRoot, 'vendor', 'custom-extensions', 'logicboxTracking', 'runtime.js'),
        destPath: path.join(scratchVmRoot, 'extensions', 'logicboxTracking', 'runtime.js')
    }
];

function fail(message) {
    throw new Error(`[patch-scratch-vm-handpose] ${message}`);
}

function upsertSnippetAfter(source, anchor, snippet, fileLabel, oldSnippets = []) {
    if (source.includes(snippet)) {
        return {source, changed: false};
    }

    for (const oldSnippet of oldSnippets) {
        if (source.includes(oldSnippet)) {
            return {
                source: source.replace(oldSnippet, snippet),
                changed: true
            };
        }
    }

    if (!source.includes(anchor)) {
        fail(`Could not find anchor in ${fileLabel}: ${anchor}`);
    }

    return {
        source: source.replace(anchor, `${anchor}\n${snippet}`),
        changed: true
    };
}

function ensureSnippetBefore(source, anchor, snippet, fileLabel) {
    if (source.includes(snippet)) {
        return {source, changed: false};
    }

    if (!source.includes(anchor)) {
        fail(`Could not find anchor in ${fileLabel}: ${anchor}`);
    }

    return {
        source: source.replace(anchor, `${snippet}${anchor}`),
        changed: true
    };
}

function replaceSnippet(source, oldSnippet, newSnippet, fileLabel) {
    if (source.includes(newSnippet)) {
        return {source, changed: false};
    }

    if (!source.includes(oldSnippet)) {
        fail(`Could not find snippet in ${fileLabel}: ${oldSnippet}`);
    }

    return {
        source: source.replace(oldSnippet, newSnippet),
        changed: true
    };
}

function writeFile(destPath, content, label) {
    fs.mkdirSync(path.dirname(destPath), {recursive: true});
    fs.writeFileSync(destPath, content, 'utf8');
    void label;
}

function patchExtensionManager() {
    if (!fs.existsSync(extensionManagerPath)) {
        fail(`Missing file: ${extensionManagerPath}`);
    }

    let source = fs.readFileSync(extensionManagerPath, 'utf8');
    let changed = false;

    const importSpecs = [
        {
            anchor: VIDEO_SENSING_IMPORT_LINE,
            snippet: HANDPOSE_IMPORT_LINE,
            oldSnippets: [HANDPOSE_IMPORT_LINE_OLD]
        },
        {
            anchor: HANDPOSE_IMPORT_LINE,
            snippet: ML2SCRATCH_IMPORT_LINE,
            oldSnippets: [ML2SCRATCH_IMPORT_LINE_OLD]
        },
        {
            anchor: ML2SCRATCH_IMPORT_LINE,
            snippet: FACEMESH2SCRATCH_IMPORT_LINE,
            oldSnippets: [FACEMESH2SCRATCH_IMPORT_LINE_OLD]
        },
        {
            anchor: FACEMESH2SCRATCH_IMPORT_LINE,
            snippet: SPEECH2SCRATCH_IMPORT_LINE,
            oldSnippets: [SPEECH2SCRATCH_IMPORT_LINE_OLD]
        },
        {
            anchor: SPEECH2SCRATCH_IMPORT_LINE,
            snippet: CAMERASELECTOR_IMPORT_LINE,
            oldSnippets: [CAMERASELECTOR_IMPORT_LINE_OLD]
        },
        {
            anchor: MICROBIT_IMPORT_LINE,
            snippet: MICROBIT_MORE_IMPORT_LINE,
            oldSnippets: [MICROBIT_MORE_IMPORT_LINE_OLD]
        }
    ];

    for (const {anchor, snippet, oldSnippets} of importSpecs) {
        const result = upsertSnippetAfter(source, anchor, snippet, 'extension-manager.js', oldSnippets);
        source = result.source;
        changed = changed || result.changed;
    }

    const helperResult = ensureSnippetBefore(
        source,
        ARGUMENT_INFO_COMMENT,
        BUILTIN_EXTENSION_HELPERS_SNIPPET,
        'extension-manager.js'
    );
    source = helperResult.source;
    changed = changed || helperResult.changed;

    const syncLoadResult = replaceSnippet(
        source,
        LOAD_EXTENSION_ID_SYNC_OLD,
        LOAD_EXTENSION_ID_SYNC_NEW,
        'extension-manager.js'
    );
    source = syncLoadResult.source;
    changed = changed || syncLoadResult.changed;

    const asyncLoadResult = replaceSnippet(
        source,
        LOAD_EXTENSION_URL_BUILTIN_OLD,
        LOAD_EXTENSION_URL_BUILTIN_NEW,
        'extension-manager.js'
    );
    source = asyncLoadResult.source;
    changed = changed || asyncLoadResult.changed;

    const loadExtensionSignature = '    loadExtensionURL (extensionURL) {\n';
    if (source.includes(OLD_HANDPOSE_URL_NORMALIZER_SNIPPET) &&
        !source.includes('legacyBuiltinExtensionAliases')) {
        source = source.replace(OLD_HANDPOSE_URL_NORMALIZER_SNIPPET, LEGACY_URL_NORMALIZER_SNIPPET);
        changed = true;
    } else if (!source.includes('legacyBuiltinExtensionAliases')) {
        if (!source.includes(loadExtensionSignature)) {
            fail('Could not find loadExtensionURL signature in extension-manager.js');
        }
        source = source.replace(
            loadExtensionSignature,
            `${loadExtensionSignature}${LEGACY_URL_NORMALIZER_SNIPPET}`
        );
        changed = true;
    }

    if (changed) {
        fs.writeFileSync(extensionManagerPath, source, 'utf8');
    }
}

function extractHandposeFileFromPatch() {
    if (!fs.existsSync(patchFilePath)) {
        fail(`Missing patch file: ${patchFilePath}`);
    }

    const patch = fs.readFileSync(patchFilePath, 'utf8');
    const fileHeader = '+++ b/node_modules/scratch-vm/src/extensions/scratch3_handpose2scratch/index.js';
    const fileHeaderIndex = patch.indexOf(fileHeader);
    if (fileHeaderIndex < 0) {
        fail('Could not locate handpose extension file header in patch');
    }

    const sectionStart = patch.indexOf('\n@@ ', fileHeaderIndex);
    if (sectionStart < 0) {
        fail('Could not locate handpose extension hunk in patch');
    }

    const nextDiffIndex = patch.indexOf('\ndiff --git ', sectionStart);
    const section = nextDiffIndex >= 0 ? patch.slice(sectionStart, nextDiffIndex) : patch.slice(sectionStart);
    const lines = section.split('\n');

    const contentLines = [];
    for (const line of lines) {
        if (line.startsWith('@@')) continue;
        if (line.startsWith('+')) {
            contentLines.push(line.slice(1));
        }
    }

    if (contentLines.length === 0) {
        fail('Extracted handpose extension content is empty');
    }

    return `${contentLines.join('\n')}\n`;
}

function copyBundledExtensionFiles() {
    for (const {label, sourcePath, destPath} of BUNDLED_EXTENSION_FILES) {
        if (!fs.existsSync(sourcePath)) {
            fail(`Missing bundled extension source: ${sourcePath}`);
        }
        fs.mkdirSync(path.dirname(destPath), {recursive: true});
        fs.copyFileSync(sourcePath, destPath);
    }
}

function patchHandposeSource(source) {
    let result = replaceSnippet(
        source,
        OLD_HANDPOSE_BOOTSTRAP_SNIPPET,
        NEW_HANDPOSE_BOOTSTRAP_SNIPPET,
        'scratch3_handpose2scratch/index.js'
    );
    source = result.source;

    result = replaceSnippet(
        source,
        OLD_HANDPOSE_VIDEO_TOGGLE_SNIPPET,
        NEW_HANDPOSE_VIDEO_TOGGLE_SNIPPET,
        'scratch3_handpose2scratch/index.js'
    );
    source = result.source;

    result = replaceSnippet(
        source,
        OLD_HANDPOSE_GET_X_SNIPPET,
        NEW_HANDPOSE_GET_X_SNIPPET,
        'scratch3_handpose2scratch/index.js'
    );
    source = result.source;

    result = replaceSnippet(
        source,
        OLD_HANDPOSE_GET_Y_SNIPPET,
        NEW_HANDPOSE_GET_Y_SNIPPET,
        'scratch3_handpose2scratch/index.js'
    );
    source = result.source;

    result = replaceSnippet(
        source,
        OLD_HANDPOSE_SET_RATIO_DEFAULT_SNIPPET,
        NEW_HANDPOSE_SET_RATIO_DEFAULT_SNIPPET,
        'scratch3_handpose2scratch/index.js'
    );
    source = result.source;

    return source;
}

function verifyWrittenFiles() {
    const expectedFiles = [
        handposeExtensionPath,
        ...BUNDLED_EXTENSION_FILES.map(file => file.destPath)
    ];

    for (const filePath of expectedFiles) {
        if (!fs.existsSync(filePath)) {
            fail(`Expected file was not written: ${filePath}`);
        }
    }
}

function main() {
    patchExtensionManager();
    copyBundledExtensionFiles();
    verifyWrittenFiles();
}

main();
