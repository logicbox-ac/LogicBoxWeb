import SharedAudioContext from './shared-audio-context.js';

class AudioBufferPlayer {
    constructor (samples, sampleRate) {
        this.audioContext = null;
        this.buffer = null;
        this.samples = samples;
        this.sampleRate = sampleRate;
        this.source = null;

        this.startTime = null;
        this.updateCallback = null;
        this.trimStart = null;
        this.trimEnd = null;
    }

    ensureBuffer () {
        if (this.buffer) {
            return true;
        }
        this.audioContext = SharedAudioContext();
        if (!this.audioContext) {
            return false;
        }
        this.buffer = this.audioContext.createBuffer(1, this.samples.length, this.sampleRate);
        this.buffer.getChannelData(0).set(this.samples);
        return true;
    }

    play (trimStart, trimEnd, onUpdate, onEnded) {
        if (!this.ensureBuffer()) {
            return;
        }
        this.updateCallback = onUpdate;
        this.trimStart = trimStart;
        this.trimEnd = trimEnd;
        this.startTime = Date.now();

        const trimStartTime = this.buffer.duration * trimStart;
        const trimmedDuration = (this.buffer.duration * trimEnd) - trimStartTime;

        this.source = this.audioContext.createBufferSource();
        this.source.onended = onEnded;
        this.source.buffer = this.buffer;
        this.source.connect(this.audioContext.destination);
        this.source.start(0, trimStartTime, trimmedDuration);

        this.update();
    }

    update () {
        const timeSinceStart = (Date.now() - this.startTime) / 1000;
        const percentage = timeSinceStart / this.buffer.duration;
        if (percentage + this.trimStart < this.trimEnd && this.source.onended) {
            requestAnimationFrame(this.update.bind(this));
            this.updateCallback(percentage + this.trimStart);
        } else {
            this.updateCallback = null;
        }
    }

    stop () {
        if (this.source) {
            this.source.onended = null; // Do not call onEnded callback if manually stopped
            try {
                this.source.stop();
            } catch (e) {
                // This is probably Safari, which dies when you call stop more than once
                // which the spec says is allowed: https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode
            }
        }
    }
}

export default AudioBufferPlayer;
