import PropTypes from 'prop-types';
import classNames from 'classnames';
import React from 'react';
import Box from '../box/box.jsx';
import styles from './blocks.css';

const BlocksComponent = props => {
    const {
        containerRef,
        dragOver,
        isFlyoutVisible,
        onCloseFlyout,
        ...componentProps
    } = props;
    
    console.log('[BlocksComponent] render - isFlyoutVisible:', isFlyoutVisible);
    
    return (
        <Box
            className={classNames(styles.blocks, {
                [styles.dragOver]: dragOver
            })}
            {...componentProps}
            componentRef={containerRef}
        >
            {isFlyoutVisible && (
                <div
                    className={styles.flyoutCloseButton}
                    onClick={onCloseFlyout}
                    role="button"
                    tabIndex={0}
                    aria-label="Close flyout"
                >
                    <svg
                        width="12"
                        height="12"
                        viewBox="0 0 12 12"
                    >
                        <path
                            d="M10 2L2 10M2 2l8 8"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                        />
                    </svg>
                </div>
            )}
        </Box>
    );
};
BlocksComponent.propTypes = {
    containerRef: PropTypes.func,
    dragOver: PropTypes.bool,
    isFlyoutVisible: PropTypes.bool,
    onCloseFlyout: PropTypes.func
};
export default BlocksComponent;
