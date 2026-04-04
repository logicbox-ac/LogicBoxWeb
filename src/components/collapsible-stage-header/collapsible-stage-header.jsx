import PropTypes from 'prop-types';
import React from 'react';
import classNames from 'classnames';
import {FormattedMessage} from 'react-intl';
import styles from './collapsible-stage-header.css';

const CollapsibleStageHeader = ({isCollapsed, onToggle}) => {
    const handleClick = (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (onToggle) {
            onToggle();
        }
    };

    return (
        <div className={styles.header}>
            <button
                className={styles.toggleButton}
                onClick={handleClick}
                onTouchStart={handleClick}
                aria-expanded={!isCollapsed}
                aria-label={isCollapsed ? 'Expand stage' : 'Collapse stage'}
                type="button"
            >
                <span className={styles.icon}>
                    {isCollapsed ? '▼' : '▲'}
                </span>
                <span className={styles.label}>
                    <FormattedMessage
                        defaultMessage="Stage Preview"
                        description="Label for collapsible stage section"
                        id="gui.collapsibleStage.label"
                    />
                </span>
            </button>
        </div>
    );
};

CollapsibleStageHeader.propTypes = {
    isCollapsed: PropTypes.bool.isRequired,
    onToggle: PropTypes.func.isRequired
};

export default CollapsibleStageHeader;
