import PropTypes from 'prop-types';
import React from 'react';
import bindAll from 'lodash.bindall';
import VM from 'scratch-vm';
import PaintEditor from 'scratch-paint';
import {inlineSvgFonts} from 'scratch-svg-renderer';

import {connect} from 'react-redux';

class PaintEditorWrapper extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleUpdateImage',
            'handleUpdateName',
            'triggerPaintLayoutSync',
            'syncMobileCostumeLayout',
            'resetMobileCostumeLayout',
            'scheduleAttachListeners',
            'attachMobileGestureListeners',
            'detachMobileGestureListeners'
        ]);
        this.scheduleAttachListenersTimers = [];
        this.gestureDetachers = [];
    }

    componentDidMount () {
        this.triggerPaintLayoutSync();
        this.scheduleAttachListeners();
    }

    componentDidUpdate (prevProps) {
        if (
            prevProps.imageId !== this.props.imageId ||
            prevProps.selectedCostumeIndex !== this.props.selectedCostumeIndex
        ) {
            this.triggerPaintLayoutSync();
            this.scheduleAttachListeners();
        }
    }

    componentWillUnmount () {
        this.resetMobileCostumeLayout();
        this.clearScheduledAttachTimers();
        this.detachMobileGestureListeners();
    }

    triggerPaintLayoutSync () {
        if (typeof window === 'undefined') return;

        const syncLayout = () => {
            this.syncMobileCostumeLayout();
            window.dispatchEvent(new Event('resize'));
        };

        window.requestAnimationFrame(syncLayout);
        window.setTimeout(syncLayout, 120);
        window.setTimeout(this.syncMobileCostumeLayout, 260);
    }

    clearScheduledAttachTimers () {
        this.scheduleAttachListenersTimers.forEach(timerId => window.clearTimeout(timerId));
        this.scheduleAttachListenersTimers = [];
    }

    isCostumeMobileViewport () {
        if (typeof window === 'undefined') return false;
        if (window.innerWidth > 767) return false;
        const mobileRoot = document.querySelector('[data-mobile-tab]');
        return Boolean(mobileRoot && mobileRoot.getAttribute('data-mobile-tab') === 'costumes');
    }

    resetMobileCostumeLayout () {
        if (typeof document === 'undefined') return;

        const editor = document.querySelector('[data-mobile-tab="costumes"] [class*="paint-editor_editor-container"]');
        if (!editor) return;

        const editorTop = editor.querySelector('[class*="paint-editor_editor-container-top"]');
        const topAlignRow = editor.querySelector('[class*="paint-editor_top-align-row"]');
        const fixedToolsRow = editor.querySelector('[class*="fixed-tools_row"]');
        const secondaryRow = editorTop ? Array.from(editorTop.children).find((child, index) =>
            index === 1 && child.matches('[class*="paint-editor_row"]')) : null;
        const modeSelector = editor.querySelector('[class*="paint-editor_mode-selector"]');
        const zoomControls = editor.querySelector('[class*="paint-editor_zoom-controls"]');

        if (editorTop) {
            editorTop.style.height = '';
            editorTop.style.minHeight = '';
            editorTop.style.flex = '';
        }
        if (topAlignRow) {
            topAlignRow.style.marginTop = '';
        }
        if (fixedToolsRow) {
            Array.from(fixedToolsRow.children).forEach(child => {
                child.style.marginBottom = '';
                child.style.marginTop = '';
            });
        }
        if (secondaryRow) {
            Array.from(secondaryRow.children).forEach(child => {
                child.style.marginBottom = '';
                child.style.marginTop = '';
                child.style.height = '';
                child.style.minHeight = '';
                child.style.alignSelf = '';
            });
        }
        if (modeSelector) {
            Array.from(modeSelector.children).forEach(child => {
                child.style.width = '';
                child.style.minWidth = '';
                child.style.height = '';
                child.style.minHeight = '';
                child.style.display = '';
                child.style.flexDirection = '';
                child.style.alignItems = '';
                child.style.justifyContent = '';
                child.style.gap = '';
            });
        }
        if (zoomControls) {
            Array.from(zoomControls.querySelectorAll('button')).forEach(button => {
                button.style.display = '';
                button.style.alignItems = '';
                button.style.justifyContent = '';
            });
        }
    }

    syncMobileCostumeLayout () {
        if (!this.isCostumeMobileViewport()) {
            this.resetMobileCostumeLayout();
            return;
        }

        const editor = document.querySelector('[data-mobile-tab="costumes"] [class*="paint-editor_editor-container"]');
        if (!editor) return;

        const editorTop = editor.querySelector('[class*="paint-editor_editor-container-top"]');
        const topAlignRow = editor.querySelector('[class*="paint-editor_top-align-row"]');
        const fixedToolsRow = editor.querySelector('[class*="fixed-tools_row"]');
        const modeSelector = editor.querySelector('[class*="paint-editor_mode-selector"]');
        const zoomControls = editor.querySelector('[class*="paint-editor_zoom-controls"]');
        if (!editorTop || !topAlignRow) return;

        const topRows = Array.from(editorTop.children)
            .filter(child => child.matches('[class*="paint-editor_row"]'));

        const rowsBottom = topRows.reduce((maxBottom, row) => {
            const styles = window.getComputedStyle(row);
            const bottom =
                row.offsetTop +
                row.offsetHeight +
                parseFloat(styles.marginBottom || 0);
            return Math.max(maxBottom, bottom);
        }, 0);

        if (rowsBottom > 0) {
            const reservedHeight = Math.ceil(rowsBottom + 8);
            editorTop.style.height = `${reservedHeight}px`;
            editorTop.style.minHeight = `${reservedHeight}px`;
            editorTop.style.flex = '0 0 auto';

            const existingMarginTop = parseFloat(window.getComputedStyle(topAlignRow).marginTop || 0);
            const currentTop = topAlignRow.getBoundingClientRect().top;
            const naturalTop = currentTop - existingMarginTop;
            const desiredTop = editorTop.getBoundingClientRect().top + reservedHeight;
            topAlignRow.style.marginTop = `${Math.max(0, Math.ceil(desiredTop - naturalTop))}px`;
        }

        if (fixedToolsRow) {
            Array.from(fixedToolsRow.children).forEach(child => {
                child.style.marginBottom = '0px';
                child.style.marginTop = '0px';
            });
        }

        const secondaryRow = topRows[1];
        if (secondaryRow) {
            Array.from(secondaryRow.children).forEach(child => {
                child.style.marginBottom = '0px';
                child.style.marginTop = '0px';
                child.style.height = 'auto';
                child.style.minHeight = '0px';
                child.style.alignSelf = 'center';
            });
        }

        if (modeSelector) {
            Array.from(modeSelector.children).forEach(child => {
                child.style.width = '3.85rem';
                child.style.minWidth = '3.85rem';
                child.style.height = '4rem';
                child.style.minHeight = '4rem';
                child.style.display = 'inline-flex';
                child.style.flexDirection = 'column';
                child.style.alignItems = 'center';
                child.style.justifyContent = 'center';
                child.style.gap = '0.15rem';
            });
        }

        if (zoomControls) {
            Array.from(zoomControls.querySelectorAll('button')).forEach(button => {
                button.style.display = 'flex';
                button.style.alignItems = 'center';
                button.style.justifyContent = 'center';
            });
        }
    }

    scheduleAttachListeners () {
        if (typeof window === 'undefined') return;
        this.clearScheduledAttachTimers();

        const delays = [0, 160, 420];
        delays.forEach(delay => {
            const timerId = window.setTimeout(() => {
                this.attachMobileGestureListeners();
            }, delay);
            this.scheduleAttachListenersTimers.push(timerId);
        });
    }

    detachMobileGestureListeners () {
        this.gestureDetachers.forEach(detach => detach());
        this.gestureDetachers = [];
    }

    attachMobileGestureListeners () {
        this.detachMobileGestureListeners();
        if (!this.isCostumeMobileViewport()) return;

        const mobileRoot = document.querySelector('[data-mobile-tab="costumes"]');
        const editor = mobileRoot && mobileRoot.querySelector('[class*="paint-editor_editor-container"]');
        if (!editor) return;

        const editorTop = editor.querySelector('[class*="paint-editor_editor-container-top"]');
        const allRows = Array.from(editor.querySelectorAll('[class*="paint-editor_row"]'));
        const primaryRow = editorTop ? editorTop.querySelector('[class*="paint-editor_row"]') : null;
        const secondaryRow = editorTop && allRows.length > 1 ? allRows[1] : null;
        const modeSelector = editor.querySelector('[class*="paint-editor_mode-selector"]');
        const selectorListArea = mobileRoot.querySelector('[class*="selector_list-area"]');

        const resolveScrollableTarget = (event, fallbackElement) => {
            if (!event || !event.target || typeof event.target.closest !== 'function') {
                return fallbackElement;
            }
            const candidate = event.target.closest(
                '[class*="paint-editor_row"], [class*="paint-editor_mode-selector"], [class*="selector_list-area"]'
            );
            if (candidate && candidate.scrollWidth > candidate.clientWidth + 4) {
                return candidate;
            }
            return fallbackElement;
        };

        const attachHorizontalPanAssist = (element, getScrollElement) => {
            if (!element) return;

            const state = {
                active: false,
                dragging: false,
                scrollElement: null,
                startX: 0,
                startY: 0,
                startScrollLeft: 0
            };

            const onTouchStart = event => {
                if (event.touches.length !== 1) return;
                const scrollElement = typeof getScrollElement === 'function' ?
                    getScrollElement(event) :
                    element;
                if (!scrollElement) return;
                const touch = event.touches[0];
                state.active = true;
                state.dragging = false;
                state.scrollElement = scrollElement;
                state.startX = touch.clientX;
                state.startY = touch.clientY;
                state.startScrollLeft = scrollElement.scrollLeft;
            };

            const onTouchMove = event => {
                if (!state.active || !state.scrollElement || event.touches.length !== 1) return;
                const touch = event.touches[0];
                const deltaX = touch.clientX - state.startX;
                const deltaY = touch.clientY - state.startY;

                if (!state.dragging) {
                    if (Math.abs(deltaX) < 6 || Math.abs(deltaX) <= Math.abs(deltaY)) {
                        return;
                    }
                    state.dragging = true;
                }

                if (event.cancelable) {
                    event.preventDefault();
                }
                state.scrollElement.scrollLeft = state.startScrollLeft - deltaX;
            };

            const endTouch = () => {
                state.active = false;
                state.dragging = false;
                state.scrollElement = null;
            };

            element.addEventListener('touchstart', onTouchStart, {passive: true, capture: true});
            element.addEventListener('touchmove', onTouchMove, {passive: false, capture: true});
            element.addEventListener('touchend', endTouch, {passive: true, capture: true});
            element.addEventListener('touchcancel', endTouch, {passive: true, capture: true});

            this.gestureDetachers.push(() => {
                element.removeEventListener('touchstart', onTouchStart, true);
                element.removeEventListener('touchmove', onTouchMove, true);
                element.removeEventListener('touchend', endTouch, true);
                element.removeEventListener('touchcancel', endTouch, true);
            });
        };

        attachHorizontalPanAssist(
            editorTop,
            event => resolveScrollableTarget(event, primaryRow || editorTop)
        );
        attachHorizontalPanAssist(
            primaryRow,
            event => resolveScrollableTarget(event, primaryRow)
        );
        attachHorizontalPanAssist(
            secondaryRow,
            event => resolveScrollableTarget(event, secondaryRow)
        );
        attachHorizontalPanAssist(
            modeSelector,
            event => resolveScrollableTarget(event, modeSelector)
        );
        attachHorizontalPanAssist(
            selectorListArea,
            event => resolveScrollableTarget(event, selectorListArea)
        );
    }

    handleUpdateName (name) {
        this.props.vm.renameCostume(this.props.selectedCostumeIndex, name);
    }

    handleUpdateImage (isVector, image, rotationCenterX, rotationCenterY) {
        if (isVector) {
            this.props.vm.updateSvg(
                this.props.selectedCostumeIndex,
                image,
                rotationCenterX,
                rotationCenterY
            );
        } else {
            this.props.vm.updateBitmap(
                this.props.selectedCostumeIndex,
                image,
                rotationCenterX,
                rotationCenterY,
                2 /* bitmapResolution */
            );
        }
    }

    render () {
        if (!this.props.imageId) return null;

        const {
            selectedCostumeIndex,
            vm,
            ...componentProps
        } = this.props;

        return (
            <PaintEditor
                {...componentProps}
                image={vm.getCostume(selectedCostumeIndex)}
                onUpdateImage={this.handleUpdateImage}
                onUpdateName={this.handleUpdateName}
                fontInlineFn={inlineSvgFonts}
            />
        );
    }
}

PaintEditorWrapper.propTypes = {
    imageFormat: PropTypes.string.isRequired,
    imageId: PropTypes.string.isRequired,
    name: PropTypes.string,
    rotationCenterX: PropTypes.number,
    rotationCenterY: PropTypes.number,
    rtl: PropTypes.bool,
    selectedCostumeIndex: PropTypes.number.isRequired,
    vm: PropTypes.instanceOf(VM)
};

const mapStateToProps = (state, {selectedCostumeIndex}) => {
    const targetId = state.scratchGui.vm.editingTarget.id;
    const sprite = state.scratchGui.vm.editingTarget.sprite;
    const index = selectedCostumeIndex < sprite.costumes.length ?
        selectedCostumeIndex : sprite.costumes.length - 1;
    const costume = state.scratchGui.vm.editingTarget.sprite.costumes[index];
    return {
        name: costume && costume.name,
        rotationCenterX: costume && costume.rotationCenterX,
        rotationCenterY: costume && costume.rotationCenterY,
        imageFormat: costume && costume.dataFormat,
        imageId: targetId && costume ? `${targetId}${costume.skinId}` : null,
        rtl: state.locales.isRtl,
        selectedCostumeIndex: index,
        vm: state.scratchGui.vm,
        zoomLevelId: targetId
    };
};

export default connect(
    mapStateToProps
)(PaintEditorWrapper);
