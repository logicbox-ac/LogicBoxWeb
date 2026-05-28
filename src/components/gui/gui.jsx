import classNames from 'classnames';
import omit from 'lodash.omit';
import PropTypes from 'prop-types';
import React, {Suspense, lazy, useCallback, useRef, useState} from 'react';
import {defineMessages, FormattedMessage, injectIntl, intlShape} from 'react-intl';
import {connect} from 'react-redux';
import MediaQuery from 'react-responsive';
import {Tab, Tabs, TabList, TabPanel} from 'react-tabs';
import tabStyles from 'react-tabs/style/react-tabs.css';
import VM from 'scratch-vm';
import Renderer from 'scratch-render';

import Blocks from '../../containers/blocks.jsx';
import TargetPane from '../../containers/target-pane.jsx';
import StageWrapper from '../../containers/stage-wrapper.jsx';
import Loader from '../loader/loader.jsx';
import Box from '../box/box.jsx';
import MenuBar from '../menu-bar/menu-bar.jsx';
import Watermark from '../../containers/watermark.jsx';
import MobileTabBar from '../mobile-tab-bar/mobile-tab-bar.jsx';

import Alerts from '../../containers/alerts.jsx';
import DragLayer from '../../containers/drag-layer.jsx';
import CollapsibleStageHeader from '../collapsible-stage-header/collapsible-stage-header.jsx';
// CollapsiblePaintControls removed - zoom controls are always visible on canvas

import layout, {STAGE_SIZE_MODES} from '../../lib/layout-constants';
import {resolveStageSize} from '../../lib/screen-utils';
import {themeMap} from '../../lib/themes';

import styles from './gui.css';
import addExtensionIcon from './icon--extensions.svg';
import codeIcon from './icon--code.svg';
import costumesIcon from './icon--costumes.svg';
import soundsIcon from './icon--sounds.svg';

const LazyBackdropLibrary = lazy(() => import(
    /* webpackChunkName: "backdrop-library" */
    '../../containers/backdrop-library.jsx'
));
const LazyBackpack = lazy(() => import(
    /* webpackChunkName: "backpack" */
    '../../containers/backpack.jsx'
));
const LazyCards = lazy(() => import(
    /* webpackChunkName: "tutorial-cards" */
    '../../containers/cards.jsx'
));
const LazyConnectionModal = lazy(() => import(
    /* webpackChunkName: "connection-modal" */
    '../../containers/connection-modal.jsx'
));
const LazyCostumeLibrary = lazy(() => import(
    /* webpackChunkName: "costume-library" */
    '../../containers/costume-library.jsx'
));
const LazyCostumeTab = lazy(() => import(
    /* webpackChunkName: "costume-tab" */
    '../../containers/costume-tab.jsx'
));
const LazyDebugModal = lazy(() => import(
    /* webpackChunkName: "debug-modal" */
    '../debug-modal/debug-modal.jsx'
));
const LazySoundTab = lazy(() => import(
    /* webpackChunkName: "sound-tab" */
    '../../containers/sound-tab.jsx'
));
const LazyTelemetryModal = lazy(() => import(
    /* webpackChunkName: "telemetry-modal" */
    '../telemetry-modal/telemetry-modal.jsx'
));
const LazyTipsLibrary = lazy(() => import(
    /* webpackChunkName: "tips-library" */
    '../../containers/tips-library.jsx'
));
const LazyVirtualKeyboard = lazy(() => import(
    /* webpackChunkName: "virtual-keyboard" */
    '../virtual-keyboard/virtual-keyboard.jsx'
));
const LazyWebGlModal = lazy(() => import(
    /* webpackChunkName: "webgl-modal" */
    '../../containers/webgl-modal.jsx'
));

const messages = defineMessages({
    addExtension: {
        id: 'gui.gui.addExtension',
        description: 'Button to add an extension in the target pane',
        defaultMessage: 'Add Extension'
    }
});

// Cache this value to only retrieve it once the first time.
// Assume that it doesn't change for a session.
let isRendererSupported = null;

const GUIComponent = props => {
    // Mobile tab state for responsive layout
    const [mobileActiveTab, setMobileActiveTab] = useState('code');
    // Collapsible stage state for code tab
    const [isStageCollapsed, setIsStageCollapsed] = useState(false);
    // Remembers which target the user was coding, so tapping a sprite/stage in the
    // Files tab (to edit its assets) doesn't leave the Code tab showing a different,
    // often-empty workspace. The Blocks component's isVisible prop never toggles on
    // mobile, so its own save/restore can't fire here — we drive it from tab changes.
    const codeEditingTargetRef = useRef(null);
    const {
        accountNavOpen,
        activeTabIndex,
        alertsVisible,
        authorId,
        authorThumbnailUrl,
        authorUsername,
        basePath,
        backdropLibraryVisible,
        backpackHost,
        backpackVisible,
        blocksId,
        blocksTabVisible,
        cardsVisible,
        canChangeLanguage,
        canChangeTheme,
        canCreateNew,
        canEditTitle,
        canManageFiles,
        canRemix,
        canSave,
        canCreateCopy,
        canShare,
        canUseCloud,
        children,
        connectionModalVisible,
        costumeLibraryVisible,
        costumesTabVisible,
        debugModalVisible,
        enableCommunity,
        extensionLibraryVisible, // eslint-disable-line no-unused-vars
        intl,
        isCreating,
        isFullScreen,
        isPlayerOnly,
        isRtl,
        isSharedViewer,
        isShared,
        isTelemetryEnabled,
        isTotallyNormal,
        loading,
        logo,
        renderLogin,
        onClickAbout,
        onClickAccountNav,
        onCloseAccountNav,
        onCloseBlocks,
        onLogOut,
        onOpenRegistration,
        onToggleLoginOpen,
        onActivateCostumesTab,
        onActivateSoundsTab,
        onActivateTab,
        onClickLogo,
        onExtensionButtonClick,
        onProjectTelemetryEvent,
        onRequestCloseBackdropLibrary,
        onRequestCloseCostumeLibrary,
        onRequestCloseDebugModal,
        onRequestCloseTelemetryModal,
        onSeeCommunity,
        onShare,
        onShowPrivacyPolicy,
        onStartSelectingFileUpload,
        onTelemetryModalCancel,
        onTelemetryModalOptIn,
        onTelemetryModalOptOut,
        showComingSoon,
        soundsTabVisible,
        stageSizeMode,
        targetIsStage,
        telemetryModalVisible,
        theme,
        tipsLibraryVisible,
        vm,
        ...componentProps
    } = omit(props, 'dispatch');

    const handleMobileTabChange = useCallback(tab => {
        if (vm) {
            // Leaving Code: remember the target we were coding.
            if (mobileActiveTab === 'code' && tab !== 'code' && vm.editingTarget) {
                codeEditingTargetRef.current = vm.editingTarget.id;
            }
            // Entering Code: snap back to the saved target only if the editing target
            // drifted to the Stage in the Files tab (e.g. applying a backdrop selects
            // the Stage). Drifting to a sprite is intentional — adding a new sprite or
            // tapping an existing one in Files should persist, so we leave it alone.
            if (tab === 'code' && mobileActiveTab !== 'code' && codeEditingTargetRef.current) {
                const savedId = codeEditingTargetRef.current;
                const exists = vm.runtime && typeof vm.runtime.getTargetById === 'function' ?
                    Boolean(vm.runtime.getTargetById(savedId)) : true;
                if (exists && vm.editingTarget && vm.editingTarget.id !== savedId &&
                    vm.editingTarget.isStage) {
                    vm.setEditingTarget(savedId);
                }
            }
        }
        setMobileActiveTab(tab);
        if (tab === 'code') props.onActivateTab(0);
        // On mobile the Blocks component's isVisible prop never toggles, so the
        // re-sync desktop runs when the Scripts tab is shown (setVisible +
        // refreshWorkspace) never fires here. Without it the Blockly workspace
        // can keep the previously selected sprite's blocks while the VM's
        // editingTarget already points at a newly added/selected sprite — and
        // editing that stale workspace leaks the blocks onto the wrong target.
        // Reload the workspace for the current editingTarget once the tab is
        // visible (the load fails silently on a zero-size hidden workspace).
        if (tab === 'code' && mobileActiveTab !== 'code' && props.vm) {
            setTimeout(() => {
                if (props.vm) {
                    props.vm.refreshWorkspace();
                    window.dispatchEvent(new Event('resize'));
                }
            }, 50);
        }
        if (tab === 'costumes') props.onActivateCostumesTab();
        if (tab === 'sounds') props.onActivateSoundsTab();
        // When switching to stage tab, trigger a redraw after DOM updates
        if (tab === 'stage' && props.vm && props.vm.renderer) {
            // Small delay to allow CSS display change to take effect
            setTimeout(() => {
                if (props.vm.renderer) {
                    props.vm.renderer.resize(props.vm.renderer._nativeSize[0], props.vm.renderer._nativeSize[1]);
                    props.vm.renderer.draw();
                }
            }, 50);
        }
    }, [
        mobileActiveTab,
        props.onActivateTab,
        props.onActivateCostumesTab,
        props.onActivateSoundsTab,
        props.vm,
        props.activeTabIndex
    ]);

    const handleStageToggle = useCallback(() => {
        setIsStageCollapsed(prev => !prev);

        // Trigger renderer resize after collapse/expand
        if (props.vm && props.vm.renderer) {
            setTimeout(() => {
                if (props.vm.renderer) {
                    props.vm.renderer.resize(props.vm.renderer._nativeSize[0], props.vm.renderer._nativeSize[1]);
                    props.vm.renderer.draw();
                }
            }, 350);
        }
    }, [props.vm]);

    if (children) {
        return <Box {...componentProps}>{children}</Box>;
    }

    const tabClassNames = {
        tabs: styles.tabs,
        tab: classNames(tabStyles.reactTabsTab, styles.tab),
        tabList: classNames(tabStyles.reactTabsTabList, styles.tabList),
        tabPanel: classNames(tabStyles.reactTabsTabPanel, styles.tabPanel),
        tabPanelSelected: classNames(tabStyles.reactTabsTabPanelSelected, styles.isSelected),
        tabSelected: classNames(tabStyles.reactTabsTabSelected, styles.isSelected)
    };
    const renderLazy = child => (
        <Suspense fallback={null}>
            {child}
        </Suspense>
    );

    if (isRendererSupported === null) {
        isRendererSupported = Renderer.isSupported();
    }

    return (<MediaQuery minWidth={layout.fullSizeMinWidth}>{isFullSize => {
        const stageSize = resolveStageSize(stageSizeMode, isFullSize);

        return isPlayerOnly ? (
            <StageWrapper
                isFullScreen={isFullScreen}
                isRendererSupported={isRendererSupported}
                isRtl={isRtl}
                loading={loading}
                stageSize={STAGE_SIZE_MODES.large}
                vm={vm}
            >
                {isSharedViewer ? (
                    renderLazy(<LazyVirtualKeyboard
                        visible
                        vm={vm}
                    />)
                ) : null}
                {alertsVisible ? (
                    <Alerts className={styles.alertsContainer} />
                ) : null}
            </StageWrapper>
        ) : (
            <Box
                className={classNames(styles.pageWrapper)}
                data-mobile-tab={mobileActiveTab}
                dir={isRtl ? 'rtl' : 'ltr'}
                {...componentProps}
            >
                {telemetryModalVisible ? (
                    renderLazy(<LazyTelemetryModal
                        isRtl={isRtl}
                        isTelemetryEnabled={isTelemetryEnabled}
                        onCancel={onTelemetryModalCancel}
                        onOptIn={onTelemetryModalOptIn}
                        onOptOut={onTelemetryModalOptOut}
                        onRequestClose={onRequestCloseTelemetryModal}
                        onShowPrivacyPolicy={onShowPrivacyPolicy}
                    />)
                ) : null}
                {loading ? (
                    <Loader />
                ) : null}
                {isCreating ? (
                    <Loader messageId="gui.loader.creating" />
                ) : null}
                {isRendererSupported ? null : (
                    renderLazy(<LazyWebGlModal isRtl={isRtl} />)
                )}
                {tipsLibraryVisible ? (
                    renderLazy(<LazyTipsLibrary />)
                ) : null}
                {cardsVisible ? (
                    renderLazy(<LazyCards />)
                ) : null}
                {alertsVisible ? (
                    <Alerts className={styles.alertsContainer} />
                ) : null}
                {connectionModalVisible ? (
                    renderLazy(<LazyConnectionModal
                        vm={vm}
                    />)
                ) : null}
                {costumeLibraryVisible ? (
                    renderLazy(<LazyCostumeLibrary
                        vm={vm}
                        onRequestClose={onRequestCloseCostumeLibrary}
                    />)
                ) : null}
                {debugModalVisible ? renderLazy(<LazyDebugModal
                    isOpen={debugModalVisible}
                    onClose={onRequestCloseDebugModal}
                />) : null}
                {backdropLibraryVisible ? (
                    renderLazy(<LazyBackdropLibrary
                        vm={vm}
                        onRequestClose={onRequestCloseBackdropLibrary}
                    />)
                ) : null}
                <MenuBar
                    accountNavOpen={accountNavOpen}
                    authorId={authorId}
                    authorThumbnailUrl={authorThumbnailUrl}
                    authorUsername={authorUsername}
                    canChangeLanguage={canChangeLanguage}
                    canChangeTheme={canChangeTheme}
                    canCreateCopy={canCreateCopy}
                    canCreateNew={canCreateNew}
                    canEditTitle={canEditTitle}
                    canManageFiles={canManageFiles}
                    canRemix={canRemix}
                    canSave={canSave}
                    canShare={canShare}
                    className={styles.menuBarPosition}
                    enableCommunity={enableCommunity}
                    isShared={isShared}
                    isTotallyNormal={isTotallyNormal}
                    logo={logo}
                    renderLogin={renderLogin}
                    showComingSoon={showComingSoon}
                    onClickAbout={onClickAbout}
                    onClickAccountNav={onClickAccountNav}
                    onClickLogo={onClickLogo}
                    onCloseAccountNav={onCloseAccountNav}
                    onLogOut={onLogOut}
                    onOpenRegistration={onOpenRegistration}
                    onProjectTelemetryEvent={onProjectTelemetryEvent}
                    onSeeCommunity={onSeeCommunity}
                    onShare={onShare}
                    onStartSelectingFileUpload={onStartSelectingFileUpload}
                    onToggleLoginOpen={onToggleLoginOpen}
                />
                <MobileTabBar
                    activeTab={mobileActiveTab}
                    onTabChange={handleMobileTabChange}
                />
                <Box className={styles.bodyWrapper}>
                    <Box
                        className={styles.flexWrapper}

                    >
                        <Box className={styles.editorWrapper}>
                            <Tabs
                                forceRenderTabPanel
                                className={tabClassNames.tabs}
                                selectedIndex={activeTabIndex}
                                selectedTabClassName={tabClassNames.tabSelected}
                                selectedTabPanelClassName={tabClassNames.tabPanelSelected}
                                onSelect={onActivateTab}
                            >
                                <TabList className={tabClassNames.tabList}>
                                    <Tab className={tabClassNames.tab}>
                                        <img
                                            draggable={false}
                                            src={codeIcon}
                                        />
                                        <FormattedMessage
                                            defaultMessage="Code"
                                            description="Button to get to the code panel"
                                            id="gui.gui.codeTab"
                                        />
                                    </Tab>
                                    <Tab
                                        className={tabClassNames.tab}
                                        onClick={onActivateCostumesTab}
                                    >
                                        <img
                                            draggable={false}
                                            src={costumesIcon}
                                        />
                                        {targetIsStage ? (
                                            <FormattedMessage
                                                defaultMessage="Backdrops"
                                                description="Button to get to the backdrops panel"
                                                id="gui.gui.backdropsTab"
                                            />
                                        ) : (
                                            <FormattedMessage
                                                defaultMessage="Costumes"
                                                description="Button to get to the costumes panel"
                                                id="gui.gui.costumesTab"
                                            />
                                        )}
                                    </Tab>
                                    <Tab
                                        className={tabClassNames.tab}
                                        onClick={onActivateSoundsTab}
                                    >
                                        <img
                                            draggable={false}
                                            src={soundsIcon}
                                        />
                                        <FormattedMessage
                                            defaultMessage="Sounds"
                                            description="Button to get to the sounds panel"
                                            id="gui.gui.soundsTab"
                                        />
                                    </Tab>
                                </TabList>
                                <TabPanel className={tabClassNames.tabPanel}>
                                    <Box className={styles.blocksWrapper}>
                                        <Blocks
                                            key={`${blocksId}/${theme}`}
                                            canUseCloud={canUseCloud}
                                            grow={1}
                                            isVisible={blocksTabVisible}
                                            options={{
                                                media: `${basePath}static/${themeMap[theme].blocksMediaFolder}/`
                                            }}
                                            stageSize={stageSize}
                                            theme={theme}
                                            vm={vm}
                                            onCloseBlocks={onCloseBlocks}
                                        />
                                    </Box>
                                    <Box
                                        className={styles.extensionButtonContainer}
                                    >
                                        <button
                                            className={styles.extensionButton}
                                            title={intl.formatMessage(messages.addExtension)}
                                            onClick={onExtensionButtonClick}
                                        >
                                            <img
                                                className={styles.extensionButtonIcon}
                                                draggable={false}
                                                src={addExtensionIcon}
                                            />
                                        </button>
                                    </Box>
                                    <Box className={styles.watermark}>
                                        <Watermark />
                                    </Box>
                                </TabPanel>
                                <TabPanel className={tabClassNames.tabPanel}>
                                    {costumesTabVisible ? renderLazy(<LazyCostumeTab vm={vm} />) : null}
                                </TabPanel>
                                <TabPanel className={tabClassNames.tabPanel}>
                                    {soundsTabVisible ? renderLazy(<LazySoundTab vm={vm} />) : null}
                                </TabPanel>
                            </Tabs>

                            {backpackVisible ? (
                                renderLazy(<LazyBackpack host={backpackHost} />)
                            ) : null}
                        </Box>

                        <Box
                            className={classNames(styles.stageAndTargetWrapper, styles[stageSize], {
                                [styles.collapsed]: isStageCollapsed && mobileActiveTab === 'code'
                            })}
                            data-stage-collapsed={isStageCollapsed}
                            data-mobile-tab={mobileActiveTab}
                        >
                            {/* Collapsible header for mobile code tab */}
                            {mobileActiveTab === 'code' && (
                                <CollapsibleStageHeader
                                    isCollapsed={isStageCollapsed}
                                    onToggle={handleStageToggle}
                                />
                            )}
                            {!(isStageCollapsed && mobileActiveTab === 'code') && (
                                <Box className={styles.stageContentWrapper}>
                                    <StageWrapper
                                        isFullScreen={isFullScreen}
                                        isRendererSupported={isRendererSupported}
                                        isRtl={isRtl}
                                        stageSize={stageSize}
                                        vm={vm}
                                    />
                                    {/* Virtual Keyboard - shown on mobile stage tab when keyboard blocks exist */}
                                    {mobileActiveTab === 'stage' && (
                                        renderLazy(<LazyVirtualKeyboard
                                            visible
                                            vm={vm}
                                        />)
                                    )}
                                </Box>
                            )}
                            <Box className={styles.targetWrapper}>
                                <TargetPane
                                    stageSize={stageSize}
                                    vm={vm}
                                />
                            </Box>
                        </Box>
                    </Box>
                </Box>
                <DragLayer />
            </Box>
        );
    }}</MediaQuery>);
};

GUIComponent.propTypes = {
    accountNavOpen: PropTypes.bool,
    activeTabIndex: PropTypes.number,
    authorId: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]), // can be false
    authorThumbnailUrl: PropTypes.string,
    authorUsername: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]), // can be false
    backdropLibraryVisible: PropTypes.bool,
    backpackHost: PropTypes.string,
    backpackVisible: PropTypes.bool,
    basePath: PropTypes.string,
    blocksTabVisible: PropTypes.bool,
    blocksId: PropTypes.string,
    canChangeLanguage: PropTypes.bool,
    canChangeTheme: PropTypes.bool,
    canCreateCopy: PropTypes.bool,
    canCreateNew: PropTypes.bool,
    canEditTitle: PropTypes.bool,
    canManageFiles: PropTypes.bool,
    canRemix: PropTypes.bool,
    canSave: PropTypes.bool,
    canShare: PropTypes.bool,
    canUseCloud: PropTypes.bool,
    cardsVisible: PropTypes.bool,
    children: PropTypes.node,
    costumeLibraryVisible: PropTypes.bool,
    costumesTabVisible: PropTypes.bool,
    debugModalVisible: PropTypes.bool,
    extensionLibraryVisible: PropTypes.bool,
    enableCommunity: PropTypes.bool,
    intl: intlShape.isRequired,
    isCreating: PropTypes.bool,
    isFullScreen: PropTypes.bool,
    isPlayerOnly: PropTypes.bool,
    isRtl: PropTypes.bool,
    isSharedViewer: PropTypes.bool,
    isShared: PropTypes.bool,
    isTotallyNormal: PropTypes.bool,
    loading: PropTypes.bool,
    logo: PropTypes.string,
    onActivateCostumesTab: PropTypes.func,
    onActivateSoundsTab: PropTypes.func,
    onActivateTab: PropTypes.func,
    onClickAccountNav: PropTypes.func,
    onClickLogo: PropTypes.func,
    onCloseAccountNav: PropTypes.func,
    onCloseBlocks: PropTypes.func,
    onExtensionButtonClick: PropTypes.func,
    onLogOut: PropTypes.func,
    onOpenRegistration: PropTypes.func,
    onRequestCloseBackdropLibrary: PropTypes.func,
    onRequestCloseCostumeLibrary: PropTypes.func,
    onRequestCloseDebugModal: PropTypes.func,
    onRequestCloseTelemetryModal: PropTypes.func,
    onSeeCommunity: PropTypes.func,
    onShare: PropTypes.func,
    onShowPrivacyPolicy: PropTypes.func,
    onStartSelectingFileUpload: PropTypes.func,
    onTabSelect: PropTypes.func,
    onTelemetryModalCancel: PropTypes.func,
    onTelemetryModalOptIn: PropTypes.func,
    onTelemetryModalOptOut: PropTypes.func,
    onToggleLoginOpen: PropTypes.func,
    renderLogin: PropTypes.func,
    showComingSoon: PropTypes.bool,
    soundsTabVisible: PropTypes.bool,
    stageSizeMode: PropTypes.oneOf(Object.keys(STAGE_SIZE_MODES)),
    targetIsStage: PropTypes.bool,
    telemetryModalVisible: PropTypes.bool,
    theme: PropTypes.string,
    tipsLibraryVisible: PropTypes.bool,
    vm: PropTypes.instanceOf(VM).isRequired
};
GUIComponent.defaultProps = {
    backpackHost: null,
    backpackVisible: false,
    basePath: './',
    blocksId: 'original',
    canChangeLanguage: true,
    canChangeTheme: true,
    canCreateNew: false,
    canEditTitle: false,
    canManageFiles: true,
    canRemix: false,
    canSave: false,
    canCreateCopy: false,
    canShare: false,
    canUseCloud: false,
    enableCommunity: false,
    isCreating: false,
    isShared: false,
    isSharedViewer: false,
    isTotallyNormal: false,
    loading: false,
    showComingSoon: false,
    stageSizeMode: STAGE_SIZE_MODES.large
};

const mapStateToProps = state => ({
    // This is the button's mode, as opposed to the actual current state
    blocksId: state.scratchGui.timeTravel.year.toString(),
    stageSizeMode: state.scratchGui.stageSize.stageSize,
    theme: state.scratchGui.theme.theme
});

export default injectIntl(connect(
    mapStateToProps
)(GUIComponent));
