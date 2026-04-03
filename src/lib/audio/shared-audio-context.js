import StartAudioContext from 'startaudiocontext';
import bowser from 'bowser';

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
        return AUDIO_CONTEXT;
    }

    AUDIO_CONTEXT = createAudioContext();
    if (AUDIO_CONTEXT) {
        try {
            StartAudioContext(AUDIO_CONTEXT);
        } catch (e) {
            // No-op: failing to auto-resume should not break editor initialization.
        }
    }
    return AUDIO_CONTEXT;
};

if (!bowser.msie) {
    /**
     * AudioContext can be initialized only when user interaction event happens
     */
    const event =
        typeof document.ontouchstart === 'undefined' ?
            'mousedown' :
            'touchstart';
    const initAudioContext = function () {
        document.removeEventListener(event, initAudioContext);
        ensureAudioContext();
    };
    document.addEventListener(event, initAudioContext);
}

/**
 * Wrap browser AudioContext because we shouldn't create more than one
 * @return {AudioContext} The singleton AudioContext
 */
export default function () {
    return ensureAudioContext();
}
