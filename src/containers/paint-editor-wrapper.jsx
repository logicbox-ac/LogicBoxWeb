import PropTypes from 'prop-types';
import React from 'react';
import bindAll from 'lodash.bindall';
import VM from 'scratch-vm';
import PaintEditor from 'scratch-paint';
import {inlineSvgFonts} from 'scratch-svg-renderer';

import {connect} from 'react-redux';

const COSTUME_DIAG_PREFIX = '[COSTUME-DIAG]';
const COSTUME_DIAG_STYLE_PROPS = [
    'display',
    'position',
    'overflowX',
    'overflowY',
    'flexDirection',
    'flexWrap',
    'justifyContent',
    'alignItems',
    'alignContent',
    'width',
    'height',
    'minWidth',
    'maxWidth',
    'minHeight',
    'maxHeight',
    'paddingTop',
    'paddingRight',
    'paddingBottom',
    'paddingLeft',
    'marginTop',
    'marginRight',
    'marginBottom',
    'marginLeft',
    'gap',
    'touchAction',
    'whiteSpace',
    'textOverflow',
    'zIndex',
    'boxSizing'
];
const COSTUME_DIAG_ICON_LIMIT = 12;
const COSTUME_DIAG_CHILD_LIMIT = 12;

const roundDiagnostic = value => Math.round((value || 0) * 100) / 100;

const getRectSnapshot = element => {
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    return {
        top: roundDiagnostic(rect.top),
        left: roundDiagnostic(rect.left),
        right: roundDiagnostic(rect.right),
        bottom: roundDiagnostic(rect.bottom),
        width: roundDiagnostic(rect.width),
        height: roundDiagnostic(rect.height)
    };
};

const getStyleSnapshot = element => {
    if (!element || typeof window === 'undefined') return null;
    const styles = window.getComputedStyle(element);
    return COSTUME_DIAG_STYLE_PROPS.reduce((accumulator, property) => {
        accumulator[property] = styles[property];
        return accumulator;
    }, {});
};

const getElementLabel = element => {
    if (!element) return null;
    return element.getAttribute('aria-label') ||
        element.getAttribute('title') ||
        element.textContent ||
        '';
};

const getElementSnapshot = (name, element) => {
    if (!element) {
        return {
            name,
            missing: true
        };
    }

    return {
        name,
        missing: false,
        tagName: element.tagName.toLowerCase(),
        className: element.className && element.className.baseVal ? element.className.baseVal : element.className,
        label: getElementLabel(element).trim(),
        rect: getRectSnapshot(element),
        scroll: {
            clientWidth: element.clientWidth,
            clientHeight: element.clientHeight,
            scrollWidth: element.scrollWidth,
            scrollHeight: element.scrollHeight,
            scrollLeft: element.scrollLeft,
            scrollTop: element.scrollTop,
            canScrollX: element.scrollWidth > element.clientWidth,
            canScrollY: element.scrollHeight > element.clientHeight
        },
        style: getStyleSnapshot(element)
    };
};

const getOverlapSnapshot = (label, first, second) => {
    if (!first || !second) {
        return {
            label,
            missing: true
        };
    }

    const firstRect = first.getBoundingClientRect();
    const secondRect = second.getBoundingClientRect();
    const left = Math.max(firstRect.left, secondRect.left);
    const right = Math.min(firstRect.right, secondRect.right);
    const top = Math.max(firstRect.top, secondRect.top);
    const bottom = Math.min(firstRect.bottom, secondRect.bottom);
    const overlapWidth = Math.max(0, right - left);
    const overlapHeight = Math.max(0, bottom - top);

    return {
        label,
        missing: false,
        overlaps: overlapWidth > 0 && overlapHeight > 0,
        intersection: {
            width: roundDiagnostic(overlapWidth),
            height: roundDiagnostic(overlapHeight)
        },
        first: getRectSnapshot(first),
        second: getRectSnapshot(second)
    };
};

const getButtonDiagnostics = (container, label) => {
    if (!container) return [];

    return Array.from(container.querySelectorAll('button, [role="button"]'))
        .slice(0, COSTUME_DIAG_ICON_LIMIT)
        .map((button, index) => {
            const icon = button.querySelector('img, svg');
            const titleNode = button.querySelector('[class*="edit-field-title"], span, div');
            const buttonRect = button.getBoundingClientRect();
            const iconRect = icon ? icon.getBoundingClientRect() : null;
            const labelRect = titleNode ? titleNode.getBoundingClientRect() : null;
            const buttonCenterX = buttonRect.left + (buttonRect.width / 2);
            const buttonCenterY = buttonRect.top + (buttonRect.height / 2);
            const iconCenterX = iconRect ? iconRect.left + (iconRect.width / 2) : null;
            const iconCenterY = iconRect ? iconRect.top + (iconRect.height / 2) : null;

            return {
                container: label,
                index,
                label: getElementLabel(button).trim(),
                className: button.className,
                rect: getRectSnapshot(button),
                iconRect: getRectSnapshot(icon),
                labelRect: getRectSnapshot(titleNode),
                labelText: titleNode ? titleNode.textContent.trim() : '',
                labelVisible: Boolean(titleNode && labelRect && labelRect.width > 0 && labelRect.height > 0),
                style: getStyleSnapshot(button),
                iconStyle: getStyleSnapshot(icon),
                iconCentered: Boolean(iconRect) &&
                    Math.abs(iconCenterX - buttonCenterX) <= 2 &&
                    Math.abs(iconCenterY - buttonCenterY) <= 4,
                iconOffset: iconRect ? {
                    x: roundDiagnostic(iconCenterX - buttonCenterX),
                    y: roundDiagnostic(iconCenterY - buttonCenterY)
                } : null
            };
        });
};

const getChildDiagnostics = (container, label) => {
    if (!container) return [];

    return Array.from(container.children)
        .slice(0, COSTUME_DIAG_CHILD_LIMIT)
        .map((child, index) => ({
            container: label,
            index,
            label: getElementLabel(child).trim(),
            snapshot: getElementSnapshot(`${label}[${index}]`, child)
        }));
};

class PaintEditorWrapper extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleUpdateImage',
            'handleUpdateName',
            'triggerPaintLayoutSync',
            'syncMobileCostumeLayout',
            'resetMobileCostumeLayout',
            'scheduleCostumeDiagnostics',
            'runCostumeDiagnostics',
            'handleDiagnosticViewportChange',
            'clearCostumeDiagnosticTimers',
            'detachCostumeDiagnosticListeners',
            'attachCostumeDiagnosticListeners'
        ]);
        this.costumeDiagnosticTimers = [];
        this.costumeDiagnosticDetachers = [];
    }

    componentDidMount () {
        this.triggerPaintLayoutSync();
        this.scheduleCostumeDiagnostics('mount');
        if (typeof window !== 'undefined') {
            window.addEventListener('resize', this.handleDiagnosticViewportChange);
        }
    }

    componentDidUpdate (prevProps) {
        if (
            prevProps.imageId !== this.props.imageId ||
            prevProps.selectedCostumeIndex !== this.props.selectedCostumeIndex
        ) {
            this.triggerPaintLayoutSync();
            this.scheduleCostumeDiagnostics('update');
        }
    }

    componentWillUnmount () {
        this.resetMobileCostumeLayout();
        this.clearCostumeDiagnosticTimers();
        this.detachCostumeDiagnosticListeners();
        if (typeof window !== 'undefined') {
            window.removeEventListener('resize', this.handleDiagnosticViewportChange);
        }
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

    clearCostumeDiagnosticTimers () {
        this.costumeDiagnosticTimers.forEach(timerId => window.clearTimeout(timerId));
        this.costumeDiagnosticTimers = [];
    }

    detachCostumeDiagnosticListeners () {
        this.costumeDiagnosticDetachers.forEach(detach => detach());
        this.costumeDiagnosticDetachers = [];
    }

    isCostumeDiagnosticViewport () {
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
        if (!this.isCostumeDiagnosticViewport()) {
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

    handleDiagnosticViewportChange () {
        this.scheduleCostumeDiagnostics('resize');
    }

    scheduleCostumeDiagnostics (reason) {
        if (typeof window === 'undefined') return;
        this.clearCostumeDiagnosticTimers();

        const delays = [0, 160, 420];
        delays.forEach((delay, index) => {
            const timerId = window.setTimeout(() => {
                this.runCostumeDiagnostics(reason, index + 1);
            }, delay);
            this.costumeDiagnosticTimers.push(timerId);
        });
    }

    attachCostumeDiagnosticListeners (elements) {
        this.detachCostumeDiagnosticListeners();
        if (!this.isCostumeDiagnosticViewport()) return;

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

        const attachHorizontalPanAssist = (element, name, getScrollElement) => {
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

            this.costumeDiagnosticDetachers.push(() => {
                element.removeEventListener('touchstart', onTouchStart, true);
                element.removeEventListener('touchmove', onTouchMove, true);
                element.removeEventListener('touchend', endTouch, true);
                element.removeEventListener('touchcancel', endTouch, true);
            });

            void name;
        };

        const attachScrollableListener = (element, name) => {
            if (!element) return;

            const onScroll = () => {
                const now = Date.now();
                if (element.__logicboxCostumeDiagLastScroll && now - element.__logicboxCostumeDiagLastScroll < 150) {
                    return;
                }
                element.__logicboxCostumeDiagLastScroll = now;
                console.log(`${COSTUME_DIAG_PREFIX} scroll`, getElementSnapshot(name, element));
            };
            const onTouchStart = event => {
                console.log(`${COSTUME_DIAG_PREFIX} touchstart`, {
                    name,
                    targetClassName: event.target && event.target.className,
                    scrollLeft: element.scrollLeft,
                    scrollWidth: element.scrollWidth,
                    clientWidth: element.clientWidth,
                    touchAction: window.getComputedStyle(element).touchAction
                });
            };

            element.addEventListener('scroll', onScroll, {passive: true});
            element.addEventListener('touchstart', onTouchStart, {passive: true});
            this.costumeDiagnosticDetachers.push(() => {
                element.removeEventListener('scroll', onScroll);
                element.removeEventListener('touchstart', onTouchStart);
            });
        };

        attachScrollableListener(elements.editorTop, 'editorTop');
        attachScrollableListener(elements.primaryRow, 'primaryRow');
        attachScrollableListener(elements.fixedToolsRow, 'fixedToolsRow');
        attachScrollableListener(elements.secondaryRow, 'secondaryRow');
        attachScrollableListener(elements.modeSelector, 'modeSelector');
        attachScrollableListener(elements.canvasContainer, 'canvasContainer');
        attachScrollableListener(elements.selectorListArea, 'selectorListArea');

        attachHorizontalPanAssist(
            elements.editorTop,
            'editorTop',
            event => resolveScrollableTarget(event, elements.primaryRow || elements.editorTop)
        );
        attachHorizontalPanAssist(
            elements.primaryRow,
            'primaryRow',
            event => resolveScrollableTarget(event, elements.primaryRow)
        );
        attachHorizontalPanAssist(
            elements.secondaryRow,
            'secondaryRow',
            event => resolveScrollableTarget(event, elements.secondaryRow)
        );
        attachHorizontalPanAssist(
            elements.modeSelector,
            'modeSelector',
            event => resolveScrollableTarget(event, elements.modeSelector)
        );
        attachHorizontalPanAssist(
            elements.selectorListArea,
            'selectorListArea',
            event => resolveScrollableTarget(event, elements.selectorListArea)
        );
    }

    runCostumeDiagnostics (reason, pass) {
        if (!this.isCostumeDiagnosticViewport()) return;

        const mobileRoot = document.querySelector('[data-mobile-tab="costumes"]');
        const editor = mobileRoot && mobileRoot.querySelector('[class*="paint-editor_editor-container"]');
        if (!editor) return;

        const editorTop = editor.querySelector('[class*="paint-editor_editor-container-top"]');
        const allRows = Array.from(editor.querySelectorAll('[class*="paint-editor_row"]'));
        const primaryRow = editorTop ? editorTop.querySelector('[class*="paint-editor_row"]') : null;
        const secondaryRow = editorTop && allRows.length > 1 ? allRows[1] : null;
        const fixedToolsRow = editor.querySelector('[class*="fixed-tools_row"]');
        const modeSelector = editor.querySelector('[class*="paint-editor_mode-selector"]');
        const controlsContainer = editor.querySelector('[class*="paint-editor_controls-container"]');
        const canvasContainer = editor.querySelector('[class*="paint-editor_canvas-container"]');
        const canvasControls = editor.querySelector('[class*="paint-editor_canvas-controls"]');
        const zoomControls = editor.querySelector('[class*="paint-editor_zoom-controls"]');
        const canvas = canvasContainer && canvasContainer.querySelector('canvas');
        const addButtonTray = mobileRoot.querySelector('[class*="selector_new-buttons"], [class*="new-buttons"]');
        const selectorListArea = mobileRoot.querySelector('[class*="selector_list-area"]');

        const payload = {
            reason,
            pass,
            viewport: {
                innerWidth: window.innerWidth,
                innerHeight: window.innerHeight,
                devicePixelRatio: window.devicePixelRatio,
                mobileTab: mobileRoot.getAttribute('data-mobile-tab')
            },
            elements: {
                editor: getElementSnapshot('editor', editor),
                editorTop: getElementSnapshot('editorTop', editorTop),
                primaryRow: getElementSnapshot('primaryRow', primaryRow),
                fixedToolsRow: getElementSnapshot('fixedToolsRow', fixedToolsRow),
                secondaryRow: getElementSnapshot('secondaryRow', secondaryRow),
                modeSelector: getElementSnapshot('modeSelector', modeSelector),
                controlsContainer: getElementSnapshot('controlsContainer', controlsContainer),
                canvasContainer: getElementSnapshot('canvasContainer', canvasContainer),
                canvasControls: getElementSnapshot('canvasControls', canvasControls),
                zoomControls: getElementSnapshot('zoomControls', zoomControls),
                canvas: getElementSnapshot('canvas', canvas),
                addButtonTray: getElementSnapshot('addButtonTray', addButtonTray),
                selectorListArea: getElementSnapshot('selectorListArea', selectorListArea)
            },
            overlaps: [
                getOverlapSnapshot('primaryRow-secondaryRow', primaryRow, secondaryRow),
                getOverlapSnapshot('secondaryRow-modeSelector', secondaryRow, modeSelector),
                getOverlapSnapshot('modeSelector-controlsContainer', modeSelector, controlsContainer),
                getOverlapSnapshot('zoomControls-addButtonTray', zoomControls, addButtonTray),
                getOverlapSnapshot('zoomControls-canvas', zoomControls, canvas)
            ],
            visibility: {
                canvasFitsControls: Boolean(canvas && controlsContainer) &&
                    canvas.getBoundingClientRect().left >= controlsContainer.getBoundingClientRect().left - 1 &&
                    canvas.getBoundingClientRect().right <= controlsContainer.getBoundingClientRect().right + 1,
                canvasFitsViewport: Boolean(canvas) &&
                    canvas.getBoundingClientRect().left >= 0 &&
                    canvas.getBoundingClientRect().right <= window.innerWidth,
                canvasClippedLeft: Boolean(canvas && controlsContainer) &&
                    canvas.getBoundingClientRect().left < controlsContainer.getBoundingClientRect().left - 1
            },
            buttons: {
                primaryRow: getButtonDiagnostics(primaryRow, 'primaryRow'),
                modeSelector: getButtonDiagnostics(modeSelector, 'modeSelector'),
                zoomControls: getButtonDiagnostics(zoomControls, 'zoomControls')
            },
            children: {
                editorTop: getChildDiagnostics(editorTop, 'editorTop'),
                primaryRow: getChildDiagnostics(primaryRow, 'primaryRow'),
                secondaryRow: getChildDiagnostics(secondaryRow, 'secondaryRow'),
                fixedToolsRow: getChildDiagnostics(fixedToolsRow, 'fixedToolsRow'),
                modeSelector: getChildDiagnostics(modeSelector, 'modeSelector'),
                controlsContainer: getChildDiagnostics(controlsContainer, 'controlsContainer'),
                canvasControls: getChildDiagnostics(canvasControls, 'canvasControls'),
                selectorListArea: getChildDiagnostics(selectorListArea, 'selectorListArea')
            }
        };

        window.__logicboxCostumeDiagnostics = payload;
        console.groupCollapsed(`${COSTUME_DIAG_PREFIX} ${reason} pass ${pass}`);
        console.log(`${COSTUME_DIAG_PREFIX} viewport`, payload.viewport);
        console.log(`${COSTUME_DIAG_PREFIX} elements`, payload.elements);
        console.log(`${COSTUME_DIAG_PREFIX} overlaps`, payload.overlaps);
        console.log(`${COSTUME_DIAG_PREFIX} visibility`, payload.visibility);
        console.log(`${COSTUME_DIAG_PREFIX} buttonDiagnostics`, payload.buttons);
        console.log(`${COSTUME_DIAG_PREFIX} childDiagnostics`, payload.children);
        console.groupEnd();

        this.attachCostumeDiagnosticListeners({
            editorTop,
            primaryRow,
            fixedToolsRow,
            secondaryRow,
            modeSelector,
            canvasContainer,
            selectorListArea
        });
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
