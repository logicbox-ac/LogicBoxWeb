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
                    overflow-x: auto !important;
                    overflow-y: visible !important;
                    flex-shrink: 0 !important;
                    padding: 4px 0 !important;
                    gap: 2px !important;
                    -webkit-overflow-scrolling: touch !important;
                    align-items: stretch !important;
                    align-content: flex-start !important;
                    justify-content: flex-start !important;
                    height: auto !important;
                    max-height: 65px !important;
                    background: rgba(255,255,255,0.95) !important;
                    border-bottom: 1px solid #e0e0e0 !important;
                    z-index: 1 !important;
                }

                /* ── Tool buttons inside mode-selector ── */
                [class*="paint-editor_mode-selector"] [role="button"],
                [class*="paint-editor_mode-selector"] button {
                    display: flex !important;
                    flex-direction: column !important;
                    align-items: center !important;
                    justify-content: center !important;
                    min-width: 44px !important;
                    max-width: 52px !important;
                    width: 48px !important;
                    height: 56px !important;
                    max-height: 56px !important;
                    flex-shrink: 0 !important;
                    position: relative !important;
                    overflow: visible !important;
                    padding: 4px 2px 2px !important;
                    box-sizing: border-box !important;
                    z-index: 2 !important;
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
                    z-index: 3 !important;
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
                }

                /* ── Outer paint-editor rows (direct children of container-top): scrollable ── */
                [class*="paint-editor_editor-container-top"] > [class*="paint-editor_row"] {
                    position: relative !important;
                    left: 0 !important;
                    right: 0 !important;
                    transform: none !important;
                    margin-left: 0 !important;
                    margin-right: 0 !important;
                    width: 100% !important;
                    max-width: ${availW - 10}px !important;
                    overflow-x: auto !important;
                    overflow-y: visible !important;
                    flex-wrap: nowrap !important;
                    box-sizing: border-box !important;
                    -webkit-overflow-scrolling: touch !important;
                    align-self: flex-start !important;
                }

                /* ── All non-top-level paint-editor rows: unconstrained width ── */
                [class*="paint-editor_row"] [class*="paint-editor_row"],
                [class*="paint-editor_tool-row"],
                [class*="paint-editor_options-row"] {
                    width: max-content !important;
                    max-width: none !important;
                    overflow: visible !important;
                    flex-wrap: nowrap !important;
                    flex-shrink: 0 !important;
                }

                /* ── Inner fixed-tools row: unconstrained so it can overflow parent ── */
                [class*="fixed-tools_row"] {
                    width: max-content !important;
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

            // Force OUTER paint-editor rows (direct children of container-top) to scroll horizontally
            const maxRowW = `${availW - 10}px`;
            const ect = document.querySelector('[class*="paint-editor_editor-container-top"]');
            if (ect) {
                // Only direct children rows get scroll treatment
                Array.from(ect.children).forEach((row) => {
                    if (row.className && row.className.includes && row.className.includes('row')) {
                        row.style.setProperty('overflow-x', 'auto', 'important');
                        row.style.setProperty('overflow-y', 'visible', 'important');
                        row.style.setProperty('width', '100%', 'important');
                        row.style.setProperty('max-width', maxRowW, 'important');
                        row.style.setProperty('flex-wrap', 'nowrap', 'important');
                        row.style.setProperty('align-self', 'flex-start', 'important');
                        row.style.setProperty('-webkit-overflow-scrolling', 'touch', 'important');
                        this.logDebug(`TopRow scrollable: ${row.className.substring(0, 30)} maxW=${maxRowW}`);

                        // Make nested rows inside this one unconstrained
                        row.querySelectorAll('[class*="paint-editor_row"], [class*="fixed-tools_row"]').forEach((inner) => {
                            inner.style.setProperty('width', 'max-content', 'important');
                            inner.style.setProperty('max-width', 'none', 'important');
                            inner.style.setProperty('overflow', 'visible', 'important');
                            inner.style.setProperty('flex-shrink', '0', 'important');
                        });
                    }
                });
            }

            // INNER fixed-tools rows: unconstrained width so they overflow the outer row
            document.querySelectorAll('[class*="fixed-tools_row"]').forEach((row) => {
                row.style.setProperty('width', 'max-content', 'important');
                row.style.setProperty('max-width', 'none', 'important');
                row.style.setProperty('overflow', 'visible', 'important');
                row.style.setProperty('flex-shrink', '0', 'important');
            });

            // Force display:block on ALL labeled-icon-button title spans
            document.querySelectorAll('[class*="labeled-icon-button_edit-field-title"]').forEach((titleEl, idx) => {
                titleEl.style.setProperty('display', 'block', 'important');
                titleEl.style.setProperty('visibility', 'visible', 'important');
                titleEl.style.setProperty('font-size', '0.55rem', 'important');
                titleEl.style.setProperty('margin-top', '0.1rem', 'important');
                titleEl.style.setProperty('white-space', 'nowrap', 'important');
                titleEl.style.setProperty('text-align', 'center', 'important');
                this.logDebug(`Forced title${idx} display:block text="${titleEl.textContent}"`);
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
                this.logDebug(`ModeSelector scrollLeft reset to 0`);
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

            // Fix CanvasControls - was rendering at x=-140 off-screen
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
                canvasControls.style.setProperty('margin-top', '4px', 'important');
                canvasControls.style.setProperty('transform', 'none', 'important');
                canvasControls.style.setProperty('box-sizing', 'border-box', 'important');
                canvasControls.style.setProperty('justify-content', 'space-between', 'important');
                this.logDebug(`CanvasControls inline fix applied`);
            }

            // ─── Hide scrollable-canvas scrollbar overlays on mobile ───
            document.querySelectorAll('[class*="scrollable-canvas_vertical-scrollbar"], [class*="scrollable-canvas_horizontal-scrollbar"]').forEach((el) => {
                el.style.setProperty('display', 'none', 'important');
                el.style.setProperty('pointer-events', 'none', 'important');
                el.style.setProperty('visibility', 'hidden', 'important');
                el.style.setProperty('width', '0', 'important');
                el.style.setProperty('height', '0', 'important');
                this.logDebug(`Hidden scrollbar overlay: ${el.className.substring(0, 50)}`);
            });

            document.querySelectorAll('[class*="paint-editor_mode-selector"] [role="button"]').forEach((btn, idx) => {
                const title = btn.getAttribute('title');
                this.logDebug(`Adding label to Btn${idx}: title="${title}"`);

                if (title) {
                    let labelSpan = btn.querySelector('.mode-label');
                    if (!labelSpan) {
                        labelSpan = document.createElement('span');
                        labelSpan.className = 'mode-label';
                        btn.appendChild(labelSpan);
                        this.logDebug(`Created span for Btn${idx}`);
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
                    btn.style.setProperty('height', '56px', 'important');
                    btn.style.setProperty('max-height', '56px', 'important');
                    btn.style.setProperty('overflow', 'visible', 'important');

                    // Force icon size
                    const icon = btn.querySelector('img');
                    if (icon) {
                        icon.style.setProperty('width', '24px', 'important');
                        icon.style.setProperty('height', '24px', 'important');
                        icon.style.setProperty('max-height', '24px', 'important');
                        icon.style.setProperty('flex-grow', '0', 'important');
                        icon.style.setProperty('flex-shrink', '0', 'important');
                    }

                    // Check what's inside the button
                    const childClasses = Array.from(btn.children).map(c => c.className || c.tagName);
                    this.logDebug(`Btn${idx} children: ${childClasses.join(',')}`);
                }
            });

            // ─── Comprehensive debug logging after a beat ───
            setTimeout(() => {
                this.logDebug('=== MOBILE PAINT DEBUG ===');
                this.logDebug(`Viewport: ${window.innerWidth}x${window.innerHeight}, canvasH target=${canvasH}`);

                // Editor container
                const ec = document.querySelector('[class*="paint-editor_editor-container"]');
                if (ec) {
                    const r = ec.getBoundingClientRect();
                    const s = window.getComputedStyle(ec);
                    this.logDebug(`EditorContainer: ${r.width.toFixed(0)}x${r.height.toFixed(0)} pos=[${r.left.toFixed(0)},${r.top.toFixed(0)}] display=${s.display} flexDir=${s.flexDirection} overflow=${s.overflow}`);
                }

                // Top align row
                const tar = document.querySelector('[class*="paint-editor_top-align-row"]');
                if (tar) {
                    const r = tar.getBoundingClientRect();
                    const s = window.getComputedStyle(tar);
                    this.logDebug(`TopAlignRow: ${r.width.toFixed(0)}x${r.height.toFixed(0)} display=${s.display} flexDir=${s.flexDirection} minW=${s.minWidth} overflow=${s.overflow} overflowX=${s.overflowX} overflowY=${s.overflowY}`);
                }

                // Editor container top
                const ect = document.querySelector('[class*="paint-editor_editor-container-top"]');
                if (ect) {
                    const r = ect.getBoundingClientRect();
                    const s = window.getComputedStyle(ect);
                    this.logDebug(`EditorContainerTop: ${r.width.toFixed(0)}x${r.height.toFixed(0)} pos=[${r.left.toFixed(0)},${r.top.toFixed(0)}] overflow=${s.overflow} childCount=${ect.children.length}`);
                }

                // Toolbar rows
                const rows = document.querySelectorAll('[class*="paint-editor_row"], [class*="fixed-tools_row"]');
                rows.forEach((row, idx) => {
                    const r = row.getBoundingClientRect();
                    const s = window.getComputedStyle(row);
                    const cls = row.className.substring(0, 40);
                    this.logDebug(`ToolbarRow${idx}: ${r.width.toFixed(0)}x${r.height.toFixed(0)} pos=[${r.left.toFixed(0)},${r.top.toFixed(0)}] flexWrap=${s.flexWrap} overflow=${s.overflow} children=${row.children.length} class="${cls}"`);
                });

                // Labeled icon buttons (Group, Ungroup, Forward, Backward)
                const libBtns = document.querySelectorAll('[class*="labeled-icon-button_mod-edit-field"]');
                this.logDebug(`LabeledIconButtons found: ${libBtns.length}`);
                libBtns.forEach((btn, idx) => {
                    const r = btn.getBoundingClientRect();
                    const iconEl = btn.querySelector('img');
                    const titleEl = btn.querySelector('[class*="labeled-icon-button_edit-field-title"]');
                    this.logDebug(`  LIB${idx}: ${r.width.toFixed(0)}x${r.height.toFixed(0)} pos=[${r.left.toFixed(0)},${r.top.toFixed(0)}] icon=${iconEl ? `${iconEl.getBoundingClientRect().width.toFixed(0)}x${iconEl.getBoundingClientRect().height.toFixed(0)}` : 'NONE'} title="${titleEl ? titleEl.textContent : 'NONE'}" titleDisplay=${titleEl ? window.getComputedStyle(titleEl).display : 'N/A'}`);
                });

                // Input groups
                const inputGroups = document.querySelectorAll('[class*="input-group_input-group"]');
                this.logDebug(`InputGroups found: ${inputGroups.length}`);


                // Mode selector
                const ms = document.querySelector('[class*="paint-editor_mode-selector"]');
                if (ms) {
                    const r = ms.getBoundingClientRect();
                    const s = window.getComputedStyle(ms);
                    this.logDebug(`ModeSelector: ${r.width.toFixed(0)}x${r.height.toFixed(0)} pos=[${r.left.toFixed(0)},${r.top.toFixed(0)}] display=${s.display} flexDir=${s.flexDirection} maxW=${s.maxWidth} overflowX=${s.overflowX} flexWrap=${s.flexWrap}`);
                    this.logDebug(`ModeSelector scrollW=${ms.scrollWidth} clientW=${ms.clientWidth} childCount=${ms.children.length}`);
                }

                // Individual buttons
                document.querySelectorAll('[class*="paint-editor_mode-selector"] [role="button"]').forEach((btn, idx) => {
                    const r = btn.getBoundingClientRect();
                    const s = window.getComputedStyle(btn);
                    this.logDebug(`Btn${idx}: ${r.width.toFixed(0)}x${r.height.toFixed(0)} pos=[${r.left.toFixed(0)},${r.top.toFixed(0)}] display=${s.display} flexDir=${s.flexDirection} overflow=${s.overflow} padding=${s.padding}`);

                    // Check label
                    const label = btn.querySelector('.mode-label');
                    if (label) {
                        const lr = label.getBoundingClientRect();
                        const ls = window.getComputedStyle(label);
                        this.logDebug(`  Label${idx}: ${lr.width.toFixed(0)}x${lr.height.toFixed(0)} pos=[${lr.left.toFixed(0)},${lr.top.toFixed(0)}] display=${ls.display} position=${ls.position} visibility=${ls.visibility} opacity=${ls.opacity} color=${ls.color} text="${label.textContent}"`);
                    } else {
                        this.logDebug(`  Label${idx}: NOT FOUND`);
                    }

                    // Check icon
                    const icon = btn.querySelector('img');
                    if (icon) {
                        const ir = icon.getBoundingClientRect();
                        this.logDebug(`  Icon${idx}: ${ir.width.toFixed(0)}x${ir.height.toFixed(0)} pos=[${ir.left.toFixed(0)},${ir.top.toFixed(0)}]`);
                    }
                });

                // Controls container
                const cc = document.querySelector('[class*="paint-editor_controls-container"]');
                if (cc) {
                    const r = cc.getBoundingClientRect();
                    const s = window.getComputedStyle(cc);
                    this.logDebug(`ControlsContainer: ${r.width.toFixed(0)}x${r.height.toFixed(0)} pos=[${r.left.toFixed(0)},${r.top.toFixed(0)}] display=${s.display} minW=${s.minWidth} margin=${s.margin}`);
                }

                // Canvas container
                const cv = document.querySelector('[class*="paint-editor_canvas-container"]');
                if (cv) {
                    const r = cv.getBoundingClientRect();
                    const s = window.getComputedStyle(cv);
                    this.logDebug(`CanvasContainer: ${r.width.toFixed(0)}x${r.height.toFixed(0)} pos=[${r.left.toFixed(0)},${r.top.toFixed(0)}] display=${s.display} h=${s.height} maxH=${s.maxHeight} minW=${s.minWidth} flex=${s.flex} overflow=${s.overflow}`);
                }

                // Actual canvas element
                const acv = cv && cv.querySelector('canvas');
                if (acv) {
                    const r = acv.getBoundingClientRect();
                    this.logDebug(`CanvasElement: ${r.width.toFixed(0)}x${r.height.toFixed(0)} htmlW=${acv.width} htmlH=${acv.height}`);
                }

                // Canvas controls
                const cctl = document.querySelector('[class*="paint-editor_canvas-controls"]');
                if (cctl) {
                    const r = cctl.getBoundingClientRect();
                    this.logDebug(`CanvasControls: ${r.width.toFixed(0)}x${r.height.toFixed(0)} pos=[${r.left.toFixed(0)},${r.top.toFixed(0)}]`);
                }

                // Check if anything is clipped / off-viewport
                this.logDebug('=== OVERFLOW CHECK ===');
                const elements = {
                    EditorContainer: document.querySelector('[class*="paint-editor_editor-container"]'),
                    TopAlignRow: document.querySelector('[class*="paint-editor_top-align-row"]'),
                    ModeSelector: document.querySelector('[class*="paint-editor_mode-selector"]'),
                    ControlsContainer: document.querySelector('[class*="paint-editor_controls-container"]'),
                    CanvasContainer: document.querySelector('[class*="paint-editor_canvas-container"]')
                };
                Object.entries(elements).forEach(([name, el]) => {
                    if (el) {
                        const r = el.getBoundingClientRect();
                        const offLeft = r.left < 0;
                        const offRight = r.right > availW;
                        const scrollOverflow = el.scrollWidth > el.clientWidth;
                        if (offLeft || offRight || scrollOverflow) {
                            this.logDebug(`⚠️ ${name}: offLeft=${offLeft}(${r.left.toFixed(0)}) offRight=${offRight}(${r.right.toFixed(0)}) scrollOverflow=${scrollOverflow}(scrollW=${el.scrollWidth} clientW=${el.clientWidth})`);
                        } else {
                            this.logDebug(`✓ ${name}: fits OK (left=${r.left.toFixed(0)}, right=${r.right.toFixed(0)})`);
                        }
                    }
                });

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
