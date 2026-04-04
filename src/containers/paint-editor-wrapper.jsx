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
        this.canvasResizeObserver = null;
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
        if (this.canvasResizeObserver) {
            this.canvasResizeObserver.disconnect();
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

            styleEl.textContent = `
                /* ── Editor container: full width, vertical flow, fill height ── */
                [class*="paint-editor_editor-container"] {
                    width: 100% !important;
                    max-width: 100% !important;
                    height: auto !important;
                    min-height: 100% !important;
                    max-height: calc(100vh - 9rem) !important;
                    overflow-y: auto !important;
                    overflow-x: hidden !important;
                    padding: 4px !important;
                    box-sizing: border-box !important;
                    display: flex !important;
                    flex-direction: column !important;
                    -webkit-overflow-scrolling: touch !important;
                    overscroll-behavior-y: contain !important;
                }

                /* ── Editor container top (single scrollable toolbar area) ── */
                [class*="paint-editor_editor-container-top"] {
                    width: 100% !important;
                    max-width: 100% !important;
                    height: auto !important;
                    overflow-x: auto !important;
                    overflow-y: hidden !important;
                    box-sizing: border-box !important;
                    -webkit-overflow-scrolling: touch !important;
                    touch-action: none !important;
                    flex-shrink: 0 !important;
                }

                /* ── Top-align-row: column direction on mobile, fill remaining height ── */
                [class*="paint-editor_top-align-row"] {
                    display: flex !important;
                    flex-direction: column !important;
                    width: 100% !important;
                    max-width: 100% !important;
                    flex: 0 0 auto !important;
                    min-height: auto !important;
                    min-width: 0 !important;
                    height: auto !important;
                    overflow: visible !important;
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
                    overflow-y: hidden !important;
                    flex-shrink: 0 !important;
                    padding: 4px 0 !important;
                    gap: 2px !important;
                    -webkit-overflow-scrolling: touch !important;
                    touch-action: none !important;
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
                    flex: 0 0 auto !important;
                    min-height: auto !important;
                    margin: 0 !important;
                    padding-bottom: 0.75rem !important;
                    box-sizing: border-box !important;
                    display: flex !important;
                    flex-direction: column !important;
                    overflow: visible !important;
                    position: relative !important;
                }

                /* ── Canvas container: fill all remaining space ── */
                [class*="paint-editor_canvas-container"],
                div[class*="paint-editor_canvas-container"] {
                    width: 100% !important;
                    max-width: 100% !important;
                    min-width: 0 !important;
                    flex: 0 0 auto !important;
                    min-height: 20rem !important;
                    height: 68vh !important;
                    max-height: 30rem !important;
                    margin-bottom: 0.75rem !important;
                    position: relative !important;
                    overflow: visible !important;
                    box-sizing: border-box !important;
                }

                /* ── Paper canvas wrapper / layer ── */
                [class*="paper-canvas_paper-canvas"] {
                    width: 100% !important;
                    height: 100% !important;
                }
                
                /* ── Scrollable canvas inner wrappers ── */
                [class*="scrollable-canvas"] > div,
                [class*="paint-editor_canvas-container"] > div {
                    width: 100% !important;
                    height: 100% !important;
                    max-width: 100% !important;
                    min-width: 0 !important;
                    min-height: inherit !important;
                }

                /* ── Canvas controls: overlay at bottom of canvas ── */
                [class*="paint-editor_canvas-controls"] {
                    display: flex !important;
                    position: absolute !important;
                    bottom: 0 !important;
                    left: 0 !important;
                    right: 0 !important;
                    width: 100% !important;
                    height: auto !important;
                    min-height: 0 !important;
                    flex-shrink: 0 !important;
                    box-sizing: border-box !important;
                    justify-content: flex-end !important;
                    align-items: center !important;
                    pointer-events: none !important;
                    z-index: 500 !important;
                    padding: 8px !important;
                    background: transparent !important;
                    transform: none !important;
                }

                /* ── Bitmap/Vector toggle button ── */
                [class*="paint-editor_bitmap-button"] {
                    display: none !important;
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

                /* ── Toolbar rows: no individual scroll, expand to content ── */
                [class*="paint-editor_editor-container-top"] > [class*="paint-editor_row"] {
                    position: relative !important;
                    left: 0 !important;
                    right: 0 !important;
                    transform: none !important;
                    margin-left: 0 !important;
                    margin-right: 0 !important;
                    width: max-content !important;
                    min-width: max-content !important;
                    max-width: none !important;
                    overflow: visible !important;
                    flex-wrap: nowrap !important;
                    box-sizing: border-box !important;
                    align-self: flex-start !important;
                    align-items: center !important;
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

                /* ── Toolbar scrollbar styling (on the container) ── */
                [class*="paint-editor_editor-container-top"]::-webkit-scrollbar {
                    height: 3px !important;
                }
                [class*="paint-editor_editor-container-top"]::-webkit-scrollbar-thumb {
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

                /* ── Collapsible toolbar removed — tools always visible ── */
                .toolbar-collapse-wrapper,
                .toolbar-toggle-btn,
                .toolbar-toggle-chevron {
                    display: none !important;
                }
            `;

            // ─── Font Dropdown scrolling fix ───
            const fontDropdownStyles = `
                /* Enable scrolling for the font dropdown list container */
                .Popover .Popover-body {
                    max-height: 60vh !important;
                    height: auto !important;
                    min-height: 150px !important;
                    display: block !important;
                    overflow-y: auto !important;
                    overflow-x: hidden !important;
                    -webkit-overflow-scrolling: touch !important;
                    touch-action: pan-y !important;
                    overscroll-behavior: contain !important;
                    pointer-events: auto !important;
                    background: white !important;
                    border-radius: 4px !important;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.2) !important;
                    z-index: 3 !important;
                }

                .Popover [class*="input-group_mod-context-menu"],
                .Popover [class*="font-dropdown_mod-context-menu"],
                [class*="font-dropdown_font-dropdown"] [class*="input-group_mod-context-menu"] {
                    height: auto !important;
                    max-height: none !important;
                    overflow: visible !important;
                    display: block !important;
                    width: 100% !important;
                }
                
                /* Ensure the Popover itself doesn't block interactions */
                .Popover {
                    pointer-events: auto !important;
                    z-index: 5000 !important; /* Ensure it's above other elements */
                }

                /* Make font items touch-friendly */
                .Popover [class*="font-dropdown_mod-menu-item"],
                .Popover button[class*="font-dropdown"] {
                    min-height: 44px !important;
                    padding: 8px 12px !important;
                    touch-action: manipulation !important;
                    cursor: pointer !important;
                    display: flex !important;
                    align-items: center !important;
                }
            `;
            styleEl.textContent += fontDropdownStyles;

            // ─── Apply inline styles for elements that need them ───
            const topAlignRow = document.querySelector('[class*="paint-editor_top-align-row"]');
            if (topAlignRow) {
                topAlignRow.style.setProperty('display', 'flex', 'important');
                topAlignRow.style.setProperty('flex-direction', 'column', 'important');
                topAlignRow.style.setProperty('width', '100%', 'important');
                topAlignRow.style.setProperty('max-width', '100%', 'important');
                topAlignRow.style.setProperty('flex', '0 0 auto', 'important');
                topAlignRow.style.setProperty('min-height', 'auto', 'important');
                topAlignRow.style.setProperty('min-width', '0', 'important');
                topAlignRow.style.setProperty('height', 'auto', 'important');
                topAlignRow.style.setProperty('overflow', 'visible', 'important');
                topAlignRow.style.setProperty('padding-top', '4px', 'important');
                this.logDebug(`TopAlignRow inline fix applied`);
            }

            const editorContainerTop = document.querySelector('[class*="paint-editor_editor-container-top"]');
            if (editorContainerTop) {
                editorContainerTop.style.cssText += ';width:100%;max-width:100%;height:auto;overflow-x:auto;overflow-y:hidden;flex-shrink:0;-webkit-overflow-scrolling:touch;';
                // Use touch-action:none so WebView doesn't steal touch events
                editorContainerTop.style.setProperty('touch-action', 'none', 'important');
            }

            const editorContainer = document.querySelector('[class*="paint-editor_editor-container"]');
            if (editorContainer) {
                editorContainer.style.cssText += ';width:100%;max-width:100%;height:auto;max-height:calc(100vh - 9rem);overflow-y:auto;overflow-x:hidden;padding:4px;display:flex;flex-direction:column;min-height:100%;-webkit-overflow-scrolling:touch;overscroll-behavior-y:contain;';
            }

            // Force toolbar rows to expand within single scrollable container
            const maxRowW = `${availW - 10}px`;
            const ect2 = document.querySelector('[class*="paint-editor_editor-container-top"]');
            if (ect2) {
                // Make the container itself the single scroll area
                ect2.style.setProperty('overflow-x', 'auto', 'important');
                ect2.style.setProperty('overflow-y', 'hidden', 'important');
                ect2.style.setProperty('-webkit-overflow-scrolling', 'touch', 'important');
                ect2.style.setProperty('touch-action', 'none', 'important');
                ect2.style.setProperty('width', '100%', 'important');
                ect2.style.setProperty('max-width', maxRowW, 'important');
                ect2.style.setProperty('flex-shrink', '0', 'important');

                // Child rows: expand to content, no individual scroll
                Array.from(ect2.children).forEach((row) => {
                    if (row.className && row.className.includes && row.className.includes('row')) {
                        row.style.setProperty('overflow', 'visible', 'important');
                        row.style.setProperty('width', 'max-content', 'important');
                        row.style.setProperty('min-width', 'max-content', 'important');
                        row.style.setProperty('max-width', 'none', 'important');
                        row.style.setProperty('flex-wrap', 'nowrap', 'important');
                        row.style.setProperty('align-self', 'flex-start', 'important');
                        row.style.setProperty('align-items', 'center', 'important');
                        row.style.setProperty('touch-action', 'none', 'important');
                        row.style.setProperty('pointer-events', 'auto', 'important');
                    }
                });

                // ─── JS-driven touch scroll for Android WebView ───
                if (!ect2._touchScrollAttached) {
                    ect2._touchScrollAttached = true;
                    let startX = 0;
                    let scrollLeft = 0;
                    let isDragging = false;
                    let startY = 0;
                    let isHorizontal = null;

                    ect2.addEventListener('touchstart', (e) => {
                        const touch = e.touches[0];
                        startX = touch.clientX;
                        startY = touch.clientY;
                        scrollLeft = ect2.scrollLeft;
                        isDragging = true;
                        isHorizontal = null; // undetermined
                    }, { passive: true });

                    ect2.addEventListener('touchmove', (e) => {
                        if (!isDragging) return;
                        const touch = e.touches[0];
                        const dx = touch.clientX - startX;
                        const dy = touch.clientY - startY;

                        // Determine scroll direction on first significant movement
                        if (isHorizontal === null && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
                            isHorizontal = Math.abs(dx) > Math.abs(dy);
                        }

                        if (isHorizontal) {
                            e.preventDefault();
                            ect2.scrollLeft = scrollLeft - dx;
                        }
                    }, { passive: false });

                    ect2.addEventListener('touchend', () => {
                        isDragging = false;
                        isHorizontal = null;
                    }, { passive: true });

                    ect2.addEventListener('touchcancel', () => {
                        isDragging = false;
                        isHorizontal = null;
                    }, { passive: true });

                    // ─── Mouse wheel → horizontal scroll conversion ───
                    ect2.addEventListener('wheel', (e) => {
                        if (e.deltaY !== 0 && ect2.scrollWidth > ect2.clientWidth) {
                            e.preventDefault();
                            ect2.scrollLeft += e.deltaY;
                        }
                    }, { passive: false });

                    this.logDebug('Touch/wheel scroll handlers attached to toolbar container');
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

            // Reset mode selector scroll and attach JS-driven touch/wheel handlers
            const modeSelector = document.querySelector('[class*="paint-editor_mode-selector"]');
            if (modeSelector) {
                modeSelector.scrollLeft = 0;
                modeSelector.style.setProperty('touch-action', 'none', 'important');
                modeSelector.style.setProperty('overflow-x', 'auto', 'important');
                modeSelector.style.setProperty('overflow-y', 'hidden', 'important');

                // ─── JS-driven touch scroll for mode-selector (Android WebView fix) ───
                if (!modeSelector._touchScrollAttached) {
                    modeSelector._touchScrollAttached = true;
                    let msStartX = 0;
                    let msScrollLeft = 0;
                    let msDragging = false;
                    let msStartY = 0;
                    let msIsHorizontal = null;

                    modeSelector.addEventListener('touchstart', (e) => {
                        const touch = e.touches[0];
                        msStartX = touch.clientX;
                        msStartY = touch.clientY;
                        msScrollLeft = modeSelector.scrollLeft;
                        msDragging = true;
                        msIsHorizontal = null;
                    }, { passive: true });

                    modeSelector.addEventListener('touchmove', (e) => {
                        if (!msDragging) return;
                        const touch = e.touches[0];
                        const dx = touch.clientX - msStartX;
                        const dy = touch.clientY - msStartY;

                        if (msIsHorizontal === null && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
                            msIsHorizontal = Math.abs(dx) > Math.abs(dy);
                        }

                        if (msIsHorizontal) {
                            e.preventDefault();
                            modeSelector.scrollLeft = msScrollLeft - dx;
                        }
                    }, { passive: false });

                    modeSelector.addEventListener('touchend', () => {
                        msDragging = false;
                        msIsHorizontal = null;
                    }, { passive: true });

                    modeSelector.addEventListener('touchcancel', () => {
                        msDragging = false;
                        msIsHorizontal = null;
                    }, { passive: true });

                    modeSelector.addEventListener('wheel', (e) => {
                        if (e.deltaY !== 0 && modeSelector.scrollWidth > modeSelector.clientWidth) {
                            e.preventDefault();
                            modeSelector.scrollLeft += e.deltaY;
                        }
                    }, { passive: false });

                    this.logDebug('Touch/wheel scroll handlers attached to mode-selector');
                }
            }

            const controlsContainer = document.querySelector('[class*="paint-editor_controls-container"]');
            if (controlsContainer) {
                controlsContainer.style.setProperty('width', '100%', 'important');
                controlsContainer.style.setProperty('max-width', '100%', 'important');
                controlsContainer.style.setProperty('min-width', '0', 'important');
                controlsContainer.style.setProperty('margin', '0', 'important');
                controlsContainer.style.setProperty('padding-bottom', '0.75rem', 'important');
                controlsContainer.style.setProperty('display', 'flex', 'important');
                controlsContainer.style.setProperty('flex-direction', 'column', 'important');
                controlsContainer.style.setProperty('overflow', 'visible', 'important');
                controlsContainer.style.setProperty('flex', '0 0 auto', 'important');
                controlsContainer.style.setProperty('min-height', 'auto', 'important');
                controlsContainer.style.setProperty('position', 'relative', 'important');
            }

            const canvasContainer = document.querySelector('[class*="paint-editor_canvas-container"]');
            if (canvasContainer) {
                canvasContainer.style.setProperty('width', '100%', 'important');
                canvasContainer.style.setProperty('max-width', '100%', 'important');
                canvasContainer.style.setProperty('min-width', '0', 'important');
                canvasContainer.style.setProperty('flex', '0 0 auto', 'important');
                canvasContainer.style.setProperty('min-height', '20rem', 'important');
                canvasContainer.style.setProperty('height', '68vh', 'important');
                canvasContainer.style.setProperty('max-height', '30rem', 'important');
                canvasContainer.style.setProperty('margin-bottom', '0.75rem', 'important');
                canvasContainer.style.setProperty('overflow', 'visible', 'important');
                canvasContainer.style.setProperty('position', 'relative', 'important');
                canvasContainer.style.setProperty('box-sizing', 'border-box', 'important');
            }

            // Canvas controls overlay at bottom of canvas
            const canvasControls = document.querySelector('[class*="paint-editor_canvas-controls"]');
            if (canvasControls) {
                canvasControls.style.setProperty('display', 'flex', 'important');
                canvasControls.style.setProperty('position', 'absolute', 'important');
                canvasControls.style.setProperty('bottom', '0', 'important');
                canvasControls.style.setProperty('left', '0', 'important');
                canvasControls.style.setProperty('right', '0', 'important');
                canvasControls.style.setProperty('width', '100%', 'important');
                canvasControls.style.setProperty('height', 'auto', 'important');
                canvasControls.style.setProperty('min-height', '0', 'important');
                canvasControls.style.setProperty('padding', '8px', 'important');
                canvasControls.style.setProperty('transform', 'none', 'important');
                canvasControls.style.setProperty('box-sizing', 'border-box', 'important');
                canvasControls.style.setProperty('justify-content', 'flex-end', 'important');
                canvasControls.style.setProperty('align-items', 'center', 'important');
                canvasControls.style.setProperty('pointer-events', 'none', 'important');
                canvasControls.style.setProperty('z-index', '500', 'important');
                canvasControls.style.setProperty('background', 'transparent', 'important');

                // Hide bitmap/convert button inside canvas controls
                const bitmapBtn = canvasControls.querySelector('[class*="paint-editor_bitmap-button"]');
                if (bitmapBtn) {
                    bitmapBtn.style.setProperty('display', 'none', 'important');
                }
            }

            // Zoom controls: sticky overlay on canvas
            const zoomControls = document.querySelector('[class*="paint-editor_zoom-controls"]');
            if (zoomControls) {
                zoomControls.style.setProperty('position', 'absolute', 'important');
                zoomControls.style.setProperty('bottom', '12px', 'important');
                zoomControls.style.setProperty('left', '12px', 'important');
                zoomControls.style.setProperty('display', 'flex', 'important');
                zoomControls.style.setProperty('flex-direction', 'row', 'important');
                zoomControls.style.setProperty('align-items', 'center', 'important');
                zoomControls.style.setProperty('gap', '4px', 'important');
                zoomControls.style.setProperty('background', 'rgba(255,255,255,0.95)', 'important');
                zoomControls.style.setProperty('border-radius', '10px', 'important');
                zoomControls.style.setProperty('padding', '4px 8px', 'important');
                zoomControls.style.setProperty('box-shadow', '0 2px 10px rgba(0,0,0,0.18)', 'important');
                zoomControls.style.setProperty('z-index', '501', 'important');
                zoomControls.style.setProperty('pointer-events', 'auto', 'important');
            }

            // ─── Fix touch/click offset: trigger Paper.js recalibration ───
            // Accounts for devicePixelRatio to correctly map CSS pixels to canvas pixels
            // This fixes the mismatch between CSS canvas size and Paper's internal view size
            const triggerRecalibrate = () => {
                // Find the paper canvas element
                const paperCanvas = document.querySelector('[class*="paper-canvas_paper-canvas"] canvas, canvas[resize="true"]');
                if (paperCanvas) {
                    // Force the canvas dimensions to match its CSS layout size
                    // accounting for devicePixelRatio
                    const rect = paperCanvas.getBoundingClientRect();
                    const dpr = window.devicePixelRatio || 1;
                    const w = Math.round(rect.width * dpr);
                    const h = Math.round(rect.height * dpr);
                    if (w > 0 && h > 0 && (paperCanvas.width !== w || paperCanvas.height !== h)) {
                        paperCanvas.width = w;
                        paperCanvas.height = h;
                        this.logDebug(`Recalibrated canvas: ${w}x${h} (dpr=${dpr}, css=${Math.round(rect.width)}x${Math.round(rect.height)})`);
                    }
                }
                // Also trigger resize event for Paper.js onViewResize handler
                window.dispatchEvent(new Event('resize'));
            };
            setTimeout(triggerRecalibrate, 200);
            setTimeout(triggerRecalibrate, 600);
            setTimeout(triggerRecalibrate, 1200);

            // ─── Set up ResizeObserver for continuous canvas recalibration ───
            if (!this.canvasResizeObserver) {
                const canvasEl = document.querySelector('[class*="paint-editor_canvas-container"]');
                if (canvasEl && typeof ResizeObserver !== 'undefined') {
                    this.canvasResizeObserver = new ResizeObserver(() => {
                        // Debounce recalibration on resize
                        clearTimeout(this._recalTimer);
                        this._recalTimer = setTimeout(triggerRecalibrate, 100);
                    });
                    this.canvasResizeObserver.observe(canvasEl);
                    this.logDebug('ResizeObserver attached to canvas container');
                }
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
