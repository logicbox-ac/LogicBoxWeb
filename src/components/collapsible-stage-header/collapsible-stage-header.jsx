import PropTypes from 'prop-types';
import React from 'react';
import classNames from 'classnames';
import {FormattedMessage} from 'react-intl';
import styles from './collapsible-stage-header.css';

const CollapsibleStageHeader = ({isCollapsed, onToggle}) => {
    const handleClick = (e) => {
        console.log('[COLLAPSIBLE-HEADER] Button clicked:', {
            isCollapsed,
            hasOnToggle: !!onToggle,
            eventType: e.type,
            target: e.target.tagName
        });
        e.preventDefault();
        e.stopPropagation();
        
        if (onToggle) {
            onToggle();
        } else {
            console.error('[COLLAPSIBLE-HEADER] onToggle is not defined!');
        }
    };

    const handleTouchStart = (e) => {
        console.log('[COLLAPSIBLE-HEADER] Touch start detected');
        handleClick(e);
    };

    console.log('[COLLAPSIBLE-HEADER] Rendering:', {
        isCollapsed,
        hasOnToggle: !!onToggle
    });

    return (
        <div className={styles.header}>
            <button
                className={styles.toggleButton}
                onClick={handleClick}
                onTouchStart={handleTouchStart}
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
