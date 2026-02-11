import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';
import {defineMessages, injectIntl, intlShape} from 'react-intl';

import GreenFlag from '../green-flag/green-flag.jsx';
import StopAll from '../stop-all/stop-all.jsx';
import TurboMode from '../turbo-mode/turbo-mode.jsx';

import styles from './controls.css';

const messages = defineMessages({
    goTitle: {
        id: 'gui.controls.go',
        defaultMessage: 'Go',
        description: 'Green flag button title'
    },
    stopTitle: {
        id: 'gui.controls.stop',
        defaultMessage: 'Stop',
        description: 'Stop button title'
    }
});

const Controls = function (props) {
    const {
        active,
        className,
        intl,
        onGreenFlagClick,
        onStopAllClick,
        turbo,
        ...componentProps
    } = props;
    
    const isMobile = window.innerWidth <= 767;
    const controlsRef = React.useRef(null);
    
    React.useEffect(() => {
        if (isMobile && controlsRef.current) {
            setTimeout(() => {
                const controlsElement = controlsRef.current;
                const rect = controlsElement.getBoundingClientRect();
                const styles = window.getComputedStyle(controlsElement);
                const parent = controlsElement.parentElement;
                const parentRect = parent ? parent.getBoundingClientRect() : null;
                
                console.log('[CONTROLS] ========== CONTROLS POSITION CHECK ==========');
                console.log('[CONTROLS] Controls container:', {
                    width: rect.width,
                    height: rect.height,
                    top: rect.top,
                    left: rect.left,
                    right: rect.right,
                    bottom: rect.bottom,
                    display: styles.display,
                    visibility: styles.visibility,
                    opacity: styles.opacity,
                    position: styles.position,
                    zIndex: styles.zIndex,
                    isVisible: rect.width > 0 && rect.height > 0 && styles.visibility !== 'hidden' && styles.opacity !== '0'
                });
                
                if (parentRect) {
                    const parentStyles = window.getComputedStyle(parent);
                    console.log('[CONTROLS] Parent container:', {
                        width: parentRect.width,
                        height: parentRect.height,
                        display: parentStyles.display,
                        justifyContent: parentStyles.justifyContent,
                        alignItems: parentStyles.alignItems
                    });
                    
                    const centerX = parentRect.left + (parentRect.width / 2);
                    const controlsCenterX = rect.left + (rect.width / 2);
                    const isCentered = Math.abs(centerX - controlsCenterX) < 10;
                    
                    console.log('[CONTROLS] Centering check:', {
                        parentCenterX: centerX,
                        controlsCenterX: controlsCenterX,
                        difference: Math.abs(centerX - controlsCenterX),
                        isCentered,
                        screenWidth: window.innerWidth,
                        controlsLeftEdge: rect.left,
                        controlsRightEdge: rect.right,
                        isWithinScreen: rect.left >= 0 && rect.right <= window.innerWidth
                    });
                }
                
                // Check individual buttons
                const greenFlag = controlsElement.querySelector('[class*="green-flag"]');
                const stopButton = controlsElement.querySelector('[class*="stop-all"]');
                
                if (greenFlag) {
                    const flagRect = greenFlag.getBoundingClientRect();
                    const flagStyles = window.getComputedStyle(greenFlag);
                    console.log('[CONTROLS] Green flag button:', {
                        width: flagRect.width,
                        height: flagRect.height,
                        top: flagRect.top,
                        left: flagRect.left,
                        display: flagStyles.display,
                        visibility: flagStyles.visibility,
                        isVisible: flagRect.width > 0 && flagRect.height > 0
                    });
                } else {
                    console.warn('[CONTROLS] ⚠️ Green flag button not found!');
                }
                
                if (stopButton) {
                    const stopRect = stopButton.getBoundingClientRect();
                    const stopStyles = window.getComputedStyle(stopButton);
                    console.log('[CONTROLS] Stop button:', {
                        width: stopRect.width,
                        height: stopRect.height,
                        top: stopRect.top,
                        left: stopRect.left,
                        display: stopStyles.display,
                        visibility: stopStyles.visibility,
                        isVisible: stopRect.width > 0 && stopRect.height > 0
                    });
                } else {
                    console.warn('[CONTROLS] ⚠️ Stop button not found!');
                }
                
                console.log('[CONTROLS] =============================================');
            }, 200);
        }
    }, [isMobile, active, turbo]);
    
    return (
        <div
            ref={controlsRef}
            className={classNames(styles.controlsContainer, className)}
            {...componentProps}
        >
            <GreenFlag
                active={active}
                title={intl.formatMessage(messages.goTitle)}
                onClick={onGreenFlagClick}
            />
            <StopAll
                active={active}
                title={intl.formatMessage(messages.stopTitle)}
                onClick={onStopAllClick}
            />
            {turbo ? (
                <TurboMode />
            ) : null}
        </div>
    );
};

Controls.propTypes = {
    active: PropTypes.bool,
    className: PropTypes.string,
    intl: intlShape.isRequired,
    onGreenFlagClick: PropTypes.func.isRequired,
    onStopAllClick: PropTypes.func.isRequired,
    turbo: PropTypes.bool
};

Controls.defaultProps = {
    active: false,
    turbo: false
};

export default injectIntl(Controls);
