import PropTypes from 'prop-types';
import React from 'react';
import bindAll from 'lodash.bindall';
import VM from 'scratch-vm';
import PaintEditor from 'scratch-paint';
import { inlineSvgFonts } from 'scratch-svg-renderer';

import { connect } from 'react-redux';

class PaintEditorWrapper extends React.Component {
    constructor(props) {
        super(props);
        bindAll(this, [
            'handleUpdateImage',
            'handleUpdateName'
        ]);
        this.styleObserver = null;
        this.logCounter = 0;
    }

    componentDidMount() {
        setTimeout(() => this.applyMobileStyles(), 300);
    }

    componentDidUpdate() {
        this.applyMobileStyles();
    }

    componentWillUnmount() {
        if (this.styleObserver) {
            this.styleObserver.disconnect();
        }
    }

    logDebug(msg) {
        console.log(`[PAINT] ${msg}`);
    }

    applyMobileStyles() {
        if (typeof window === 'undefined') return;
        if (window.innerWidth > 1095) return;

        if (this._isApplyingStyles) return;
        this._isApplyingStyles = true;

        setTimeout(() => {
            this._isApplyingStyles = false;
        }, 2000);

        setTimeout(() => {
            // ─── Inject CSS overrides ───
            let styleEl = document.getElementById('paint-mobile-fixes');
            if (!styleEl) {
                styleEl = document.createElement('style');
                styleEl.id = 'paint-mobile-fixes';
                document.head.appendChild(styleEl);
            }

            const availW = window.innerWidth;
            // Calculate available canvas height: viewport minus estimated overhead
            // menu-bar ~48px, tab-bar ~48px, toolbar rows ~90px, mode-selector ~60px, canvas-controls ~50px, padding ~30px
            const estimatedOverhead = 370;
            const canvasH = Math.max(120, Math.min(250, window.innerHeight - estimatedOverhead));

            styleEl.textContent = `
                /* ── Editor container: full width, vertical flow ── */
                [class*="paint-editor_editor-container"] {
                    width: 100% !important;
                    max-width: 100% !important;
                    height: auto !important;
                    overflow: visible !important;
                    padding: 4px !important;
                    box-sizing: border-box !important;
                }

                /* ── Editor container top (toolbar rows) ── */
                [class*="paint-editor_editor-container-top"] {
                    width: 100% !important;
                    max-width: 100% !important;
                    height: auto !important;
                    overflow: visible !important;
                    box-sizing: border-box !important;
                }

                /* ── Top-align-row: column direction on mobile ── */
                [class*="paint-editor_top-align-row"] {
                    display: flex !important;
                    flex-direction: column !important;
                    width: 100% !important;
                    max-width: 100% !important;
                    height: auto !important;
                    min-width: 0 !important;
                    overflow: visible !important;
                    overflow-x: visible !important;
                    overflow-y: visible !important;
                    padding-top: 4px !important;
                }

                /* ── Mode selector: horizontal scrollable ribbon ── */
                [class*="paint-editor_mode-selector"] {
                    display: flex !important;
                    flex-direction: row !important;
                    flex-wrap: nowrap !important;
                    width: 100% !important;
                    max-width: 100% !important;
                    min-width: 0 !important;
                    overflow-x: scroll !important;
                    overflow-y: hidden !important;
                    flex-shrink: 0 !important;
                    padding: 4px 0 !important;
                    gap: 2px !important;
                    -webkit-overflow-scrolling: touch !important;
                    touch-action: pan-x !important;
                    align-items: stretch !important;
                    align-content: flex-start !important;
                    justify-content: flex-start !important;
                    height: auto !important;
                    max-height: none !important;
                    background: rgba(255,255,255,0.95) !important;
                    border-bottom: 1px solid #e0e0e0 !important;

                }

                /* ── Tool buttons inside mode-selector ── */
                [class*="paint-editor_mode-selector"] [role="button"],
                [class*="paint-editor_mode-selector"] button {
                    display: flex !important;
                    flex-direction: column !important;
                    align-items: center !important;
                    justify-content: center !important;
                    min-width: 50px !important;
                    max-width: 60px !important;
                    width: 54px !important;
                    height: auto !important;
                    min-height: 56px !important;
                    flex-shrink: 0 !important;
                    position: relative !important;
                    overflow: visible !important;
                    padding: 4px 2px 2px !important;
                    box-sizing: border-box !important;
                }

                /* ── Tool icons inside buttons ── */
                [class*="paint-editor_mode-selector"] [role="button"] img,
                [class*="paint-editor_mode-selector"] button img,
                [class*="paint-editor_mode-selector"] img[class*="tool-select-base_tool-select-icon"] {
                    width: 24px !important;
                    height: 24px !important;
                    max-height: 24px !important;
                    flex-shrink: 0 !important;
                    flex-grow: 0 !important;
                    display: block !important;
                }

                /* ── Mode labels below icons ── */
                [class*="paint-editor_mode-selector"] [role="button"] .mode-label,
                [class*="paint-editor_mode-selector"] button .mode-label {
                    display: block !important;
                    visibility: visible !important;
                    opacity: 1 !important;
                    position: static !important;
                    font-size: 10px !important;
                    font-weight: 700 !important;
                    line-height: 12px !important;
                    height: 12px !important;
                    color: #222 !important;
                    text-align: center !important;
                    width: 100% !important;
                    margin-top: 2px !important;
                    white-space: nowrap !important;
                    overflow: hidden !important;
                    text-overflow: ellipsis !important;
                    pointer-events: none !important;
                    letter-spacing: -0.3px !important;
                }

                /* ── Controls container (holds canvas + controls) ── */
                [class*="paint-editor_controls-container"] {
                    width: 100% !important;
                    max-width: 100% !important;
                    min-width: 0 !important;
                    flex-grow: 1 !important;
                    margin: 0 !important;
                    box-sizing: border-box !important;
                    display: flex !important;
                    flex-direction: column !important;
                    overflow: visible !important;
                }

                /* ── Canvas container ── */
                [class*="paint-editor_canvas-container"],
                div[class*="paint-editor_canvas-container"] {
                    width: 100% !important;
                    max-width: 100% !important;
                    min-width: 0 !important;
                    height: ${canvasH}px !important;
                    max-height: ${canvasH}px !important;
                    flex: 0 0 ${canvasH}px !important;
                    position: relative !important;
                    overflow: hidden !important;
                    box-sizing: border-box !important;
                }

                /* ── Paper canvas wrapper / layer ── */
                [class*="paper-canvas_paper-canvas"] {
                    width: 100% !important;
                    height: ${canvasH}px !important;
                }
                
                /* ── Scrollable canvas inner wrappers ── */
                [class*="scrollable-canvas"] > div,
                [class*="paint-editor_canvas-container"] > div {
                    width: 100% !important;
                    max-width: 100% !important;
                    min-width: 0 !important;
                }

                /* ── Canvas controls (bitmap/vector toggle + zoom) ── */
                [class*="paint-editor_canvas-controls"] {
                    display: flex !important;
                    position: relative !important;
                    left: 0 !important;
                    right: 0 !important;
                    width: 100% !important;
                    max-width: 100% !important;
                    height: auto !important;
                    min-height: 36px !important;
                    flex-shrink: 0 !important;
                    flex-wrap: wrap !important;
                    margin-top: 4px !important;
                    box-sizing: border-box !important;
                    justify-content: space-between !important;
                    transform: none !important;
                    align-items: center !important;
                    overflow: visible !important;
                }

                /* ── Bitmap/Vector toggle button ── */
                [class*="paint-editor_bitmap-button"] {
                    display: flex !important;
                    align-items: center !important;
                    padding: 4px 8px !important;
                    font-size: 0.75rem !important;
                    border-radius: 5px !important;
                    white-space: nowrap !important;
                    flex-shrink: 0 !important;
                    min-height: 28px !important;
                }
                [class*="paint-editor_bitmap-button-icon"] {
                    width: 1.25rem !important;
                    height: 1.25rem !important;
                    margin-right: 4px !important;
                }

                /* ── Toolbar rows: horizontal scroll on mobile ── */
                [class*="paint-editor_editor-container-top"] > [class*="paint-editor_row"] {
                    position: relative !important;
                    left: 0 !important;
                    right: 0 !important;
                    transform: none !important;
                    margin-left: 0 !important;
                    margin-right: 0 !important;
                    width: 100% !important;
                    max-width: ${availW - 10}px !important;
                    min-width: 0 !important;
                    overflow-x: scroll !important;
                    overflow-y: hidden !important;
                    flex-wrap: nowrap !important;
                    box-sizing: border-box !important;
                    align-self: flex-start !important;
                    align-items: center !important;
                    -webkit-overflow-scrolling: touch !important;
                    touch-action: pan-x !important;
                }

                /* ── Inner fixed-tools row: unconstrained width, expands beyond parent ── */
                [class*="fixed-tools_row"] {
                    width: max-content !important;
                    min-width: max-content !important;
                    max-width: none !important;
                    overflow: visible !important;
                    flex-wrap: nowrap !important;
                    flex-shrink: 0 !important;
                    gap: 4px !important;
                    align-items: center !important;
                }

                /* ── Nested paint-editor rows (InputGroups that use .row class) ── */
                [class*="paint-editor_row"] [class*="paint-editor_row"] {
                    width: max-content !important;
                    min-width: max-content !important;
                    max-width: none !important;
                    overflow: visible !important;
                    flex-wrap: nowrap !important;
                    flex-shrink: 0 !important;
                }

                /* ── Zoom controls ── */
                [class*="paint-editor_zoom-controls"] {
                    flex-shrink: 0 !important;
                }

                /* ── Fix input groups in toolbar rows ── */
                [class*="input-group_input-group"] {
                    flex-shrink: 0 !important;
                    flex-wrap: nowrap !important;
                }

                /* ── Reduce gap between fill/stroke and mode-tools ── */
                [class*="paint-editor_mod-mode-tools"] {
                    margin-left: 4px !important;
                    margin-right: 0 !important;
                }
                [class*="input-group_input-group"] + [class*="input-group_input-group"] {
                    margin-left: 4px !important;
                    margin-right: 0 !important;
                }

                /* ── Shrink costume name input on mobile ── */
                [class*="fixed-tools_costume-input"],
                input[class*="fixed-tools_costume-input"] {
                    width: 4.5rem !important;
                    min-width: 3rem !important;
                    max-width: 5rem !important;
                    font-size: 12px !important;
                }

                /* ── Toolbar undo/redo icon buttons ── */
                [class*="fixed-tools_button-group-button"] {
                    padding: 0.3rem !important;
                }
                [class*="fixed-tools_button-group-button-icon"] {
                    width: 2rem !important;
                    height: 2rem !important;
                }

                /* ── Labeled icon buttons: vertical layout (icon top, label bottom) ── */
                [class*="labeled-icon-button_mod-edit-field"] {
                    display: inline-flex !important;
                    flex-direction: column !important;
                    align-items: center !important;
                    justify-content: center !important;
                    flex-shrink: 0 !important;
                    min-width: 2.5rem !important;
                    padding: 0.2rem 0.3rem !important;
                }
                [class*="labeled-icon-button_edit-field-icon"] {
                    width: 2rem !important;
                    height: 2rem !important;
                    flex-grow: 0 !important;
                    flex-shrink: 0 !important;
                }
                [class*="labeled-icon-button_edit-field-title"] {
                    display: block !important;
                    font-size: 0.55rem !important;
                    margin-top: 0.1rem !important;
                    white-space: nowrap !important;
                    text-align: center !important;
                }

                /* ── Toolbar row scrollbar styling ── */
                [class*="paint-editor_row"]::-webkit-scrollbar {
                    height: 3px !important;
                }
                [class*="paint-editor_row"]::-webkit-scrollbar-thumb {
                    background: rgba(0,0,0,0.15) !important;
                    border-radius: 2px !important;
                }

                /* ── Hide scrollbars nicely ── */
                [class*="paint-editor_mode-selector"]::-webkit-scrollbar {
                    height: 3px !important;
                }
                [class*="paint-editor_mode-selector"]::-webkit-scrollbar-thumb {
                    background: rgba(0,0,0,0.15) !important;
                    border-radius: 2px !important;
                }

                /* ── HIDE scrollable-canvas scrollbar overlays on mobile ── */
                [class*="scrollable-canvas_vertical-scrollbar-wrapper"],
                [class*="scrollable-canvas_horizontal-scrollbar-wrapper"] {
                    display: none !important;
                    pointer-events: none !important;
                    width: 0 !important;
                    height: 0 !important;
                    visibility: hidden !important;
                }
                [class*="scrollable-canvas_vertical-scrollbar-hitbox"],
                [class*="scrollable-canvas_horizontal-scrollbar-hitbox"] {
                    display: none !important;
                    pointer-events: none !important;
                }

                /* ── Collapsible toolbar ── */
                .toolbar-collapse-wrapper {
                    width: 100% !important;
                    overflow: hidden !important;
                    transition: max-height 0.3s ease, opacity 0.2s ease !important;
                    will-change: max-height, opacity !important;
                }
                .toolbar-collapse-wrapper.collapsed {
                    max-height: 0 !important;
                    opacity: 0 !important;
                    pointer-events: none !important;
                }
                .toolbar-collapse-wrapper.expanded {
                    max-height: 300px !important;
                    opacity: 1 !important;
                }
                .toolbar-toggle-btn {
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    width: calc(100% + 8px) !important;
                    margin-left: -4px !important;
                    margin-right: -4px !important;
                    height: 36px !important;
                    border: none !important;
                    background: linear-gradient(180deg, #ff8c1a, #e67300) !important;
                    border-radius: 0 !important;
                    cursor: pointer !important;
                    font-size: 13px !important;
                    font-weight: 700 !important;
                    color: #fff !important;
                    letter-spacing: 0.5px !important;
                    gap: 8px !important;
                    touch-action: manipulation !important;
                    -webkit-tap-highlight-color: transparent !important;
                    user-select: none !important;
                    flex-shrink: 0 !important;
                    position: relative !important;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.15) !important;
                    text-shadow: 0 1px 1px rgba(0,0,0,0.2) !important;
                }
                .toolbar-toggle-btn:active {
                    background: linear-gradient(180deg, #e67300, #cc6600) !important;
                }
                .toolbar-toggle-chevron {
                    display: inline-block !important;
                    transition: transform 0.3s ease !important;
                    font-size: 12px !important;
                    color: #fff !important;
                }
                .toolbar-toggle-chevron.open {
                    transform: rotate(180deg) !important;
                }
            `;

            // ─── Apply inline styles for elements that need them ───
            const topAlignRow = document.querySelector('[class*="paint-editor_top-align-row"]');
            if (topAlignRow) {
                topAlignRow.style.setProperty('display', 'flex', 'important');
                topAlignRow.style.setProperty('flex-direction', 'column', 'important');
                topAlignRow.style.setProperty('width', '100%', 'important');
                topAlignRow.style.setProperty('max-width', '100%', 'important');
                topAlignRow.style.setProperty('height', 'auto', 'important');
                topAlignRow.style.setProperty('min-width', '0', 'important');
                topAlignRow.style.setProperty('overflow', 'visible', 'important');
                topAlignRow.style.setProperty('overflow-x', 'visible', 'important');
                topAlignRow.style.setProperty('overflow-y', 'visible', 'important');
                topAlignRow.style.setProperty('padding-top', '4px', 'important');
                this.logDebug(`TopAlignRow inline fix applied`);
            }

            const editorContainerTop = document.querySelector('[class*="paint-editor_editor-container-top"]');
            if (editorContainerTop) {
                editorContainerTop.style.cssText += ';width:100%;max-width:100%;height:auto;overflow:visible;';
            }

            const editorContainer = document.querySelector('[class*="paint-editor_editor-container"]');
            if (editorContainer) {
                editorContainer.style.cssText += ';width:100%;max-width:100%;height:auto;overflow:visible;padding:4px;';
            }

            // Force toolbar rows to scroll horizontally with touch-action
            const maxRowW = `${availW - 10}px`;
            const ect2 = document.querySelector('[class*="paint-editor_editor-container-top"]');
            if (ect2) {
                // Direct children rows: scrollable containers
                Array.from(ect2.children).forEach((row) => {
                    if (row.className && row.className.includes && row.className.includes('row')) {
                        row.style.setProperty('overflow-x', 'scroll', 'important');
                        row.style.setProperty('overflow-y', 'hidden', 'important');
                        row.style.setProperty('width', '100%', 'important');
                        row.style.setProperty('max-width', maxRowW, 'important');
                        row.style.setProperty('min-width', '0', 'important');
                        row.style.setProperty('flex-wrap', 'nowrap', 'important');
                        row.style.setProperty('align-self', 'flex-start', 'important');
                        row.style.setProperty('align-items', 'center', 'important');
                        row.style.setProperty('-webkit-overflow-scrolling', 'touch', 'important');
                        row.style.setProperty('touch-action', 'pan-x', 'important');
                        this.logDebug(`TopRow scroll: ${row.className.substring(0, 30)} maxW=${maxRowW}`);
                    }
                });

                // ── Collapsible toolbar wrapper ──
                if (!document.querySelector('.toolbar-collapse-wrapper')) {
                    const collapseWrapper = document.createElement('div');
                    collapseWrapper.className = 'toolbar-collapse-wrapper collapsed';

                    // Move all row children into the wrapper
                    const rowsToWrap = Array.from(ect2.children).filter(
                        el => el.className && el.className.includes && el.className.includes('row')
                    );
                    rowsToWrap.forEach(row => collapseWrapper.appendChild(row));
                    ect2.insertBefore(collapseWrapper, ect2.firstChild);

                    // Create toggle button
                    const toggleBtn = document.createElement('button');
                    toggleBtn.className = 'toolbar-toggle-btn';
                    toggleBtn.innerHTML = '<span class="toolbar-toggle-chevron">▼</span> Edit Tools';

                    toggleBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const wrapper = document.querySelector('.toolbar-collapse-wrapper');
                        const chevron = toggleBtn.querySelector('.toolbar-toggle-chevron');
                        if (wrapper.classList.contains('collapsed')) {
                            wrapper.classList.remove('collapsed');
                            wrapper.classList.add('expanded');
                            chevron.classList.add('open');
                            toggleBtn.innerHTML = '<span class="toolbar-toggle-chevron open">▲</span> Hide Tools';
                        } else {
                            wrapper.classList.remove('expanded');
                            wrapper.classList.add('collapsed');
                            chevron.classList.remove('open');
                            toggleBtn.innerHTML = '<span class="toolbar-toggle-chevron">▼</span> Edit Tools';
                        }
                    });

                    ect2.appendChild(toggleBtn);
                    this.logDebug('Collapsible toolbar created');
                }
            }

            // Inner fixed-tools rows: unconstrained width (must be wider than parent to create scroll)
            document.querySelectorAll('[class*="fixed-tools_row"]').forEach((row) => {
                row.style.setProperty('width', 'max-content', 'important');
                row.style.setProperty('min-width', 'max-content', 'important');
                row.style.setProperty('max-width', 'none', 'important');
                row.style.setProperty('overflow', 'visible', 'important');
                row.style.setProperty('flex-shrink', '0', 'important');
                row.style.setProperty('flex-wrap', 'nowrap', 'important');
                row.style.setProperty('gap', '4px', 'important');
                row.style.setProperty('align-items', 'center', 'important');
            });

            // Nested paint-editor rows (inner InputGroups): also unconstrained
            document.querySelectorAll('[class*="paint-editor_row"] [class*="paint-editor_row"]').forEach((row) => {
                row.style.setProperty('width', 'max-content', 'important');
                row.style.setProperty('min-width', 'max-content', 'important');
                row.style.setProperty('max-width', 'none', 'important');
                row.style.setProperty('overflow', 'visible', 'important');
                row.style.setProperty('flex-shrink', '0', 'important');
                row.style.setProperty('flex-wrap', 'nowrap', 'important');
            });

            // Force display:block on ALL labeled-icon-button title spans
            document.querySelectorAll('[class*="labeled-icon-button_edit-field-title"]').forEach((titleEl, idx) => {
                titleEl.style.setProperty('display', 'block', 'important');
                titleEl.style.setProperty('visibility', 'visible', 'important');
                titleEl.style.setProperty('font-size', '0.55rem', 'important');
                titleEl.style.setProperty('margin-top', '0.1rem', 'important');
                titleEl.style.setProperty('white-space', 'nowrap', 'important');
                titleEl.style.setProperty('text-align', 'center', 'important');

            });

            // Force labeled-icon-button layout: vertical (icon on top, label below)
            document.querySelectorAll('[class*="labeled-icon-button_mod-edit-field"]').forEach((btn) => {
                btn.style.setProperty('display', 'inline-flex', 'important');
                btn.style.setProperty('flex-direction', 'column', 'important');
                btn.style.setProperty('align-items', 'center', 'important');
                btn.style.setProperty('justify-content', 'center', 'important');
                btn.style.setProperty('flex-shrink', '0', 'important');
            });

            // Force labeled-icon-button icon sizes (bigger)
            document.querySelectorAll('[class*="labeled-icon-button_edit-field-icon"]').forEach((iconEl) => {
                iconEl.style.setProperty('width', '2rem', 'important');
                iconEl.style.setProperty('height', '2rem', 'important');
                iconEl.style.setProperty('flex-grow', '0', 'important');
                iconEl.style.setProperty('flex-shrink', '0', 'important');
            });

            // Force fixed-tools button group icon sizes (bigger)
            document.querySelectorAll('[class*="fixed-tools_button-group-button-icon"]').forEach((iconEl) => {
                iconEl.style.setProperty('width', '2rem', 'important');
                iconEl.style.setProperty('height', '2rem', 'important');
            });

            // Reset mode selector scroll to show first button ("Select")
            const modeSelector = document.querySelector('[class*="paint-editor_mode-selector"]');
            if (modeSelector) {
                modeSelector.scrollLeft = 0;
                modeSelector.style.setProperty('touch-action', 'pan-x', 'important');
                modeSelector.style.setProperty('overflow-x', 'scroll', 'important');
                modeSelector.style.setProperty('overflow-y', 'hidden', 'important');
                this.logDebug(`ModeSelector scrollLeft reset to 0, touch-action=pan-x`);
            }

            const controlsContainer = document.querySelector('[class*="paint-editor_controls-container"]');
            if (controlsContainer) {
                controlsContainer.style.setProperty('width', '100%', 'important');
                controlsContainer.style.setProperty('max-width', '100%', 'important');
                controlsContainer.style.setProperty('min-width', '0', 'important');
                controlsContainer.style.setProperty('margin', '0', 'important');
                controlsContainer.style.setProperty('display', 'flex', 'important');
                controlsContainer.style.setProperty('flex-direction', 'column', 'important');
                controlsContainer.style.setProperty('overflow', 'visible', 'important');
            }

            const canvasContainer = document.querySelector('[class*="paint-editor_canvas-container"]');
            if (canvasContainer) {
                canvasContainer.style.setProperty('width', '100%', 'important');
                canvasContainer.style.setProperty('max-width', '100%', 'important');
                canvasContainer.style.setProperty('min-width', '0', 'important');
                canvasContainer.style.setProperty('height', `${canvasH}px`, 'important');
                canvasContainer.style.setProperty('max-height', `${canvasH}px`, 'important');
                canvasContainer.style.setProperty('flex', `0 0 ${canvasH}px`, 'important');
                canvasContainer.style.setProperty('overflow', 'hidden', 'important');
                canvasContainer.style.setProperty('position', 'relative', 'important');
                canvasContainer.style.setProperty('box-sizing', 'border-box', 'important');
            }

            // Fix CanvasControls - was rendering at x=-5 off-screen
            const canvasControls = document.querySelector('[class*="paint-editor_canvas-controls"]');
            if (canvasControls) {
                canvasControls.style.setProperty('display', 'flex', 'important');
                canvasControls.style.setProperty('position', 'relative', 'important');
                canvasControls.style.setProperty('left', '0', 'important');
                canvasControls.style.setProperty('right', '0', 'important');
                canvasControls.style.setProperty('width', '100%', 'important');
                canvasControls.style.setProperty('max-width', '100%', 'important');
                canvasControls.style.setProperty('height', 'auto', 'important');
                canvasControls.style.setProperty('min-height', '36px', 'important');
                canvasControls.style.setProperty('flex-shrink', '0', 'important');
                canvasControls.style.setProperty('margin', '4px 0 0 0', 'important');
                canvasControls.style.setProperty('padding', '0', 'important');
                canvasControls.style.setProperty('transform', 'none', 'important');
                canvasControls.style.setProperty('box-sizing', 'border-box', 'important');
                canvasControls.style.setProperty('justify-content', 'space-between', 'important');
                canvasControls.style.setProperty('align-items', 'center', 'important');
                canvasControls.style.setProperty('flex-wrap', 'wrap', 'important');
                canvasControls.style.setProperty('gap', '4px', 'important');
            }

            // ─── Hide scrollable-canvas scrollbar overlays on mobile ───
            document.querySelectorAll('[class*="scrollable-canvas_vertical-scrollbar"], [class*="scrollable-canvas_horizontal-scrollbar"]').forEach((el) => {
                el.style.setProperty('display', 'none', 'important');
                el.style.setProperty('pointer-events', 'none', 'important');
                el.style.setProperty('visibility', 'hidden', 'important');
                el.style.setProperty('width', '0', 'important');
                el.style.setProperty('height', '0', 'important');

            });

            document.querySelectorAll('[class*="paint-editor_mode-selector"] [role="button"]').forEach((btn, idx) => {
                const title = btn.getAttribute('title');

                if (title) {
                    let labelSpan = btn.querySelector('.mode-label');
                    if (!labelSpan) {
                        labelSpan = document.createElement('span');
                        labelSpan.className = 'mode-label';
                        btn.appendChild(labelSpan);
                    }
                    labelSpan.textContent = title;

                    // Force inline styles on labels to guarantee visibility
                    labelSpan.style.setProperty('display', 'block', 'important');
                    labelSpan.style.setProperty('visibility', 'visible', 'important');
                    labelSpan.style.setProperty('opacity', '1', 'important');
                    labelSpan.style.setProperty('position', 'static', 'important');
                    labelSpan.style.setProperty('font-size', '10px', 'important');
                    labelSpan.style.setProperty('font-weight', '700', 'important');
                    labelSpan.style.setProperty('line-height', '12px', 'important');
                    labelSpan.style.setProperty('color', '#222', 'important');
                    labelSpan.style.setProperty('text-align', 'center', 'important');
                    labelSpan.style.setProperty('width', '100%', 'important');
                    labelSpan.style.setProperty('margin-top', '2px', 'important');
                    labelSpan.style.setProperty('z-index', '3', 'important');
                    labelSpan.style.setProperty('white-space', 'nowrap', 'important');
                    labelSpan.style.setProperty('overflow', 'hidden', 'important');
                    labelSpan.style.setProperty('text-overflow', 'ellipsis', 'important');

                    // Also force button to flex-column so label goes below icon
                    btn.style.setProperty('display', 'flex', 'important');
                    btn.style.setProperty('flex-direction', 'column', 'important');
                    btn.style.setProperty('align-items', 'center', 'important');
                    btn.style.setProperty('justify-content', 'center', 'important');
                    btn.style.setProperty('height', 'auto', 'important');
                    btn.style.setProperty('min-height', '48px', 'important');
                    btn.style.setProperty('max-height', 'none', 'important');
                    btn.style.setProperty('overflow', 'visible', 'important');
                    btn.style.setProperty('padding', '4px 2px 2px', 'important');

                    // Force icon size
                    const icon = btn.querySelector('img');
                    if (icon) {
                        icon.style.setProperty('width', '24px', 'important');
                        icon.style.setProperty('height', '24px', 'important');
                        icon.style.setProperty('max-height', '24px', 'important');
                        icon.style.setProperty('flex-grow', '0', 'important');
                        icon.style.setProperty('flex-shrink', '0', 'important');
                    }

                }
            });

            // ─── TARGETED DEBUG: Scroll, Bitmap, Rectangle ───
            setTimeout(() => {
                this.logDebug('=== SCROLL DEBUG ===');
                // Check each direct-child row of editor-container-top
                const ect3 = document.querySelector('[class*="paint-editor_editor-container-top"]');
                if (ect3) {
                    const ectR = ect3.getBoundingClientRect();
                    const ectS = window.getComputedStyle(ect3);
                    this.logDebug(`ECT: ${ectR.width.toFixed(0)}x${ectR.height.toFixed(0)} display=${ectS.display} overflow=${ectS.overflow} width=${ectS.width} maxW=${ectS.maxWidth} minW=${ectS.minWidth}`);

                    Array.from(ect3.children).forEach((row, i) => {
                        const r = row.getBoundingClientRect();
                        const s = window.getComputedStyle(row);
                        this.logDebug(`OuterRow${i}: renderedW=${r.width.toFixed(0)} renderedH=${r.height.toFixed(0)}`);
                        this.logDebug(`  CSS: width=${s.width} maxW=${s.maxWidth} minW=${s.minWidth}`);
                        this.logDebug(`  overflow: x=${s.overflowX} y=${s.overflowY} touchAction=${s.touchAction}`);
                        this.logDebug(`  scroll: scrollW=${row.scrollWidth} clientW=${row.clientWidth} canScroll=${row.scrollWidth > row.clientWidth}`);
                        this.logDebug(`  flex: wrap=${s.flexWrap} shrink=${s.flexShrink} grow=${s.flexGrow} display=${s.display}`);
                        this.logDebug(`  class: ${row.className.substring(0, 60)}`);

                        // Check each child of this row
                        Array.from(row.children).forEach((child, j) => {
                            const cr = child.getBoundingClientRect();
                            const cs = window.getComputedStyle(child);
                            this.logDebug(`  Child${j}: ${cr.width.toFixed(0)}x${cr.height.toFixed(0)} width=${cs.width} minW=${cs.minWidth} maxW=${cs.maxWidth} flex-shrink=${cs.flexShrink} class=${child.className.substring(0, 50)}`);
                        });
                    });
                }

                this.logDebug('=== BITMAP BUTTON DEBUG ===');
                const bitmapBtn = document.querySelector('[class*="paint-editor_bitmap-button"]');
                if (bitmapBtn) {
                    const r = bitmapBtn.getBoundingClientRect();
                    const s = window.getComputedStyle(bitmapBtn);
                    this.logDebug(`BitmapBtn: ${r.width.toFixed(0)}x${r.height.toFixed(0)} pos=[${r.left.toFixed(0)},${r.top.toFixed(0)}]`);
                    this.logDebug(`  display=${s.display} visibility=${s.visibility} opacity=${s.opacity}`);
                    this.logDebug(`  padding=${s.padding} fontSize=${s.fontSize} color=${s.color} bg=${s.backgroundColor}`);
                    this.logDebug(`  text="${bitmapBtn.textContent.trim().substring(0, 30)}"`);
                    // Check parent chain
                    let parent = bitmapBtn.parentElement;
                    let depth = 0;
                    while (parent && depth < 3) {
                        const pr = parent.getBoundingClientRect();
                        const ps = window.getComputedStyle(parent);
                        this.logDebug(`  Parent${depth}: ${pr.width.toFixed(0)}x${pr.height.toFixed(0)} pos=[${pr.left.toFixed(0)},${pr.top.toFixed(0)}] overflow=${ps.overflow} display=${ps.display} class=${parent.className.substring(0, 40)}`);
                        parent = parent.parentElement;
                        depth++;
                    }
                } else {
                    this.logDebug(`BitmapBtn: NOT FOUND! Searching for any button with "bitmap" or "Convert"...`);
                    document.querySelectorAll('button, [role="button"], span, div').forEach(el => {
                        const text = el.textContent.trim();
                        if (text.includes('Convert') || text.includes('bitmap') || text.includes('vector')) {
                            const r = el.getBoundingClientRect();
                            const s = window.getComputedStyle(el);
                            this.logDebug(`  Found: "${text.substring(0, 30)}" ${r.width.toFixed(0)}x${r.height.toFixed(0)} pos=[${r.left.toFixed(0)},${r.top.toFixed(0)}] display=${s.display} vis=${s.visibility} class=${el.className.substring(0, 40)}`);
                        }
                    });
                }

                this.logDebug('=== RECTANGLE BUTTON DEBUG ===');
                const allBtns = document.querySelectorAll('[class*="paint-editor_mode-selector"] [role="button"]');
                const rectBtn = allBtns[allBtns.length - 1]; // Last button = Rectangle
                if (rectBtn) {
                    const r = rectBtn.getBoundingClientRect();
                    const s = window.getComputedStyle(rectBtn);
                    this.logDebug(`RectBtn: ${r.width.toFixed(0)}x${r.height.toFixed(0)} pos=[${r.left.toFixed(0)},${r.top.toFixed(0)}]`);
                    this.logDebug(`  height=${s.height} minH=${s.minHeight} maxH=${s.maxHeight} padding=${s.padding}`);
                    const label = rectBtn.querySelector('.mode-label');
                    if (label) {
                        const lr = label.getBoundingClientRect();
                        const ls = window.getComputedStyle(label);
                        this.logDebug(`  Label: ${lr.width.toFixed(0)}x${lr.height.toFixed(0)} fontSize=${ls.fontSize} lineHeight=${ls.lineHeight} overflow=${ls.overflow} textOverflow=${ls.textOverflow} whiteSpace=${ls.whiteSpace}`);
                        this.logDebug(`  Label text="${label.textContent}" display=${ls.display}`);
                    }
                    const icon = rectBtn.querySelector('img');
                    if (icon) {
                        const ir = icon.getBoundingClientRect();
                        this.logDebug(`  Icon: ${ir.width.toFixed(0)}x${ir.height.toFixed(0)}`);
                    }
                    // Check mode-selector container height
                    const ms = rectBtn.closest('[class*="paint-editor_mode-selector"]');
                    if (ms) {
                        const mr = ms.getBoundingClientRect();
                        const mss = window.getComputedStyle(ms);
                        this.logDebug(`  ModeSelector: ${mr.width.toFixed(0)}x${mr.height.toFixed(0)} maxH=${mss.maxHeight} overflowY=${mss.overflowY} alignItems=${mss.alignItems}`);
                    }
                }
                this.logDebug('=== END DEBUG ===');
            }, 200);
        }, 100);
    }

    handleUpdateName(name) {
        this.props.vm.renameCostume(this.props.selectedCostumeIndex, name);
    }

    handleUpdateImage(isVector, image, rotationCenterX, rotationCenterY) {
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

    render() {
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

const mapStateToProps = (state, { selectedCostumeIndex }) => {
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
