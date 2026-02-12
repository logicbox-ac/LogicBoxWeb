import PropTypes from 'prop-types';
import React from 'react';
import classNames from 'classnames';
import {FormattedMessage} from 'react-intl';
import styles from './collapsible-paint-controls.css';

const CollapsiblePaintControls = ({isCollapsed, onToggle}) => {
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
                aria-expanded={!isCollapsed}
                aria-label={isCollapsed ? 'Expand paint controls' : 'Collapse paint controls'}
                type="button"
            >
                <span className={styles.icon}>
                    {isCollapsed ? '▶' : '◀'}
                </span>
                <span className={styles.label}>
                    <FormattedMessage
                        defaultMessage="Tools"
                        description="Label for collapsible paint controls"
                        id="gui.collapsiblePaintControls.label"
                    />
                </span>
            </button>
        </div>
    );
};

CollapsiblePaintControls.propTypes = {
    isCollapsed: PropTypes.bool.isRequired,
    onToggle: PropTypes.func.isRequired
};

export default CollapsiblePaintControls;
