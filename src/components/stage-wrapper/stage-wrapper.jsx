import PropTypes from 'prop-types';
import React from 'react';
import classNames from 'classnames';
import VM from 'scratch-vm';

import Box from '../box/box.jsx';
import {STAGE_DISPLAY_SIZES} from '../../lib/layout-constants.js';
import StageHeader from '../../containers/stage-header.jsx';
import Stage from '../../containers/stage.jsx';
import Loader from '../loader/loader.jsx';

import styles from './stage-wrapper.css';

const StageWrapperComponent = function (props) {
    const {
        isFullScreen,
        isRtl,
        isRendererSupported,
        loading,
        stageSize,
        vm
    } = props;

    const isMobile = window.innerWidth <= 767;
    
    React.useEffect(() => {
        if (isMobile) {
            setTimeout(() => {
                const stageWrapper = document.querySelector('[class*="stage-wrapper"]');
                const stageCanvas = document.querySelector('[class*="stage-canvas-wrapper"]');
                const canvas = document.querySelector('canvas');
                
                console.log('[STAGE-WRAPPER] ========== STAGE LAYOUT CHECK ==========');
                console.log('[STAGE-WRAPPER] Props:', {
                    isFullScreen,
                    isRendererSupported,
                    loading,
                    stageSize,
                    screenWidth: window.innerWidth,
                    screenHeight: window.innerHeight
                });
                
                if (stageWrapper) {
                    const rect = stageWrapper.getBoundingClientRect();
                    const styles = window.getComputedStyle(stageWrapper);
                    const centerX = window.innerWidth / 2;
                    const wrapperCenterX = rect.left + (rect.width / 2);
                    
                    console.log('[STAGE-WRAPPER] Stage wrapper dimensions:', {
                        width: rect.width,
                        height: rect.height,
                        top: rect.top,
                        left: rect.left,
                        right: rect.right,
                        bottom: rect.bottom,
                        display: styles.display,
                        flexDirection: styles.flexDirection,
                        alignItems: styles.alignItems,
                        justifyContent: styles.justifyContent,
                        fitsInViewport: rect.right <= window.innerWidth && rect.bottom <= window.innerHeight,
                        overflowsRight: rect.right > window.innerWidth,
                        overflowsBottom: rect.bottom > window.innerHeight
                    });
                    
                    console.log('[STAGE-WRAPPER] Wrapper centering:', {
                        screenCenterX: centerX,
                        wrapperCenterX: wrapperCenterX,
                        difference: Math.abs(centerX - wrapperCenterX),
                        isCentered: Math.abs(centerX - wrapperCenterX) < 10
                    });
                }
                
                if (stageCanvas) {
                    const rect = stageCanvas.getBoundingClientRect();
                    const styles = window.getComputedStyle(stageCanvas);
                    const centerX = window.innerWidth / 2;
                    const centerY = window.innerHeight / 2;
                    const canvasCenterX = rect.left + (rect.width / 2);
                    const canvasCenterY = rect.top + (rect.height / 2);
                    
                    console.log('[STAGE-WRAPPER] Stage canvas wrapper:', {
                        width: rect.width,
                        height: rect.height,
                        top: rect.top,
                        left: rect.left,
                        display: styles.display,
                        alignItems: styles.alignItems,
                        justifyContent: styles.justifyContent,
                        fitsInViewport: rect.right <= window.innerWidth && rect.bottom <= window.innerHeight
                    });
                    
                    console.log('[STAGE-WRAPPER] Canvas centering:', {
                        screenCenterX: centerX,
                        screenCenterY: centerY,
                        canvasCenterX: canvasCenterX,
                        canvasCenterY: canvasCenterY,
                        horizontalDiff: Math.abs(centerX - canvasCenterX),
                        verticalDiff: Math.abs(centerY - canvasCenterY),
                        isHorizontallyCentered: Math.abs(centerX - canvasCenterX) < 10,
                        isVerticallyCentered: Math.abs(centerY - canvasCenterY) < 50
                    });
                }
                
                if (canvas) {
                    const rect = canvas.getBoundingClientRect();
                    const centerX = window.innerWidth / 2;
                    const centerY = window.innerHeight / 2;
                    const canvasCenterX = rect.left + (rect.width / 2);
                    const canvasCenterY = rect.top + (rect.height / 2);
                    
                    console.log('[STAGE-WRAPPER] Canvas element:', {
                        width: rect.width,
                        height: rect.height,
                        canvasWidth: canvas.width,
                        canvasHeight: canvas.height,
                        top: rect.top,
                        left: rect.left,
                        right: rect.right,
                        bottom: rect.bottom,
                        fitsInViewport: rect.right <= window.innerWidth && rect.bottom <= window.innerHeight,
                        overflowsRight: rect.right > window.innerWidth,
                        overflowsBottom: rect.bottom > window.innerHeight
                    });
                    
                    console.log('[STAGE-WRAPPER] Canvas position:', {
                        screenCenterX: centerX,
                        screenCenterY: centerY,
                        canvasCenterX: canvasCenterX,
                        canvasCenterY: canvasCenterY,
                        horizontalOffset: canvasCenterX - centerX,
                        verticalOffset: canvasCenterY - centerY,
                        isHorizontallyCentered: Math.abs(centerX - canvasCenterX) < 10,
                        isVerticallyCentered: Math.abs(centerY - canvasCenterY) < 50
                    });
                    
                    if (rect.right > window.innerWidth || rect.bottom > window.innerHeight) {
                        console.warn('[STAGE-WRAPPER] ⚠️ STAGE OVERFLOW DETECTED!', {
                            screenWidth: window.innerWidth,
                            screenHeight: window.innerHeight,
                            stageRight: rect.right,
                            stageBottom: rect.bottom,
                            overflowRight: rect.right - window.innerWidth,
                            overflowBottom: rect.bottom - window.innerHeight
                        });
                    } else {
                        console.log('[STAGE-WRAPPER] ✓ Stage fits within viewport');
                    }
                    
                    if (Math.abs(centerX - canvasCenterX) >= 10) {
                        console.warn('[STAGE-WRAPPER] ⚠️ Stage is NOT horizontally centered!');
                    } else {
                        console.log('[STAGE-WRAPPER] ✓ Stage is horizontally centered');
                    }
                }
                
                console.log('[STAGE-WRAPPER] ==========================================');
            }, 100);
        }
    }, [isFullScreen, isRendererSupported, loading, stageSize, isMobile]);

    return (
        <Box
            className={classNames(
                styles.stageWrapper,
                {[styles.fullScreen]: isFullScreen}
            )}
            dir={isRtl ? 'rtl' : 'ltr'}
        >
            <Box className={styles.stageMenuWrapper}>
                <StageHeader
                    stageSize={stageSize}
                    vm={vm}
                />
            </Box>
            <Box className={styles.stageCanvasWrapper}>
                {
                    isRendererSupported ?
                        <Stage
                            stageSize={stageSize}
                            vm={vm}
                        /> :
                        null
                }
            </Box>
            {loading ? (
                <Loader isFullScreen={isFullScreen} />
            ) : null}
        </Box>
    );
};

StageWrapperComponent.propTypes = {
    isFullScreen: PropTypes.bool,
    isRendererSupported: PropTypes.bool.isRequired,
    isRtl: PropTypes.bool.isRequired,
    loading: PropTypes.bool,
    stageSize: PropTypes.oneOf(Object.keys(STAGE_DISPLAY_SIZES)).isRequired,
    vm: PropTypes.instanceOf(VM).isRequired
};

export default StageWrapperComponent;
