import React from 'react';
import ReactDOM from 'react-dom';
import { compose } from 'redux';

import AppStateHOC from '../lib/app-state-hoc.jsx';
import GUI from '../containers/gui.jsx';
import HashParserHOC from '../lib/hash-parser-hoc.jsx';
import log from '../lib/log.js';

const onClickLogo = () => {
    // Do nothing - prevent redirect
};

const handleTelemetryModalCancel = () => {
    log('User canceled telemetry modal');
};

const handleTelemetryModalOptIn = () => {
    log('User opted into telemetry');
};

const handleTelemetryModalOptOut = () => {
    log('User opted out of telemetry');
};

const isTruthyQueryValue = value => value === '1' || value === 'true' || value === 'yes';

const getSharedViewerToken = pathname => {
    const match = pathname.match(/^\/project\/([^/?#]+)/);
    return match ? decodeURIComponent(match[1]) : null;
};

const getShareApiHost = () => {
    if (typeof window !== 'object') {
        return 'https://api.logicbox.one';
    }
    const {protocol, hostname} = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'https://api.logicbox.one';
    }
    if (hostname === 'www.logicbox.one' || hostname === 'logicbox.one') {
        return `${protocol}//api.logicbox.one`;
    }
    return `${protocol}//api.logicbox.one`;
};

/*
 * Render the GUI playground. This is a separate function because importing anything
 * that instantiates the VM causes unsupported browsers to crash
 * {object} appTarget - the DOM element to render to
 */
export default appTarget => {
    GUI.setAppElement(appTarget);

    const WrappedGui = compose(
        AppStateHOC,
        HashParserHOC
    )(GUI);

    const backpackHostMatches = window.location.href.match(/[?&]backpack_host=([^&]*)&?/);
    const backpackHost = backpackHostMatches ? backpackHostMatches[1] : null;

    const scratchDesktopMatches = window.location.href.match(/[?&]isScratchDesktop=([^&]+)/);
    let simulateScratchDesktop;
    if (scratchDesktopMatches) {
        try {
            simulateScratchDesktop = JSON.parse(scratchDesktopMatches[1]);
        } catch {
            simulateScratchDesktop = scratchDesktopMatches[1];
        }
    }

    const params = new URLSearchParams(window.location.search);
    const sharedToken = getSharedViewerToken(window.location.pathname);
    const forcePlayerOnly = isTruthyQueryValue(params.get('playerOnly')) || Boolean(sharedToken);

    if (process.env.NODE_ENV === 'production' && typeof window === 'object') {
        window.onbeforeunload = () => true;
    }

    const playerOnlyProps = {
        canEditTitle: false,
        canSave: false,
        isPlayerOnly: true,
        isSharedViewer: Boolean(sharedToken),
        onClickLogo: onClickLogo
    };

    if (sharedToken) {
        playerOnlyProps.projectHost = `${getShareApiHost()}/shares`;
        playerOnlyProps.sharedToken = sharedToken;
    }

    ReactDOM.render(
        forcePlayerOnly ?
            <WrappedGui {...playerOnlyProps} /> :
            (simulateScratchDesktop ?
                <WrappedGui
                    canEditTitle
                    isScratchDesktop
                    showTelemetryModal
                    canSave={false}
                    onTelemetryModalCancel={handleTelemetryModalCancel}
                    onTelemetryModalOptIn={handleTelemetryModalOptIn}
                    onTelemetryModalOptOut={handleTelemetryModalOptOut}
                /> :
                <WrappedGui
                    canEditTitle
                    backpackVisible
                    showComingSoon
                    backpackHost={backpackHost}
                    canSave={false}
                    onClickLogo={onClickLogo}
                />),
        appTarget);
};
