const withCache = loader => {
    let cachedPromise;

    return () => {
        if (!cachedPromise) {
            cachedPromise = loader().then(module => module.default || module);
        }
        return cachedPromise;
    };
};

export const loadBackdropLibrary = withCache(() => import(
    /* webpackChunkName: "library-backdrops" */
    './backdrops.json'
));

export const loadCostumeLibrary = withCache(() => import(
    /* webpackChunkName: "library-costumes" */
    './costumes.json'
));

export const loadDecksLibrary = withCache(() => import(
    /* webpackChunkName: "library-tutorial-decks" */
    './decks/index.jsx'
));

export const loadSoundLibrary = withCache(() => import(
    /* webpackChunkName: "library-sounds" */
    './sounds.json'
));

export const loadSpriteLibrary = withCache(() => import(
    /* webpackChunkName: "library-sprites" */
    './sprites.json'
));
