import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';
import VM from 'scratch-vm';

import styles from './virtual-keyboard.css';

// All keys supported by Scratch sensing blocks
const LETTER_ROWS = [
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm']
];

const ARROW_KEYS = [
    { key: 'ArrowUp', display: '↑', className: 'arrowUp' },
    { key: 'ArrowLeft', display: '←', className: 'arrowLeft' },
    { key: 'ArrowDown', display: '↓', className: 'arrowDown' },
    { key: 'ArrowRight', display: '→', className: 'arrowRight' }
];

/**
 * VirtualKeyboard component - displays a touch-friendly keyboard
 * for mobile users to trigger key press events in Scratch projects.
 */
class VirtualKeyboard extends React.Component {
    constructor(props) {
        super(props);
        bindAll(this, [
            'handleKeyDown',
            'handleKeyUp',
            'handlePointerDown',
            'handlePointerUp',
            'setContainerRef',
            'toggleCollapsed'
        ]);
        this.state = {
            pressedKeys: new Set(),
            isCollapsed: true
        };
        this.containerRef = null;
        this.activePointers = new Map();
    }

    componentDidMount() {
        this.attachEventListeners();
    }

    componentWillUnmount() {
        this.detachEventListeners();
    }

    setContainerRef(ref) {
        if (this.containerRef) {
            this.detachEventListeners();
        }
        this.containerRef = ref;
        if (this.containerRef) {
            this.attachEventListeners();
        }
    }

    attachEventListeners() {
        if (!this.containerRef) return;
        this.containerRef.addEventListener('pointerdown', this.handlePointerDown, { passive: false });
        this.containerRef.addEventListener('pointerup', this.handlePointerUp, { passive: false });
        this.containerRef.addEventListener('pointercancel', this.handlePointerUp, { passive: false });
        this.containerRef.addEventListener('pointerleave', this.handlePointerUp, { passive: false });
    }

    detachEventListeners() {
        if (!this.containerRef) return;
        this.containerRef.removeEventListener('pointerdown', this.handlePointerDown);
        this.containerRef.removeEventListener('pointerup', this.handlePointerUp);
        this.containerRef.removeEventListener('pointercancel', this.handlePointerUp);
        this.containerRef.removeEventListener('pointerleave', this.handlePointerUp);
    }

    toggleCollapsed() {
        this.setState(prevState => ({ isCollapsed: !prevState.isCollapsed }));
    }

    handlePointerDown(e) {
        const button = e.target.closest('[data-key]');
        if (!button) return;

        e.preventDefault();
        e.stopPropagation();

        const key = button.dataset.key;
        this.activePointers.set(e.pointerId, key);
        this.handleKeyDown(key);
    }

    handlePointerUp(e) {
        const key = this.activePointers.get(e.pointerId);
        if (key) {
            e.preventDefault();
            e.stopPropagation();
            this.activePointers.delete(e.pointerId);
            this.handleKeyUp(key);
        }
    }

    handleKeyDown(key) {
        this.setState(prevState => ({
            pressedKeys: new Set(prevState.pressedKeys).add(key)
        }));
        if (this.props.vm) {
            this.props.vm.postIOData('keyboard', { key, isDown: true });
        }
    }

    handleKeyUp(key) {
        this.setState(prevState => {
            const newPressed = new Set(prevState.pressedKeys);
            newPressed.delete(key);
            return { pressedKeys: newPressed };
        });
        if (this.props.vm) {
            this.props.vm.postIOData('keyboard', { key, isDown: false });
        }
    }

    renderKey(key, displayText = null, extraClassName = '') {
        const isPressed = this.state.pressedKeys.has(key);
        return (
            <button
                key={key}
                data-key={key}
                className={`${styles.key} ${extraClassName} ${isPressed ? styles.pressed : ''}`}
                type="button"
            >
                {displayText || key.toUpperCase()}
            </button>
        );
    }

    render() {
        if (!this.props.visible) {
            return null;
        }

        const { isCollapsed } = this.state;

        return (
            <div className={styles.keyboardWrapper}>
                {/* Toggle button */}
                <button
                    className={styles.toggleButton}
                    onClick={this.toggleCollapsed}
                    type="button"
                    aria-expanded={!isCollapsed}
                >
                    <span className={styles.toggleIcon}>⌨</span>
                    <span className={styles.toggleText}>
                        {isCollapsed ? 'Show Keyboard' : 'Hide Keyboard'}
                    </span>
                    <span className={`${styles.toggleArrow} ${isCollapsed ? styles.collapsed : ''}`}>
                        ▼
                    </span>
                </button>

                {/* Keyboard container */}
                <div
                    className={`${styles.keyboardContainer} ${isCollapsed ? styles.hidden : ''}`}
                    ref={this.setContainerRef}
                >
                    {/* Letter rows */}
                    {LETTER_ROWS.map((row, rowIndex) => (
                        <div
                            key={`row-${rowIndex}`}
                            className={styles.row}
                        >
                            {row.map(key => this.renderKey(key))}
                        </div>
                    ))}

                    {/* Bottom row: Space and Arrow keys */}
                    <div className={styles.bottomRow}>
                        {/* Arrow keys */}
                        <div className={styles.arrowsContainer}>
                            <div className={styles.arrowTop}>
                                {this.renderKey('ArrowUp', '▲', styles.arrowKey)}
                            </div>
                            <div className={styles.arrowBottom}>
                                {this.renderKey('ArrowLeft', '◀', styles.arrowKey)}
                                {this.renderKey('ArrowDown', '▼', styles.arrowKey)}
                                {this.renderKey('ArrowRight', '▶', styles.arrowKey)}
                            </div>
                        </div>

                        {/* Space key */}
                        {this.renderKey(' ', 'SPACE', styles.spaceKey)}
                    </div>
                </div>
            </div>
        );
    }
}

VirtualKeyboard.propTypes = {
    visible: PropTypes.bool,
    vm: PropTypes.instanceOf(VM)
};

VirtualKeyboard.defaultProps = {
    visible: true
};

export default VirtualKeyboard;
