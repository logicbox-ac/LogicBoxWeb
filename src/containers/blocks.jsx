import bindAll from 'lodash.bindall';
import debounce from 'lodash.debounce';
import defaultsDeep from 'lodash.defaultsdeep';
import makeToolboxXML from '../lib/make-toolbox-xml';
import PropTypes from 'prop-types';
import React from 'react';
import VMScratchBlocks from '../lib/blocks';
import VM from 'scratch-vm';

import log from '../lib/log.js';
import Prompt from './prompt.jsx';
import BlocksComponent from '../components/blocks/blocks.jsx';
import ExtensionLibrary from './extension-library.jsx';
import extensionData from '../lib/libraries/extensions/index.jsx';
import CustomProcedures from './custom-procedures.jsx';
import errorBoundaryHOC from '../lib/error-boundary-hoc.jsx';
import { BLOCKS_DEFAULT_SCALE, STAGE_DISPLAY_SIZES } from '../lib/layout-constants';
import DropAreaHOC from '../lib/drop-area-hoc.jsx';
import DragConstants from '../lib/drag-constants';
import defineDynamicBlock from '../lib/define-dynamic-block';
import { DEFAULT_THEME, getColorsForTheme, themeMap } from '../lib/themes';
import { injectExtensionBlockTheme, injectExtensionCategoryTheme } from '../lib/themes/blockHelpers';

import { connect } from 'react-redux';
import { updateToolbox } from '../reducers/toolbox';
import { activateColorPicker } from '../reducers/color-picker';
import { closeExtensionLibrary, openSoundRecorder, openConnectionModal } from '../reducers/modals';
import { activateCustomProcedures, deactivateCustomProcedures } from '../reducers/custom-procedures';
import { setConnectionModalExtensionId } from '../reducers/connection-modal';
import { updateMetrics } from '../reducers/workspace-metrics';
import { isTimeTravel2020 } from '../reducers/time-travel';

import {
    activateTab,
    SOUNDS_TAB_INDEX
} from '../reducers/editor-tab';

const addFunctionListener = (object, property, callback) => {
    const oldFn = object[property];
    object[property] = function (...args) {
        const result = oldFn.apply(this, args);
        callback.apply(this, result);
        return result;
    };
};

const DroppableBlocks = DropAreaHOC([
    DragConstants.BACKPACK_CODE
])(BlocksComponent);

class Blocks extends React.Component {
    constructor(props) {
        super(props);
        this.ScratchBlocks = VMScratchBlocks(props.vm, false);
        bindAll(this, [
            'attachVM',
            'detachVM',
            'attachFlyoutListeners',
            'detachFlyoutListeners',
            'attachInteractionDebugListeners',
            'detachInteractionDebugListeners',
            'onWorkspaceDebugEvent',
            'handleViewportInputModeChange',
            'isMobileTouchViewport',
            'getToolboxXML',
            'refreshFlyoutLayout',
            'selectToolboxCategory',
            'handleCategorySelected',
            'handleConnectionModalStart',
            'handleDrop',
            'handleStatusButtonUpdate',
            'handleOpenSoundRecorder',
            'handlePromptStart',
            'handlePromptCallback',
            'handlePromptClose',
            'handleCustomProceduresClose',
            'handleCloseFlyout',
            'onScriptGlowOn',
            'onScriptGlowOff',
            'onBlockGlowOn',
            'onBlockGlowOff',
            'handleMonitorsUpdate',
            'handleExtensionAdded',
            'handleBlocksInfoUpdate',
            'onTargetsUpdate',
            'onVisualReport',
            'onWorkspaceUpdate',
            'onWorkspaceMetricsChange',
            'setBlocks',
            'setLocale',
            'handleMobileBlockLongPress',
            'handleMobileDelete',
            'handleCancelMobileDelete'
        ]);
        this.ScratchBlocks.prompt = this.handlePromptStart;
        this.ScratchBlocks.statusButtonCallback = this.handleConnectionModalStart;
        this.ScratchBlocks.recordSoundCallback = this.handleOpenSoundRecorder;

        this.state = {
            prompt: null,
            isToolboxCollapsed: false,
            isFlyoutVisible: false,
            mobileDeletePosition: null,
            mobileDeleteBlockId: null
        };
        this.onTargetsUpdate = debounce(this.onTargetsUpdate, 100);
        this.toolboxUpdateQueue = [];
        this.longPressTimer = null;
        this.longPressBlockId = null;
        this.pendingCategorySelection = null;
        this._connectedFlyoutSvg = null;
        this._detachFlyoutListeners = null;
        this._debugMoveCounter = 0;
        this._interactionDebugDetachers = [];
        this._workspaceDebugChangeListener = null;
        bindAll(this, ['handleToggleToolbox']);
    }
    componentDidMount() {
        // MONKEY PATCH: Prevent IndexSizeError in Scratch Blocks/Paint
        // Mobile browsers sometimes report 0 width/height for canvases during initial layout,
        // causing getImageData to throw and break block creation.
        if (!window.CanvasRenderingContext2D.prototype._originalGetImageData) {
            const originalGetImageData = window.CanvasRenderingContext2D.prototype.getImageData;
            window.CanvasRenderingContext2D.prototype._originalGetImageData = originalGetImageData;

            window.CanvasRenderingContext2D.prototype.getImageData = function (sx, sy, sw, sh) {
                if (sw <= 0 || sh <= 0) {
                    // Return a 1x1 transparent pixel to satisfy the return type contract
                    return new ImageData(1, 1);
                }
                return originalGetImageData.apply(this, arguments);
            };
        }

        this.ScratchBlocks = VMScratchBlocks(this.props.vm, this.props.useCatBlocks);
        this.ScratchBlocks.prompt = this.handlePromptStart;
        this.ScratchBlocks.statusButtonCallback = this.handleConnectionModalStart;
        this.ScratchBlocks.recordSoundCallback = this.handleOpenSoundRecorder;

        this.ScratchBlocks.FieldColourSlider.activateEyedropper_ = this.props.onActivateColorPicker;
        this.ScratchBlocks.Procedures.externalProcedureDefCallback = this.props.onActivateCustomProcedures;
        this.ScratchBlocks.ScratchMsgs.setLocale(this.props.locale);

        const workspaceConfig = defaultsDeep({},
            Blocks.defaultOptions,
            this.props.options,
            {
                rtl: this.props.isRtl,
                toolbox: this.props.toolboxXML,
                colours: getColorsForTheme(this.props.theme),
                closeButton: true,
                closeButtonCallback: this.props.onCloseBlocks
            }
        );
        this.workspace = this.ScratchBlocks.inject(this.blocks, workspaceConfig);

        // Add close buttons to individual blocks
        if (workspaceConfig.closeButton) {
            this.setupBlockCloseButtons();
        }

        // Register buttons under new callback keys for creating variables,
        // lists, and procedures from extensions.

        const toolboxWorkspace = this.workspace.getFlyout().getWorkspace();

        const varListButtonCallback = type =>
            (() => this.ScratchBlocks.Variables.createVariable(this.workspace, null, type));
        const procButtonCallback = () => {
            this.ScratchBlocks.Procedures.createProcedureDefCallback_(this.workspace);
        };

        toolboxWorkspace.registerButtonCallback('MAKE_A_VARIABLE', varListButtonCallback(''));
        toolboxWorkspace.registerButtonCallback('MAKE_A_LIST', varListButtonCallback('list'));
        toolboxWorkspace.registerButtonCallback('MAKE_A_PROCEDURE', procButtonCallback);

        // Store the xml of the toolbox that is actually rendered.
        // This is used in componentDidUpdate instead of prevProps, because
        // the xml can change while e.g. on the costumes tab.
        this._renderedToolboxXML = this.props.toolboxXML;

        // we actually never want the workspace to enable "refresh toolbox" - this basically re-renders the
        // entire toolbox every time we reset the workspace.  We call updateToolbox as a part of
        // componentDidUpdate so the toolbox will still correctly be updated
        this.setToolboxRefreshEnabled = this.workspace.setToolboxRefreshEnabled.bind(this.workspace);
        this.workspace.setToolboxRefreshEnabled = () => {
            this.setToolboxRefreshEnabled(false);
        };

        // @todo change this when blockly supports UI events
        addFunctionListener(this.workspace, 'translate', this.onWorkspaceMetricsChange);
        addFunctionListener(this.workspace, 'zoom', this.onWorkspaceMetricsChange);

        // On mobile, override the toolbox width calculation to allow full-width workspace
        if (window.innerWidth <= 767) {
            const toolbox = this.workspace.getToolbox();
            if (toolbox) {
                const originalGetWidth = toolbox.getWidth.bind(toolbox);
                toolbox.getWidth = () => {
                    const flyout = this.workspace.getFlyout();
                    const isVisible = flyout && flyout.isVisible();
                    return isVisible ? originalGetWidth() : 0;
                };
            }

            // Force initial resize using robust checker
            this.ensureWorkspaceSize();
        }

        this.attachVM();
        window.addEventListener('resize', this.handleViewportInputModeChange);
        this.handleViewportInputModeChange();
        this.attachInteractionDebugListeners();

        // Only update blocks/vm locale when visible to avoid sizing issues
        // If locale changes while not visible it will get handled in didUpdate
        if (this.props.isVisible) {
            this.setLocale();
        }
    }
    shouldComponentUpdate(nextProps, nextState) {
        const shouldUpdate = (
            this.state.prompt !== nextState.prompt ||
            this.state.isToolboxCollapsed !== nextState.isToolboxCollapsed ||
            this.state.isFlyoutVisible !== nextState.isFlyoutVisible ||
            this.state.mobileDeletePosition !== nextState.mobileDeletePosition ||
            this.state.mobileDeleteBlockId !== nextState.mobileDeleteBlockId ||
            this.props.isVisible !== nextProps.isVisible ||
            this._renderedToolboxXML !== nextProps.toolboxXML ||
            this.props.extensionLibraryVisible !== nextProps.extensionLibraryVisible ||
            this.props.customProceduresVisible !== nextProps.customProceduresVisible ||
            this.props.locale !== nextProps.locale ||
            this.props.anyModalVisible !== nextProps.anyModalVisible ||
            this.props.stageSize !== nextProps.stageSize
        );
        return shouldUpdate;
    }
    componentDidUpdate(prevProps, prevState) {
        // resize workspace if toolbox collapsed state changed
        if (this.state.isToolboxCollapsed !== prevState.isToolboxCollapsed) {
            this.workspace.resize();
        }

        // If any modals are open, call hideChaff to close z-indexed field editors
        if (this.props.anyModalVisible && !prevProps.anyModalVisible) {
            this.ScratchBlocks.hideChaff();
        }

        // Only rerender the toolbox when the blocks are visible and the xml is
        // different from the previously rendered toolbox xml.
        // Do not check against prevProps.toolboxXML because that may not have been rendered.
        if (this.props.isVisible && this.props.toolboxXML !== this._renderedToolboxXML) {
            this.requestToolboxUpdate();
        }

        if (this.props.isVisible) {
            this.handleViewportInputModeChange();
            this.attachInteractionDebugListeners();
        }

        if (this.props.isVisible === prevProps.isVisible) {
            if (this.props.stageSize !== prevProps.stageSize) {
                // force workspace to redraw for the new stage size
                window.dispatchEvent(new Event('resize'));
            }
            return;
        }
        // @todo hack to resize blockly manually in case resize happened while hidden
        // @todo hack to reload the workspace due to gui bug #413
        if (this.props.isVisible) { // Scripts tab
            this.workspace.setVisible(true);
            if (prevProps.locale !== this.props.locale || this.props.locale !== this.props.vm.getLocale()) {
                // call setLocale if the locale has changed, or changed while the blocks were hidden.
                // vm.getLocale() will be out of sync if locale was changed while not visible
                this.setLocale();
            } else {
                this.props.vm.refreshWorkspace();
                this.requestToolboxUpdate();
            }

            window.dispatchEvent(new Event('resize'));
        } else {
            this.workspace.setVisible(false);
        }
    }
    componentWillUnmount() {
        window.removeEventListener('resize', this.handleViewportInputModeChange);
        this.detachInteractionDebugListeners();
        this.detachFlyoutListeners();
        this.detachVM();
        this.workspace.dispose();
        clearTimeout(this.toolboxUpdateTimeout);
        if (this._closeButtonInterval) {
            clearInterval(this._closeButtonInterval);
        }

        // Clear the flyout blocks so that they can be recreated on mount.
        this.props.vm.clearFlyoutBlocks();
    }

    setupBlockCloseButtons() {
        if (!this.workspace) return;

        this.workspace.addChangeListener((event) => {
            if (event.type === this.ScratchBlocks.Events.BLOCK_CREATE) {
                // Try multiple delays to ensure svgGroup_ is ready
                setTimeout(() => this._ensureCloseButtonForBlock(event.blockId), 100);
                setTimeout(() => this._ensureCloseButtonForBlock(event.blockId), 300);
                // Also scan all blocks in case the created block triggered changes
                setTimeout(() => this.addCloseButtonsToAllBlocks(), 500);
            }
            // Reposition close buttons on move/change
            if (event.type === this.ScratchBlocks.Events.BLOCK_CHANGE ||
                event.type === this.ScratchBlocks.Events.BLOCK_MOVE) {
                setTimeout(() => {
                    this.addCloseButtonsToAllBlocks();
                }, 50);
            }
        });

        // Initial scan
        this.addCloseButtonsToAllBlocks();

        // Periodic scan to ensure all blocks always have close buttons
        this._closeButtonInterval = setInterval(() => {
            if (this.workspace) {
                this.addCloseButtonsToAllBlocks();
            }
        }, 2000);
    }

    _shouldShowCloseButton(block) {
        // Show close buttons on non-shadow stack blocks and on top-level reporters.
        // Nested reporter/value blocks stay button-free so they don't clutter inputs.
        if (!block) return false;
        if (typeof block.isShadow === 'function' && block.isShadow()) return false;
        if (typeof block.isInsertionMarker === 'function' && block.isInsertionMarker()) return false;
        if (block.outputConnection) {
            return !block.getParent();
        }
        return true;
    }

    _ensureCloseButtonForBlock(blockId) {
        if (!this.workspace) return;
        const block = this.workspace.getBlockById(blockId);
        if (block && block.svgGroup_ && !block.closeButton_ && this._shouldShowCloseButton(block)) {
            this.addCloseButtonToBlock(block);
        }
    }

    addCloseButtonsToAllBlocks() {
        if (!this.workspace) return;

        // Add close buttons to all stack blocks and top-level reporters.
        const allBlocks = this.workspace.getAllBlocks();
        allBlocks.forEach(block => {
            if (!this._shouldShowCloseButton(block)) {
                // Remove any close button that was wrongly added to an input block
                if (block.closeButton_) {
                    block.closeButton_.remove();
                    block.closeButton_ = null;
                }
                return;
            }
            if (block.closeButton_) {
                // Reposition existing close button
                this._positionCloseButton(block);
            } else if (block.svgGroup_ && !block.closeButton_) {
                this.addCloseButtonToBlock(block);
            }
        });
    }

    _getBlockOwnWidth(block) {
        // Get the individual block's width (not including children stacked below)
        // block.svgPath_ is the SVG path element for just this block's shape
        try {
            if (block.svgPath_) {
                return block.svgPath_.getBBox().width;
            }
        } catch (e) {
            // svgPath_ may not be available
        }
        // Fallback: use block.width which is set during rendering
        // (but note: getHeightWidth() includes children, so avoid that)
        if (block.width && block.width > 0) {
            return block.width;
        }
        // Last resort: use svgGroup_ bbox (may include children)
        try {
            return block.svgGroup_.getBBox().width;
        } catch (e) {
            return 100; // safe default
        }
    }

    _positionCloseButton(block) {
        if (!block.closeButton_ || !block.svgGroup_) return;
        try {
            const blockWidth = this._getBlockOwnWidth(block);
            const x = blockWidth - 17;
            const y = -6;
            block.closeButton_.setAttribute('transform', `translate(${x}, ${y})`);
        } catch (e) {
            // Block may have been disposed
        }
    }

    addCloseButtonToBlock(block) {
        if (!block.svgGroup_ || block.closeButton_ || !this._shouldShowCloseButton(block)) {
            return;
        }

        // Check if a close button already exists as a direct child of this block's svgGroup
        const children = block.svgGroup_.children;
        for (let i = 0; i < children.length; i++) {
            if (children[i].classList && children[i].classList.contains('blocklyBlockCloseButton')) {
                block.closeButton_ = children[i];
                return;
            }
        }

        try {
            const closeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            closeGroup.setAttribute('class', 'blocklyBlockCloseButton');
            closeGroup.setAttribute('transform', 'translate(0, 0)');
            closeGroup.style.pointerEvents = 'all';
            closeGroup.style.cursor = 'pointer';

            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', '12');
            circle.setAttribute('cy', '12');
            circle.setAttribute('r', '11');
            circle.setAttribute('fill', '#FF6680');
            circle.setAttribute('stroke', 'white');
            circle.setAttribute('stroke-width', '1.5');
            circle.style.pointerEvents = 'all';

            const xPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            xPath.setAttribute('d', 'M 7 7 L 17 17 M 17 7 L 7 17');
            xPath.setAttribute('stroke', 'white');
            xPath.setAttribute('stroke-width', '2.5');
            xPath.setAttribute('stroke-linecap', 'round');

            closeGroup.appendChild(circle);
            closeGroup.appendChild(xPath);

            block.svgGroup_.appendChild(closeGroup);
            block.closeButton_ = closeGroup;

            // Position initially and after a delay
            setTimeout(() => this._positionCloseButton(block), 10);
            setTimeout(() => this._positionCloseButton(block), 100);

            const self = this;
            const deleteBlock = (e) => {
                e.stopPropagation();
                e.preventDefault();
                e.stopImmediatePropagation();

                try {
                    if (block && block.workspace) {
                        // dispose(true) heals the stack:
                        // - removes this block
                        // - reconnects the block above to the block below
                        block.dispose(true);
                    }
                } catch (error) {
                    // Block may have already been disposed
                }

                // Rescan remaining blocks after deletion
                setTimeout(() => self.addCloseButtonsToAllBlocks(), 100);

                return false;
            };

            closeGroup.addEventListener('mousedown', deleteBlock, true);
            closeGroup.addEventListener('click', deleteBlock, true);
            closeGroup.addEventListener('pointerdown', deleteBlock, true);

            closeGroup.setAttribute('opacity', '1');

        } catch (error) {
            // Failed to add close button
        }
    }

    handleToggleToolbox() {
        // No-op for now as we removed the toggle logic
    }
    handleCloseFlyout() {
        const flyout = this.workspace.getFlyout();
        if (flyout && flyout.isVisible()) {
            flyout.hide();
            // Clear toolbox selection so same category can be clicked again
            const toolbox = this.workspace.getToolbox();
            if (toolbox) {
                // Use selectCategoryById with null to deselect, or try clearSelection
                try {
                    if (typeof toolbox.clearSelection === 'function') {
                        toolbox.clearSelection();
                    } else if (typeof toolbox.selectCategoryById === 'function') {
                        toolbox.selectCategoryById(null);
                    }
                } catch (e) {
                    // Ignore errors from clearing selection
                }
            }
        }
    }
    requestToolboxUpdate() {
        clearTimeout(this.toolboxUpdateTimeout);
        this.toolboxUpdateTimeout = setTimeout(() => {
            this.updateToolbox();
        }, 0);
    }
    setLocale() {
        this.ScratchBlocks.ScratchMsgs.setLocale(this.props.locale);
        this.props.vm.setLocale(this.props.locale, this.props.messages)
            .then(() => {
                this.workspace.getFlyout().setRecyclingEnabled(false);
                this.props.vm.refreshWorkspace();
                this.requestToolboxUpdate();
                this.withToolboxUpdates(() => {
                    this.workspace.getFlyout().setRecyclingEnabled(true);
                });
            });
    }

    updateToolbox() {
        this.toolboxUpdateTimeout = false;

        const categoryId = this.workspace.toolbox_.getSelectedCategoryId();
        const offset = this.workspace.toolbox_.getCategoryScrollOffset();
        this.workspace.updateToolbox(this.props.toolboxXML);
        this._renderedToolboxXML = this.props.toolboxXML;

        // In order to catch any changes that mutate the toolbox during "normal runtime"
        // (variable changes/etc), re-enable toolbox refresh.
        // Using the setter function will rerender the entire toolbox which we just rendered.
        this.workspace.toolboxRefreshEnabled_ = true;

        if (categoryId) {
            const currentCategoryPos = this.workspace.toolbox_.getCategoryPositionById(categoryId);
            const currentCategoryLen = this.workspace.toolbox_.getCategoryLengthById(categoryId);
            if (typeof currentCategoryPos === 'number' && typeof currentCategoryLen === 'number') {
                if (offset < currentCategoryLen) {
                    this.workspace.toolbox_.setFlyoutScrollPos(currentCategoryPos + offset);
                } else {
                    this.workspace.toolbox_.setFlyoutScrollPos(currentCategoryPos);
                }
            }
        }

        if (this.pendingCategorySelection && this.selectToolboxCategory(this.pendingCategorySelection)) {
            this.pendingCategorySelection = null;
        }

        // Toolbox refreshes can recreate the flyout DOM on mobile, so rebind touch handlers
        // after the new category content is in place.
        setTimeout(() => {
            this.refreshFlyoutLayout();
            this.attachFlyoutListeners();
            this.attachInteractionDebugListeners();
        }, 0);

        const queue = this.toolboxUpdateQueue;
        this.toolboxUpdateQueue = [];
        queue.forEach(fn => fn());
    }

    withToolboxUpdates(fn) {
        // if there is a queued toolbox update, we need to wait
        if (this.toolboxUpdateTimeout) {
            this.toolboxUpdateQueue.push(fn);
        } else {
            fn();
        }
    }

    refreshFlyoutLayout(options = {}) {
        if (!this.workspace || !this.workspace.getFlyout) return;

        const {scrollToStart = false} = options;
        const relayout = () => {
            if (!this.workspace || !this.workspace.getFlyout) return;
            const flyout = this.workspace.getFlyout();
            if (!flyout) return;

            try {
                if (typeof flyout.reflow === 'function') {
                    flyout.reflow();
                }
                if (flyout.workspace_ && typeof flyout.workspace_.resizeContents === 'function') {
                    flyout.workspace_.resizeContents();
                }
                if (flyout.scrollbar_ && typeof flyout.scrollbar_.resize === 'function') {
                    flyout.scrollbar_.resize();
                }
                if (typeof flyout.position === 'function') {
                    flyout.position();
                }
                if (scrollToStart && typeof flyout.scrollToStart === 'function') {
                    flyout.scrollToStart();
                }
            } catch (error) {
                log.warn('[Blocks] Failed to refresh flyout layout', error);
            }
        };

        setTimeout(relayout, 0);
        setTimeout(relayout, 60);
    }

    selectToolboxCategory(categoryId) {
        if (!categoryId || !this.workspace || !this.workspace.toolbox_) return false;

        const categoryPosition = this.workspace.toolbox_.getCategoryPositionById(categoryId);
        if (typeof categoryPosition !== 'number' || Number.isNaN(categoryPosition)) {
            return false;
        }

        this.workspace.toolbox_.setSelectedCategoryById(categoryId);
        this.refreshFlyoutLayout({scrollToStart: true});
        this.attachFlyoutListeners();
        this.attachInteractionDebugListeners();
        return true;
    }

    ensureWorkspaceSize(attempts = 0) {
        if (!this.workspace || !this.blocks) return;

        const width = this.blocks.clientWidth;
        const height = this.blocks.clientHeight;

        if (width > 0 && height > 0) {
            this.workspace.resize();
            // Just to be safe, resize again after a delay to handle transition ends
            if (attempts === 0) setTimeout(() => this.ensureWorkspaceSize(1), 300);
        } else if (attempts < 10) {
            // Retry if 0 size
            setTimeout(() => this.ensureWorkspaceSize(attempts + 1), 150);
        }
    }

    isBlockInteractionDebugEnabled() {
        if (process.env.NODE_ENV !== 'production') {
            return true;
        }
        try {
            return Boolean(
                (window.location && window.location.search && window.location.search.includes('blocklyDebug=1')) ||
                (window.localStorage && window.localStorage.getItem('logicbox:blockly-debug') === '1')
            );
        } catch (error) {
            return false;
        }
    }

    getBlockIdFromTarget(target, stopAt) {
        let current = target;
        while (current && current !== stopAt) {
            if (current.getAttribute) {
                const blockId = current.getAttribute('data-id');
                if (blockId) return blockId;
            }
            current = current.parentNode;
        }
        return null;
    }

    formatTargetForDebug(target) {
        if (!target || !target.tagName) return 'unknown';
        const className = (target.className && target.className.baseVal) ||
            target.className ||
            '';
        return `${target.tagName.toLowerCase()}.${String(className).replace(/\s+/g, '.')}`;
    }

    onWorkspaceDebugEvent(source, eventType, event, rootElement) {
        if (!this.isBlockInteractionDebugEnabled()) return;

        const isMoveEvent = eventType === 'pointermove' || eventType === 'mousemove';
        if (isMoveEvent) {
            const isDraggingPointer = Boolean(event.buttons);
            if (!isDraggingPointer) return;
            this._debugMoveCounter = (this._debugMoveCounter + 1) % 6;
            if (this._debugMoveCounter !== 0) return;
        }

        const blockId = this.getBlockIdFromTarget(event.target, rootElement);
        const flyout = this.workspace && this.workspace.getFlyout ? this.workspace.getFlyout() : null;
        const flyoutVisible = flyout && flyout.isVisible ? flyout.isVisible() : false;
        const dragging = this.workspace && this.workspace.isDragging ? this.workspace.isDragging() : false;

        void source;
        void eventType;
        void blockId;
        void flyoutVisible;
        void dragging;
    }

    detachInteractionDebugListeners() {
        this._interactionDebugDetachers.forEach(detach => detach());
        this._interactionDebugDetachers = [];

        if (this.workspace && this._workspaceDebugChangeListener) {
            this.workspace.removeChangeListener(this._workspaceDebugChangeListener);
        }
        this._workspaceDebugChangeListener = null;
    }

    attachInteractionDebugListeners() {
        if (!this.workspace || !this.isBlockInteractionDebugEnabled()) {
            this.detachInteractionDebugListeners();
            return;
        }

        this.detachInteractionDebugListeners();

        const addDomDebugListener = (element, eventType, source, options = true) => {
            if (!element) return;
            const handler = event => this.onWorkspaceDebugEvent(source, eventType, event, element);
            element.addEventListener(eventType, handler, options);
            this._interactionDebugDetachers.push(() => {
                element.removeEventListener(eventType, handler, options);
            });
        };

        const workspaceSvg = this.workspace.getParentSvg && this.workspace.getParentSvg();
        const flyout = this.workspace.getFlyout && this.workspace.getFlyout();
        const flyoutSvgGroup = flyout && flyout.svgGroup_;

        ['mousedown', 'mousemove', 'mouseup', 'click', 'pointerdown', 'pointermove', 'pointerup'].forEach(eventType => {
            addDomDebugListener(workspaceSvg, eventType, 'workspaceSvg');
            addDomDebugListener(flyoutSvgGroup, eventType, 'flyoutSvg');
        });

        this._workspaceDebugChangeListener = event => {
            if (!this.isBlockInteractionDebugEnabled()) return;
            if (event.type !== this.ScratchBlocks.Events.BLOCK_CREATE &&
                event.type !== this.ScratchBlocks.Events.BLOCK_DRAG &&
                event.type !== this.ScratchBlocks.Events.CLICK) {
                return;
            }

            void event;
        };

        this.workspace.addChangeListener(this._workspaceDebugChangeListener);
    }

    isMobileTouchViewport() {
        if (window.innerWidth > 767) return false;
        if (window.matchMedia) {
            const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
            const noHover = window.matchMedia('(hover: none)').matches;
            if (coarsePointer || noHover) return true;
        }
        return ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    }

    isTouchPointerEvent(event) {
        if (!event || !event.isPrimary) return false;
        if (!event.pointerType) return true;
        return event.pointerType === 'touch' || event.pointerType === 'pen';
    }

    handleViewportInputModeChange() {
        if (!this.workspace) return;
        if (!this.props.isVisible) {
            this.detachFlyoutListeners();
            return;
        }
        this.attachFlyoutListeners();
    }

    detachFlyoutListeners() {
        if (this._detachFlyoutListeners) {
            this._detachFlyoutListeners();
            this._detachFlyoutListeners = null;
            if (process.env.DEBUG) {
                log.info('[Blocks] Detached custom flyout touch handlers');
            }
        }
        this._connectedFlyoutSvg = null;
    }

    attachFlyoutListeners() {
        if (!this.isMobileTouchViewport()) {
            this.detachFlyoutListeners();
            return;
        }

        const flyout = this.workspace.getFlyout();
        if (!flyout) {
            this.detachFlyoutListeners();
            return;
        }

        const flyoutSvgGroup = flyout.svgGroup_;
        if (!flyoutSvgGroup) {
            this.detachFlyoutListeners();
            return;
        }

        // Avoid duplicate listeners on the same element
        if (this._connectedFlyoutSvg === flyoutSvgGroup && this._detachFlyoutListeners) {
            return;
        }

        this.detachFlyoutListeners();
        this._connectedFlyoutSvg = flyoutSvgGroup;
        const flyoutWorkspace = flyout.getWorkspace();
        const TAP_THRESHOLD = 15;
        const TAP_DURATION = 700;
        let touchStartInfo = null;

        const clearTouchState = () => {
            touchStartInfo = null;
        };

        const getFlyoutCheckboxFromTarget = target => {
            if (!target || !flyout.checkboxes_) return null;

            const checkboxIds = Object.keys(flyout.checkboxes_);
            for (let i = 0; i < checkboxIds.length; i++) {
                const checkboxObj = flyout.checkboxes_[checkboxIds[i]];
                if (!checkboxObj || !checkboxObj.svgRoot) continue;
                if (checkboxObj.svgRoot === target || checkboxObj.svgRoot.contains(target)) {
                    return checkboxObj;
                }
            }
            return null;
        };

        const getMatchingTouch = event => {
            if (!touchStartInfo || !event.changedTouches) return null;
            for (let i = 0; i < event.changedTouches.length; i++) {
                const changedTouch = event.changedTouches[i];
                if (changedTouch.identifier === touchStartInfo.identifier) {
                    return changedTouch;
                }
            }
            return null;
        };

        const isCheckboxTapTarget = target => {
            if (getFlyoutCheckboxFromTarget(target)) {
                return true;
            }

            let checkTarget = target;
            while (checkTarget && checkTarget !== flyoutSvgGroup) {
                if (checkTarget.classList &&
                    (checkTarget.classList.contains('blocklyFlyoutCheckbox') ||
                        checkTarget.classList.contains('blocklyFlyoutCheckboxPath') ||
                        checkTarget.classList.contains('blocklyTouchTargetBackground'))) {
                    return true;
                }
                if (checkTarget.tagName === 'g' && checkTarget.querySelector('.blocklyFlyoutCheckbox')) {
                    return true;
                }
                checkTarget = checkTarget.parentNode;
            }
            return false;
        };

        const getFlyoutTopBlockFromTarget = target => {
            const blockId = this.getBlockIdFromTarget(target, flyoutSvgGroup);
            if (!blockId || !flyoutWorkspace) return null;

            let block = flyoutWorkspace.getBlockById(blockId);
            while (block && block.getParent()) {
                block = block.getParent();
            }
            return block;
        };

        const onTouchStart = e => {
            if (!e.changedTouches || e.changedTouches.length !== 1) {
                clearTouchState();
                return;
            }

            const touch = e.changedTouches[0];
            const checkboxObj = getFlyoutCheckboxFromTarget(e.target);
            touchStartInfo = {
                identifier: touch.identifier,
                x: touch.clientX,
                y: touch.clientY,
                moved: false,
                target: e.target,
                time: Date.now(),
                checkboxInitialState: checkboxObj ? checkboxObj.clicked : null
            };
        };

        const onTouchMove = e => {
            const touch = getMatchingTouch(e);
            if (!touchStartInfo || !touch) return;

            const dx = Math.abs(touch.clientX - touchStartInfo.x);
            const dy = Math.abs(touch.clientY - touchStartInfo.y);
            if (dx >= TAP_THRESHOLD || dy >= TAP_THRESHOLD) {
                touchStartInfo.moved = true;
            }
        };

        const onTouchEnd = e => {
            const touch = getMatchingTouch(e);
            const interaction = touchStartInfo;
            clearTouchState();

            if (!interaction || !touch) return;
            if (!flyout.isVisible()) return;
            if (interaction.moved) return;
            if ((Date.now() - interaction.time) >= TAP_DURATION) return;
            if (this.workspace.isDragging && this.workspace.isDragging()) return;

            const tapTarget = interaction.target || e.target;
            if (isCheckboxTapTarget(tapTarget)) {
                const checkboxObj = getFlyoutCheckboxFromTarget(tapTarget);
                if (checkboxObj && checkboxObj.clicked === interaction.checkboxInitialState) {
                    flyout.setCheckboxState(checkboxObj.block.id, !checkboxObj.clicked);
                }
                return;
            }

            const block = getFlyoutTopBlockFromTarget(tapTarget);
            if (!block) return;

            e.preventDefault();
            e.stopPropagation();
            if (e.stopImmediatePropagation) {
                e.stopImmediatePropagation();
            }

            flyout.createBlock(block);
            setTimeout(() => this.addCloseButtonsToAllBlocks(), 50);
            setTimeout(() => this.addCloseButtonsToAllBlocks(), 200);
        };

        const onTouchCancel = () => {
            clearTouchState();
        };

        this._detachFlyoutListeners = () => {
            flyoutSvgGroup.removeEventListener('touchstart', onTouchStart);
            flyoutSvgGroup.removeEventListener('touchmove', onTouchMove);
            flyoutSvgGroup.removeEventListener('touchend', onTouchEnd);
            flyoutSvgGroup.removeEventListener('touchcancel', onTouchCancel);
            clearTouchState();
        };

        flyoutSvgGroup.addEventListener('touchstart', onTouchStart, {passive: true});
        flyoutSvgGroup.addEventListener('touchmove', onTouchMove, {passive: true});
        flyoutSvgGroup.addEventListener('touchend', onTouchEnd, {passive: false});
        flyoutSvgGroup.addEventListener('touchcancel', onTouchCancel, {passive: true});

        if (process.env.DEBUG) {
            log.info('[Blocks] Attached custom flyout touch handlers');
        }

        this.attachInteractionDebugListeners();
    }

    attachVM() {
        this.workspace.addChangeListener(this.props.vm.blockListener);

        this.flyoutWorkspace = this.workspace
            .getFlyout()
            .getWorkspace();
        this.flyoutWorkspace.addChangeListener(this.props.vm.flyoutBlockListener);
        this.flyoutWorkspace.addChangeListener(this.props.vm.monitorBlockListener);
        this.props.vm.addListener('SCRIPT_GLOW_ON', this.onScriptGlowOn);
        this.props.vm.addListener('SCRIPT_GLOW_OFF', this.onScriptGlowOff);
        this.props.vm.addListener('BLOCK_GLOW_ON', this.onBlockGlowOn);
        this.props.vm.addListener('BLOCK_GLOW_OFF', this.onBlockGlowOff);
        this.props.vm.addListener('VISUAL_REPORT', this.onVisualReport);
        this.props.vm.addListener('workspaceUpdate', this.onWorkspaceUpdate);
        this.props.vm.addListener('targetsUpdate', this.onTargetsUpdate);
        this.props.vm.addListener('MONITORS_UPDATE', this.handleMonitorsUpdate);
        this.props.vm.addListener('EXTENSION_ADDED', this.handleExtensionAdded);
        this.props.vm.addListener('BLOCKSINFO_UPDATE', this.handleBlocksInfoUpdate);
        this.props.vm.addListener('PERIPHERAL_CONNECTED', this.handleStatusButtonUpdate);
        this.props.vm.addListener('PERIPHERAL_DISCONNECTED', this.handleStatusButtonUpdate);

        // Monkey patch flyout visibility to update state
        const flyout = this.workspace.getFlyout();
        const originalShow = flyout.show;
        const originalHide = flyout.hide;
        const self = this;
        let showTimestamp = 0;

        flyout.show = function (xmlList) {
            showTimestamp = Date.now();
            originalShow.call(this, xmlList);
            self.refreshFlyoutLayout();
            self.setState({ isFlyoutVisible: true });
        };
        flyout.hide = function () {
            // Prevent hide if show was just called (within 50ms) - this prevents the show/hide race condition
            const timeSinceShow = Date.now() - showTimestamp;
            if (timeSinceShow < 50) {
                return;
            }
            originalHide.call(this);
            self.setState({ isFlyoutVisible: false });
            // On mobile, resize workspace to take full width after flyout hides
            if (self.isMobileTouchViewport()) {
                setTimeout(() => {
                    self.workspace.resize();
                }, 0);
            }
        };

        // On mobile, we don't need drag listeners on flyout SVG anymore
        // The block drag/create listeners below handle closing the flyout

        // On mobile, close flyout when a block is created or dragged
        this.workspace.addChangeListener(event => {
            if (event.type === this.ScratchBlocks.Events.BLOCK_CREATE) {
                if (this.isMobileTouchViewport()) {
                    const currentFlyout = this.workspace.getFlyout();
                    if (currentFlyout && currentFlyout.isVisible()) {
                        currentFlyout.hide();
                    }
                }
            }

            if (event.type === this.ScratchBlocks.Events.BLOCK_DRAG) {
                if (event.isStart && this.isMobileTouchViewport()) {
                    const currentFlyout = this.workspace.getFlyout();
                    if (currentFlyout && currentFlyout.isVisible()) {
                        currentFlyout.hide();
                    }
                }
            }
        });

        // On mobile, close flyout when clicking on the main workspace area (outside flyout/toolbox)
        if (this.isMobileTouchViewport()) {
            const workspaceSvg = this.workspace.getParentSvg();
            if (workspaceSvg) {
                // Close flyout when tapping outside
                workspaceSvg.addEventListener('pointerdown', e => {
                    const currentFlyout = this.workspace.getFlyout();
                    if (!currentFlyout || !currentFlyout.isVisible()) return;

                    const flyoutSvg = currentFlyout ? currentFlyout.svgGroup_ : null;
                    const toolbox = this.workspace.getToolbox();
                    const toolboxDiv = toolbox ? toolbox.HtmlDiv : null;

                    const clickedInFlyout = flyoutSvg && flyoutSvg.contains(e.target);
                    const clickedInToolbox = toolboxDiv && toolboxDiv.contains(e.target);

                    if (!clickedInFlyout && !clickedInToolbox) {
                        currentFlyout.hide();
                    }
                }, true);

                // Polyfill: Tap to Create Block in Flyout
                // Handles both Mouse and Touch via Pointer Events
                this.attachFlyoutListeners();
            }

            // Mobile long-press detection for block deletion
            let longPressTimer = null;
            let longPressStartPos = null;
            const LONG_PRESS_DURATION = 500; // ms
            const MOVE_THRESHOLD = 10; // pixels

            workspaceSvg.addEventListener('touchstart', e => {
                // Find if touch is on a block
                let target = e.target;
                let blockSvg = null;

                // Walk up the DOM tree to find the block group
                while (target && target !== workspaceSvg) {
                    if (target.classList && target.classList.contains('blocklyDraggable')) {
                        blockSvg = target;
                        break;
                    }
                    // Also check for block path elements
                    if (target.getAttribute && target.getAttribute('data-id')) {
                        blockSvg = target;
                        break;
                    }
                    target = target.parentElement;
                }

                if (!blockSvg) {
                    // Try to find block through Blockly's internal structure
                    target = e.target;
                    while (target && target !== workspaceSvg) {
                        // Look for the block group with a data-id
                        if (target.getAttribute && target.getAttribute('data-id')) {
                            blockSvg = target;
                            break;
                        }
                        // Look for g.blocklyDraggable
                        if (target.tagName === 'g' && target.classList && target.classList.contains('blocklyDraggable')) {
                            blockSvg = target;
                            break;
                        }
                        target = target.parentElement;
                    }
                }

                if (blockSvg) {
                    const touch = e.touches[0];
                    longPressStartPos = { x: touch.clientX, y: touch.clientY };

                    // Find the block ID from the SVG element
                    let blockId = blockSvg.getAttribute('data-id');
                    if (!blockId) {
                        // Try to find via Blockly's block reference
                        const parentGroup = blockSvg.closest('[data-id]');
                        if (parentGroup) {
                            blockId = parentGroup.getAttribute('data-id');
                        }
                    }

                    if (blockId) {
                        // Verify it's a main workspace block, not a flyout block
                        const block = this.workspace.getBlockById(blockId);
                        if (block && !block.isInFlyout) {
                            longPressTimer = setTimeout(() => {
                                // Trigger long press action
                                this.handleMobileBlockLongPress(blockId, touch.clientX, touch.clientY);
                            }, LONG_PRESS_DURATION);
                            this.longPressBlockId = blockId;
                        }
                    }
                }
            }, { passive: true });

            workspaceSvg.addEventListener('touchmove', e => {
                if (longPressTimer && longPressStartPos) {
                    const touch = e.touches[0];
                    const dx = touch.clientX - longPressStartPos.x;
                    const dy = touch.clientY - longPressStartPos.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    // Cancel long press if moved too much
                    if (distance > MOVE_THRESHOLD) {
                        clearTimeout(longPressTimer);
                        longPressTimer = null;
                        longPressStartPos = null;
                        this.longPressBlockId = null;
                    }
                }
            }, { passive: true });

            workspaceSvg.addEventListener('touchend', () => {
                if (longPressTimer) {
                    clearTimeout(longPressTimer);
                    longPressTimer = null;
                }
                longPressStartPos = null;
                this.longPressBlockId = null;
            }, { passive: true });

            workspaceSvg.addEventListener('touchcancel', () => {
                if (longPressTimer) {
                    clearTimeout(longPressTimer);
                    longPressTimer = null;
                }
                longPressStartPos = null;
                this.longPressBlockId = null;
            }, { passive: true });
        }
    }


    detachVM() {
        this.props.vm.removeListener('SCRIPT_GLOW_ON', this.onScriptGlowOn);
        this.props.vm.removeListener('SCRIPT_GLOW_OFF', this.onScriptGlowOff);
        this.props.vm.removeListener('BLOCK_GLOW_ON', this.onBlockGlowOn);
        this.props.vm.removeListener('BLOCK_GLOW_OFF', this.onBlockGlowOff);
        this.props.vm.removeListener('VISUAL_REPORT', this.onVisualReport);
        this.props.vm.removeListener('workspaceUpdate', this.onWorkspaceUpdate);
        this.props.vm.removeListener('targetsUpdate', this.onTargetsUpdate);
        this.props.vm.removeListener('MONITORS_UPDATE', this.handleMonitorsUpdate);
        this.props.vm.removeListener('EXTENSION_ADDED', this.handleExtensionAdded);
        this.props.vm.removeListener('BLOCKSINFO_UPDATE', this.handleBlocksInfoUpdate);
        this.props.vm.removeListener('PERIPHERAL_CONNECTED', this.handleStatusButtonUpdate);
        this.props.vm.removeListener('PERIPHERAL_DISCONNECTED', this.handleStatusButtonUpdate);
    }

    updateToolboxBlockValue(id, value) {
        this.withToolboxUpdates(() => {
            const block = this.workspace
                .getFlyout()
                .getWorkspace()
                .getBlockById(id);
            if (block) {
                block.inputList[0].fieldRow[0].setValue(value);
            }
        });
    }

    onTargetsUpdate() {
        if (this.props.vm.editingTarget && this.workspace.getFlyout()) {
            ['glide', 'move', 'set'].forEach(prefix => {
                this.updateToolboxBlockValue(`${prefix}x`, Math.round(this.props.vm.editingTarget.x).toString());
                this.updateToolboxBlockValue(`${prefix}y`, Math.round(this.props.vm.editingTarget.y).toString());
            });
        }
    }
    onWorkspaceMetricsChange() {
        const target = this.props.vm.editingTarget;
        if (target && target.id) {
            // Dispatch updateMetrics later, since onWorkspaceMetricsChange may be (very indirectly)
            // called from a reducer, i.e. when you create a custom procedure.
            // TODO: Is this a vehement hack?
            setTimeout(() => {
                this.props.updateMetrics({
                    targetID: target.id,
                    scrollX: this.workspace.scrollX,
                    scrollY: this.workspace.scrollY,
                    scale: this.workspace.scale
                });
            }, 0);
        }
    }
    onScriptGlowOn(data) {
        this.workspace.glowStack(data.id, true);
    }
    onScriptGlowOff(data) {
        this.workspace.glowStack(data.id, false);
    }
    onBlockGlowOn(data) {
        this.workspace.glowBlock(data.id, true);
    }
    onBlockGlowOff(data) {
        this.workspace.glowBlock(data.id, false);
    }
    onVisualReport(data) {
        this.workspace.reportValue(data.id, data.value);
    }
    getToolboxXML() {
        // Use try/catch because this requires digging pretty deep into the VM
        // Code inside intentionally ignores several error situations (no stage, etc.)
        // Because they would get caught by this try/catch
        try {
            let { editingTarget: target, runtime } = this.props.vm;
            const stage = runtime.getTargetForStage();
            if (!target) target = stage; // If no editingTarget, use the stage

            const stageCostumes = stage.getCostumes();
            const targetCostumes = target.getCostumes();
            const targetSounds = target.getSounds();
            const dynamicBlocksXML = injectExtensionCategoryTheme(
                this.props.vm.runtime.getBlocksXML(target),
                this.props.theme
            );
            return makeToolboxXML(false, target.isStage, target.id, dynamicBlocksXML,
                targetCostumes[targetCostumes.length - 1].name,
                stageCostumes[stageCostumes.length - 1].name,
                targetSounds.length > 0 ? targetSounds[targetSounds.length - 1].name : '',
                getColorsForTheme(this.props.theme)
            );
        } catch {
            return null;
        }
    }
    onWorkspaceUpdate(data) {
        // When we change sprites, update the toolbox to have the new sprite's blocks
        const toolboxXML = this.getToolboxXML();
        if (toolboxXML) {
            this.props.updateToolboxState(toolboxXML);
        }

        if (this.props.vm.editingTarget && !this.props.workspaceMetrics.targets[this.props.vm.editingTarget.id]) {
            this.onWorkspaceMetricsChange();
        }

        // Remove and reattach the workspace listener (but allow flyout events)
        this.workspace.removeChangeListener(this.props.vm.blockListener);
        const dom = this.ScratchBlocks.Xml.textToDom(data.xml);
        try {
            this.ScratchBlocks.Xml.clearWorkspaceAndLoadFromXml(dom, this.workspace);
        } catch (error) {
            // The workspace is likely incomplete. What did update should be
            // functional.
            //
            // Instead of throwing the error, by logging it and continuing as
            // normal lets the other workspace update processes complete in the
            // gui and vm, which lets the vm run even if the workspace is
            // incomplete. Throwing the error would keep things like setting the
            // correct editing target from happening which can interfere with
            // some blocks and processes in the vm.
            if (error.message) {
                error.message = `Workspace Update Error: ${error.message}`;
            }
            log.error(error);
        }
        this.workspace.addChangeListener(this.props.vm.blockListener);

        if (this.props.vm.editingTarget && this.props.workspaceMetrics.targets[this.props.vm.editingTarget.id]) {
            const { scrollX, scrollY, scale } = this.props.workspaceMetrics.targets[this.props.vm.editingTarget.id];
            this.workspace.scrollX = scrollX;
            this.workspace.scrollY = scrollY;
            this.workspace.scale = scale;
            this.workspace.resize();
        }

        // Clear the undo state of the workspace since this is a
        // fresh workspace and we don't want any changes made to another sprites
        // workspace to be 'undone' here.
        this.workspace.clearUndo();
        this.refreshFlyoutLayout();
        setTimeout(() => this.addCloseButtonsToAllBlocks(), 0);
    }
    handleMonitorsUpdate(monitors) {
        // Update the checkboxes of the relevant monitors.
        // TODO: What about monitors that have fields? See todo in scratch-vm blocks.js changeBlock:
        // https://github.com/LLK/scratch-vm/blob/2373f9483edaf705f11d62662f7bb2a57fbb5e28/src/engine/blocks.js#L569-L576
        const flyout = this.workspace.getFlyout();
        for (const monitor of monitors.values()) {
            const blockId = monitor.get('id');
            const isVisible = monitor.get('visible');
            flyout.setCheckboxState(blockId, isVisible);
            // We also need to update the isMonitored flag for this block on the VM, since it's used to determine
            // whether the checkbox is activated or not when the checkbox is re-displayed (e.g. local variables/blocks
            // when switching between sprites).
            const block = this.props.vm.runtime.monitorBlocks.getBlock(blockId);
            if (block) {
                block.isMonitored = isVisible;
            }
        }
    }
    handleExtensionAdded(categoryInfo) {
        const defineBlocks = blockInfoArray => {
            if (blockInfoArray && blockInfoArray.length > 0) {
                const staticBlocksJson = [];
                const dynamicBlocksInfo = [];
                blockInfoArray.forEach(blockInfo => {
                    if (blockInfo.info && blockInfo.info.isDynamic) {
                        dynamicBlocksInfo.push(blockInfo);
                    } else if (blockInfo.json) {
                        staticBlocksJson.push(injectExtensionBlockTheme(blockInfo.json, this.props.theme));
                    }
                    // otherwise it's a non-block entry such as '---'
                });

                this.ScratchBlocks.defineBlocksWithJsonArray(staticBlocksJson);
                dynamicBlocksInfo.forEach(blockInfo => {
                    // This is creating the block factory / constructor -- NOT a specific instance of the block.
                    // The factory should only know static info about the block: the category info and the opcode.
                    // Anything else will be picked up from the XML attached to the block instance.
                    const extendedOpcode = `${categoryInfo.id}_${blockInfo.info.opcode}`;
                    const blockDefinition =
                        defineDynamicBlock(this.ScratchBlocks, categoryInfo, blockInfo, extendedOpcode);
                    this.ScratchBlocks.Blocks[extendedOpcode] = blockDefinition;
                });
            }
        };

        // scratch-blocks implements a menu or custom field as a special kind of block ("shadow" block)
        // these actually define blocks and MUST run regardless of the UI state
        defineBlocks(
            Object.getOwnPropertyNames(categoryInfo.customFieldTypes)
                .map(fieldTypeName => categoryInfo.customFieldTypes[fieldTypeName].scratchBlocksDefinition));
        defineBlocks(categoryInfo.menus);
        defineBlocks(categoryInfo.blocks);

        // Update the toolbox with new blocks if possible
        const toolboxXML = this.getToolboxXML();
        if (toolboxXML) {
            this.props.updateToolboxState(toolboxXML);
        }
    }
    handleBlocksInfoUpdate(categoryInfo) {
        // @todo Later we should replace this to avoid all the warnings from redefining blocks.
        this.handleExtensionAdded(categoryInfo);
    }
    handleCategorySelected(categoryId) {
        const extension = extensionData.find(ext => ext.extensionId === categoryId);
        if (extension && extension.launchPeripheralConnectionFlow) {
            this.handleConnectionModalStart(categoryId);
        }

        this.withToolboxUpdates(() => {
            if (this.selectToolboxCategory(categoryId)) {
                this.pendingCategorySelection = null;
                return;
            }

            this.pendingCategorySelection = categoryId;
        });
    }
    setBlocks(blocks) {
        this.blocks = blocks;
    }
    handlePromptStart(message, defaultValue, callback, optTitle, optVarType) {
        const p = { prompt: { callback, message, defaultValue } };
        p.prompt.title = optTitle ? optTitle :
            this.ScratchBlocks.Msg.VARIABLE_MODAL_TITLE;
        p.prompt.varType = typeof optVarType === 'string' ?
            optVarType : this.ScratchBlocks.SCALAR_VARIABLE_TYPE;
        p.prompt.showVariableOptions = // This flag means that we should show variable/list options about scope
            optVarType !== this.ScratchBlocks.BROADCAST_MESSAGE_VARIABLE_TYPE &&
            p.prompt.title !== this.ScratchBlocks.Msg.RENAME_VARIABLE_MODAL_TITLE &&
            p.prompt.title !== this.ScratchBlocks.Msg.RENAME_LIST_MODAL_TITLE;
        p.prompt.showCloudOption = (optVarType === this.ScratchBlocks.SCALAR_VARIABLE_TYPE) && this.props.canUseCloud;
        this.setState(p);
    }
    handleConnectionModalStart(extensionId) {
        this.props.onOpenConnectionModal(extensionId);
    }
    handleStatusButtonUpdate() {
        this.ScratchBlocks.refreshStatusButtons(this.workspace);
    }
    handleOpenSoundRecorder() {
        this.props.onOpenSoundRecorder();
    }

    /*
    * Pass along information about proposed name and variable options (scope and isCloud)
    * and additional potentially conflicting variable names from the VM
    * to the variable validation prompt callback used in scratch-blocks.
    */
    handlePromptCallback(input, variableOptions) {
        this.state.prompt.callback(
            input,
            this.props.vm.runtime.getAllVarNamesOfType(this.state.prompt.varType),
            variableOptions);
        this.handlePromptClose();
    }
    handlePromptClose() {
        this.setState({ prompt: null });
    }
    handleCustomProceduresClose(data) {
        this.props.onRequestCloseCustomProcedures(data);
        const ws = this.workspace;
        ws.refreshToolboxSelection_();
        ws.toolbox_.scrollToCategoryById('myBlocks');
    }
    handleDrop(dragInfo) {
        fetch(dragInfo.payload.bodyUrl)
            .then(response => response.json())
            .then(blocks => this.props.vm.shareBlocksToTarget(blocks, this.props.vm.editingTarget.id))
            .then(() => {
                this.props.vm.refreshWorkspace();
                this.updateToolbox(); // To show new variables/custom blocks
            });
    }

    // Mobile long-press block handlers
    handleMobileBlockLongPress(blockId, x, y) {
        if (!this.isMobileTouchViewport()) return; // Only on touch-first mobile view
        this.setState({
            mobileDeletePosition: { x, y },
            mobileDeleteBlockId: blockId
        });
    }

    handleMobileDelete() {
        const blockId = this.state.mobileDeleteBlockId;
        if (blockId && this.workspace) {
            const block = this.workspace.getBlockById(blockId);
            if (block) {
                // Dispose the block (deletes it and all connected blocks)
                block.dispose(false, true);
            }
        }
        this.setState({
            mobileDeletePosition: null,
            mobileDeleteBlockId: null
        });
    }

    handleCancelMobileDelete() {
        this.setState({
            mobileDeletePosition: null,
            mobileDeleteBlockId: null
        });
    }
    render() {
        /* eslint-disable no-unused-vars */
        const {
            anyModalVisible,
            canUseCloud,
            customProceduresVisible,
            extensionLibraryVisible,
            options,
            stageSize,
            vm,
            isRtl,
            isVisible,
            onActivateColorPicker,
            onOpenConnectionModal,
            onOpenSoundRecorder,
            updateToolboxState,
            onActivateCustomProcedures,
            onRequestCloseExtensionLibrary,
            onRequestCloseCustomProcedures,
            toolboxXML,
            updateMetrics: updateMetricsProp,
            useCatBlocks,
            workspaceMetrics,
            ...props
        } = this.props;
        /* eslint-enable no-unused-vars */
        return (
            <React.Fragment>
                <DroppableBlocks
                    componentRef={this.setBlocks}
                    onDrop={this.handleDrop}
                    isFlyoutVisible={this.state.isFlyoutVisible}
                    onCloseFlyout={this.handleCloseFlyout}
                    mobileDeletePosition={this.state.mobileDeletePosition}
                    onMobileDelete={this.handleMobileDelete}
                    onCancelMobileDelete={this.handleCancelMobileDelete}
                    {...props}
                />
                {this.state.prompt ? (
                    <Prompt
                        defaultValue={this.state.prompt.defaultValue}
                        isStage={vm.runtime.getEditingTarget().isStage}
                        showListMessage={this.state.prompt.varType === this.ScratchBlocks.LIST_VARIABLE_TYPE}
                        label={this.state.prompt.message}
                        showCloudOption={this.state.prompt.showCloudOption}
                        showVariableOptions={this.state.prompt.showVariableOptions}
                        title={this.state.prompt.title}
                        vm={vm}
                        onCancel={this.handlePromptClose}
                        onOk={this.handlePromptCallback}
                    />
                ) : null}
                {extensionLibraryVisible ? (
                    <ExtensionLibrary
                        vm={vm}
                        onCategorySelected={this.handleCategorySelected}
                        onRequestClose={onRequestCloseExtensionLibrary}
                    />
                ) : null}
                {customProceduresVisible ? (
                    <CustomProcedures
                        options={{
                            media: options.media
                        }}
                        onRequestClose={this.handleCustomProceduresClose}
                    />
                ) : null}
            </React.Fragment>
        );
    }
}

Blocks.propTypes = {
    anyModalVisible: PropTypes.bool,
    canUseCloud: PropTypes.bool,
    customProceduresVisible: PropTypes.bool,
    extensionLibraryVisible: PropTypes.bool,
    isRtl: PropTypes.bool,
    isVisible: PropTypes.bool,
    locale: PropTypes.string.isRequired,
    messages: PropTypes.objectOf(PropTypes.string),
    onActivateColorPicker: PropTypes.func,
    onActivateCustomProcedures: PropTypes.func,
    onCloseBlocks: PropTypes.func,
    onOpenConnectionModal: PropTypes.func,
    onOpenSoundRecorder: PropTypes.func,
    onRequestCloseCustomProcedures: PropTypes.func,
    onRequestCloseExtensionLibrary: PropTypes.func,
    options: PropTypes.shape({
        media: PropTypes.string,
        zoom: PropTypes.shape({
            controls: PropTypes.bool,
            wheel: PropTypes.bool,
            startScale: PropTypes.number
        }),
        comments: PropTypes.bool,
        collapse: PropTypes.bool
    }),
    stageSize: PropTypes.oneOf(Object.keys(STAGE_DISPLAY_SIZES)).isRequired,
    theme: PropTypes.oneOf(Object.keys(themeMap)),
    toolboxXML: PropTypes.string,
    updateMetrics: PropTypes.func,
    updateToolboxState: PropTypes.func,
    useCatBlocks: PropTypes.bool,
    vm: PropTypes.instanceOf(VM).isRequired,
    workspaceMetrics: PropTypes.shape({
        targets: PropTypes.objectOf(PropTypes.object)
    })
};

Blocks.defaultOptions = {
    zoom: {
        controls: true,
        wheel: true,
        startScale: BLOCKS_DEFAULT_SCALE
    },
    grid: {
        spacing: 40,
        length: 2,
        colour: '#ddd'
    },
    comments: true,
    collapse: false,
    sounds: false
};

Blocks.defaultProps = {
    isVisible: true,
    options: Blocks.defaultOptions,
    theme: DEFAULT_THEME
};

const mapStateToProps = state => ({
    anyModalVisible: (
        Object.keys(state.scratchGui.modals).some(key => state.scratchGui.modals[key]) ||
        state.scratchGui.mode.isFullScreen
    ),
    extensionLibraryVisible: state.scratchGui.modals.extensionLibrary,
    isRtl: state.locales.isRtl,
    locale: state.locales.locale,
    messages: state.locales.messages,
    toolboxXML: state.scratchGui.toolbox.toolboxXML,
    customProceduresVisible: state.scratchGui.customProcedures.active,
    workspaceMetrics: state.scratchGui.workspaceMetrics,
    useCatBlocks: isTimeTravel2020(state)
});

const mapDispatchToProps = dispatch => ({
    onActivateColorPicker: callback => dispatch(activateColorPicker(callback)),
    onActivateCustomProcedures: (data, callback) => dispatch(activateCustomProcedures(data, callback)),
    onOpenConnectionModal: id => {
        dispatch(setConnectionModalExtensionId(id));
        dispatch(openConnectionModal());
    },
    onOpenSoundRecorder: () => {
        dispatch(activateTab(SOUNDS_TAB_INDEX));
        dispatch(openSoundRecorder());
    },
    onRequestCloseExtensionLibrary: () => {
        dispatch(closeExtensionLibrary());
    },
    onRequestCloseCustomProcedures: data => {
        dispatch(deactivateCustomProcedures(data));
    },
    updateToolboxState: toolboxXML => {
        dispatch(updateToolbox(toolboxXML));
    },
    updateMetrics: metrics => {
        dispatch(updateMetrics(metrics));
    }
});

export default errorBoundaryHOC('Blocks')(
    connect(
        mapStateToProps,
        mapDispatchToProps
    )(Blocks)
);
