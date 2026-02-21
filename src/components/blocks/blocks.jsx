import PropTypes from 'prop-types';
import classNames from 'classnames';
import React from 'react';
import {FormattedMessage} from 'react-intl';
import Box from '../box/box.jsx';
import styles from './blocks.css';

const BlocksComponent = props => {
    const {
        containerRef,
        dragOver,
        isFlyoutVisible,
        onCloseFlyout,
        onCloseBlocks: _onCloseBlocks, // consumed to avoid leaking unknown prop to DOM
        mobileDeletePosition,
        onMobileDelete,
        onCancelMobileDelete,
        ...componentProps
    } = props;

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
            {/* Mobile delete button - shows on long press */}
            {mobileDeletePosition && (
                <>
                    <div
                        className={styles.mobileDeleteOverlay}
                        onClick={onCancelMobileDelete}
                        onTouchEnd={e => {
                            e.preventDefault();
                            e.stopPropagation();
                            onCancelMobileDelete();
                        }}
                    />
                    <button
                        className={styles.mobileDeleteButton}
                        style={{
                            left: `${mobileDeletePosition.x}px`,
                            top: `${mobileDeletePosition.y}px`,
                            transform: 'translate(-50%, -120%)'
                        }}
                        onClick={onMobileDelete}
                        onTouchEnd={e => {
                            e.preventDefault();
                            e.stopPropagation();
                            onMobileDelete();
                        }}
                        aria-label="Delete block"
                    >
                        <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <polyline points="3 6 5 6 21 6" />
                            <path
                                d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                            />
                            <line
                                x1="10"
                                y1="11"
                                x2="10"
                                y2="17"
                            />
                            <line
                                x1="14"
                                y1="11"
                                x2="14"
                                y2="17"
                            />
                        </svg>
                        <FormattedMessage
                            defaultMessage="Delete"
                            description="Delete block button"
                            id="gui.blocks.delete"
                        />
                    </button>
                </>
            )}
        </Box>
    );
};
BlocksComponent.propTypes = {
    containerRef: PropTypes.func,
    dragOver: PropTypes.bool,
    isFlyoutVisible: PropTypes.bool,
    mobileDeletePosition: PropTypes.shape({
        x: PropTypes.number,
        y: PropTypes.number
    }),
    onCancelMobileDelete: PropTypes.func,
    onCloseFlyout: PropTypes.func,
    onMobileDelete: PropTypes.func
};
export default BlocksComponent;
