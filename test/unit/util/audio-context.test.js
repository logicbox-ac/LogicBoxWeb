/* global WebAudioTestAPI */
import 'web-audio-test-api';
WebAudioTestAPI.setState({
    'AudioContext#resume': 'enabled'
});

import SharedAudioContext from '../../../src/lib/audio/shared-audio-context';

describe('Shared Audio Context', () => {
    const audioContext = new AudioContext();

    test('returns AudioContext without user gesture', () => {
        const sharedAudioContext = new SharedAudioContext();
        expect(sharedAudioContext).toMatchObject(audioContext);
    });

    test('returns AudioContext when mousedown is triggered', () => {
        const sharedAudioContext = new SharedAudioContext();
        const event = new Event('mousedown');
        document.dispatchEvent(event);
        expect(sharedAudioContext).toMatchObject(audioContext);
    });

    test('returns AudioContext when touchstart is triggered', () => {
        const sharedAudioContext = new SharedAudioContext();
        const event = new Event('touchstart');
        document.dispatchEvent(event);
        expect(sharedAudioContext).toMatchObject(audioContext);
    });

    test('returns the same singleton instance across calls', () => {
        const firstContext = new SharedAudioContext();
        const secondContext = new SharedAudioContext();
        expect(firstContext).toBe(secondContext);
    });
});
