let AUDIO_CONTEXT;

const createAudioContext = function () {
    const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextConstructor) {
        return null;
    }

    try {
        return new AudioContextConstructor();
    } catch (e) {
        return null;
    }
};

const ensureAudioContext = function () {
    if (AUDIO_CONTEXT && typeof AUDIO_CONTEXT.createBuffer === 'function') {
        if (typeof AUDIO_CONTEXT.resume === 'function' && AUDIO_CONTEXT.state === 'suspended') {
            AUDIO_CONTEXT.resume().catch(() => {});
        }
        return AUDIO_CONTEXT;
    }

    AUDIO_CONTEXT = createAudioContext();
    if (AUDIO_CONTEXT && typeof AUDIO_CONTEXT.resume === 'function' && AUDIO_CONTEXT.state === 'suspended') {
        AUDIO_CONTEXT.resume().catch(() => {});
    }
    return AUDIO_CONTEXT;
};

/**
 * Wrap browser AudioContext because we shouldn't create more than one
 * @return {AudioContext} The singleton AudioContext
 */
export default function () {
    return ensureAudioContext();
}
