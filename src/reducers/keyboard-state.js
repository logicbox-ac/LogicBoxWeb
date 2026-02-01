const SET_HAS_KEYBOARD_BLOCKS = 'scratch-gui/keyboard-state/SET_HAS_KEYBOARD_BLOCKS';

const initialState = {
    hasKeyboardBlocks: false
};

const reducer = function (state, action) {
    if (typeof state === 'undefined') state = initialState;
    switch (action.type) {
        case SET_HAS_KEYBOARD_BLOCKS:
            return Object.assign({}, state, {
                hasKeyboardBlocks: action.hasKeyboardBlocks
            });
        default:
            return state;
    }
};

const setHasKeyboardBlocks = function (hasKeyboardBlocks) {
    return {
        type: SET_HAS_KEYBOARD_BLOCKS,
        hasKeyboardBlocks: hasKeyboardBlocks
    };
};

export {
    reducer as default,
    initialState as keyboardStateInitialState,
    setHasKeyboardBlocks
};
