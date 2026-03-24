import extensionLibraryContent from '../../../src/lib/libraries/extensions/index.jsx';

describe('extension library content', () => {
    test('includes the Handpose2Scratch extension metadata', () => {
        const extension = extensionLibraryContent.find(item => item.extensionId === 'handpose2scratch');

        expect(extension).toBeDefined();
        expect(extension.collaborator).toBe('champierre');
        expect(extension.internetConnectionRequired).toBe(true);
        expect(extension.helpLink).toBe('https://champierre.github.io/handpose2scratch/');
    });
});
