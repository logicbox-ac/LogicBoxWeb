jest.mock('ml5', () => ({
    handpose: jest.fn(() => ({
        on: jest.fn()
    }))
}));

describe('Handpose2Scratch extension', () => {
    test('can be constructed before the video provider is attached', () => {
        const Handpose2Scratch = require('scratch-vm/src/extensions/scratch3_handpose2scratch');
        const runtime = {
            ioDevices: {
                video: {}
            }
        };

        expect(() => new Handpose2Scratch(runtime)).not.toThrow();
    });

    test('can toggle video on without a provider without throwing', () => {
        const Handpose2Scratch = require('scratch-vm/src/extensions/scratch3_handpose2scratch');
        const runtime = {
            ioDevices: {
                video: {
                    mirror: true,
                    disableVideo: jest.fn()
                }
            }
        };
        const extension = new Handpose2Scratch(runtime);

        expect(() => extension.videoToggle({VIDEO_STATE: 'on'})).not.toThrow();
    });
});
