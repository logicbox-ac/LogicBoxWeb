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
            'handleUpdateName'
        ]);
        this.styleObserver = null;
        this.logCounter = 0;
    }

    componentDidMount () {
        setTimeout(() => this.applyMobileStyles(), 300);
    }

    componentDidUpdate () {
        this.applyMobileStyles();
    }

    componentWillUnmount () {
        if (this.styleObserver) {
            this.styleObserver.disconnect();
        }
    }

    logDebug (msg) {
        console.log(`[PAINT] ${msg}`);
    }

    applyMobileStyles () {
        if (typeof window === 'undefined') return;
        if (window.innerWidth > 1095) return;

        if (this._isApplyingStyles) return;
        this._isApplyingStyles = true;

        setTimeout(() => {
            this._isApplyingStyles = false;
        }, 2000);

        setTimeout(() => {
            const modeSelector = document.querySelector('[class*="paint-editor_mode-selector"]');
            const canvas = document.querySelector('[class*="paint-editor_canvas-container"]');
            const topAlignRow = document.querySelector('[class*="paint-editor_top-align-row"]');
            const editorContainerTop = document.querySelector('[class*="paint-editor_editor-container-top"]');

            let styleEl = document.getElementById('paint-mobile-fixes');
            if (!styleEl) {
                styleEl = document.createElement('style');
                styleEl.id = 'paint-mobile-fixes';
                document.head.appendChild(styleEl);
            }

            styleEl.textContent = `
                [class*="paint-editor_top-align-row"] {
                    display: flex !important;
                    flex-direction: column !important;
                    width: 100% !important;
                    height: auto !important;
                }
                [class*="paint-editor_editor-container-top"] {
                    width: 100% !important;
                    height: auto !important;
                }
                [class*="paint-editor_mode-selector"] {
                    display: flex !important;
                    flex-direction: row !important;
                    flex-wrap: nowrap !important;
                    width: 100% !important;
                    max-width: 100% !important;
                    min-width: 100% !important;
                    overflow-x: auto !important;
                    overflow-y: hidden !important;
                    flex-shrink: 0 !important;
                }
                [class*="paint-editor_canvas-container"] {
                    width: 100% !important;
                    height: 200px !important;
                    max-height: 200px !important;
                    flex: none !important;
                }
                [class*="paint-editor_controls-containe"] {
                    height: auto !important;
                    min-height: 40px !important;
                }
                [class*="paint-editor_mode-selector"] [role="button"] {
                    display: flex !important;
                    flex-direction: column !important;
                    min-width: 50px !important;
                    max-width: 60px !important;
                    flex-shrink: 0 !important;
                    position: relative !important;
                }
                /* Add labels from title attribute */
                [class*="paint-editor_mode-selector"] [role="button"]:after {
                    content: attr(title) !important;
                    display: block !important;
                    font-size: 8px !important;
                    visibility: visible !important;
                    opacity: 1 !important;
                    text-align: center !important;
                    margin-top: 2px !important;
                }
                /* Fix paint rows - negative x positions */
                [class*="paint-editor_row"] {
                    position: relative !important;
                    left: 0 !important;
                    transform: none !important;
                    margin-left: 0 !important;
                }
                [class*="fixed-tools_row"] {
                    position: relative !important;
                    left: 0 !important;
                    transform: none !important;
                    margin-left: 0 !important;
                }
            `;

            if (topAlignRow) {
                topAlignRow.style.display = 'flex';
                topAlignRow.style.flexDirection = 'column';
                topAlignRow.style.width = '100%';
            }

            if (editorContainerTop) {
                editorContainerTop.style.width = '100%';
                editorContainerTop.style.height = 'auto';
            }

            if (modeSelector) {
                modeSelector.style.display = 'flex';
                modeSelector.style.flexDirection = 'row';
                modeSelector.style.flexWrap = 'nowrap';
                modeSelector.style.width = '100%';
                modeSelector.style.maxWidth = '100%';
                modeSelector.style.minWidth = '100%';
                modeSelector.style.overflowX = 'auto';
                modeSelector.style.flexShrink = '0';
            }

            if (canvas) {
                canvas.style.width = '100%';
                canvas.style.height = '200px';
                canvas.style.maxHeight = '200px';
                canvas.style.flex = 'none';
            }

            // Fix paint rows with negative positioning
            document.querySelectorAll('[class*="paint-editor_row"]').forEach(el => {
                el.style.position = 'relative';
                el.style.left = '0';
                el.style.transform = 'none';
                el.style.marginLeft = '0';
            });
            document.querySelectorAll('[class*="fixed-tools_row"]').forEach(el => {
                el.style.position = 'relative';
                el.style.left = '0';
                el.style.transform = 'none';
                el.style.marginLeft = '0';
            });

            // Fix paint rows - was at negative x
            document.querySelectorAll('[class*="paint-editor_row"]').forEach(el => {
                el.style.position = 'relative';
                el.style.left = '0';
            });
            document.querySelectorAll('[class*="fixed-tools_row"]').forEach(el => {
                el.style.position = 'relative';
                el.style.left = '0';
            });

            // Show button labels
            document.querySelectorAll('[class*="paint-editor_mode-selector"] [role="button"] span').forEach(span => {
                span.style.display = 'block';
                span.style.fontSize = '8px';
                span.style.visibility = 'visible';
                span.style.opacity = '1';
            });

            setTimeout(() => {
                // Detailed debug
                this.logDebug('=== MODE SELECTOR WIDTH DEBUG ===');

                const ms = document.querySelector('[class*="paint-editor_mode-selector"]');
                const topAlign = document.querySelector('[class*="paint-editor_top-align-row"]');

                if (ms) {
                    const msRect = ms.getBoundingClientRect();
                    const msStyle = window.getComputedStyle(ms);
                    const msParent = ms.parentElement;
                    const msParentRect = msParent?.getBoundingClientRect();

                    const info1 = `ModeSelector: ${msRect.width}x${msRect.height} pos=[${msRect.left},${msRect.top}]`;
                    const info2 = `MS style: w=${msStyle.width} maxW=${msStyle.maxWidth} disp=${msStyle.display}`;
                    const msParentInfo = `MS Parent: ${msParent?.className?.slice(0, 20)} ` +
                        `rect=${msParentRect?.width}x${msParentRect?.height}`;
                    this.logDebug(info1);
                    this.logDebug(info2);
                    this.logDebug(msParentInfo);
                }

                if (topAlign) {
                    const taRect = topAlign.getBoundingClientRect();
                    this.logDebug(`TopAlignRow: ${taRect.width}x${taRect.height}`);
                }

                // Check buttons on left side - paint rows
                this.logDebug('=== PAINT ROWS DEBUG ===');
                const paintRows = document.querySelectorAll('[class*="paint-editor_row"]');
                paintRows.forEach((row, i) => {
                    const rect = row.getBoundingClientRect();
                    this.logDebug(`Row${i}: ${rect.width}x${rect.height} pos=[${rect.left},${rect.top}]`);
                });

                // Check fixed-tools row
                const fixedToolsRow = document.querySelector('[class*="fixed-tools_row"]');
                if (fixedToolsRow) {
                    const ftRect = fixedToolsRow.getBoundingClientRect();
                    this.logDebug(`FixedToolsRow: ${ftRect.width}x${ftRect.height} pos=[${ftRect.left},${ftRect.top}]`);
                }

                // Button labels
                this.logDebug('=== BUTTON LABELS ===');
                const buttons = document.querySelectorAll('[class*="paint-editor_mode-selector"] [role="button"]');
                buttons.forEach((btn, i) => {
                    const allText = btn.textContent?.trim() || '';
                    const ariaLabel = btn.getAttribute('aria-label') || '';
                    const title = btn.getAttribute('title') || '';
                    const svg = btn.querySelector('svg');
                    const svgTitle = svg ? svg.querySelector('title')?.textContent : '';
                    this.logDebug(`Btn${i}: text="${allText}" aria="${ariaLabel}" title="${title}" svg="${svgTitle}"`);
                });

                // Canvas
                this.logDebug('=== CANVAS DEBUG ===');
                const cv = document.querySelector('[class*="paint-editor_canvas-container"]');
                if (cv) {
                    const cvRect = cv.getBoundingClientRect();
                    const cvStyle = window.getComputedStyle(cv);
                    const cvInfo = `Canvas: ${cvRect.width}x${cvRect.height} ` +
                        `pos=[${cvRect.left},${cvRect.top}] style.w=${cvStyle.width}`;
                    this.logDebug(cvInfo);
                }
            }, 100);
        }, 100);
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
                rotationCenterY);
        } else {
            this.props.vm.updateBitmap(
                this.props.selectedCostumeIndex,
                image,
                rotationCenterX,
                rotationCenterY,
                2 /* bitmapResolution */);
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
        imageId: targetId && `${targetId}${costume.skinId}`,
        rtl: state.locales.isRtl,
        selectedCostumeIndex: index,
        vm: state.scratchGui.vm,
        zoomLevelId: targetId
    };
};

export default connect(
    mapStateToProps
)(PaintEditorWrapper);
