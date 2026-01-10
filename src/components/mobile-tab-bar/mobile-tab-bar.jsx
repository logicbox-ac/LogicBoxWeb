/**
 * MobileTabBar Component
 *
 * Provides a tab-based navigation for mobile screens to switch between
 * Code (blocks), Stage, and Files (sprites/costumes/sounds) panels.
 * Hidden on desktop screens via CSS media query.
 */

import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';
import {FormattedMessage} from 'react-intl';

import styles from './mobile-tab-bar.css';

const MobileTabBar = ({activeTab, onTabChange}) => {
    const handleCodeClick = () => onTabChange('code');
    const handleCostumesClick = () => onTabChange('costumes');
    const handleSoundsClick = () => onTabChange('sounds');
    const handleStageClick = () => onTabChange('stage');
    const handleFilesClick = () => onTabChange('files');

    return (
        <nav
            className={styles.tabBar}
            role="tablist"
            aria-label="Editor panels"
        >
            <button
                className={classNames(
                    styles.tab,
                    {[styles.active]: activeTab === 'code'}
                )}
                onClick={handleCodeClick}
                role="tab"
                aria-selected={activeTab === 'code'}
                aria-controls="panel-code"
                tabIndex={activeTab === 'code' ? 0 : -1}
            >
                <span className={styles.tabIcon}>{'🧩'}</span>
                <span className={styles.tabLabel}>
                    <FormattedMessage
                        defaultMessage="Code"
                        description="Mobile tab bar code tab"
                        id="gui.mobileTabBar.code"
                    />
                </span>
            </button>
            <button
                className={classNames(
                    styles.tab,
                    {[styles.active]: activeTab === 'costumes'}
                )}
                onClick={handleCostumesClick}
                role="tab"
                aria-selected={activeTab === 'costumes'}
                aria-controls="panel-costumes"
                tabIndex={activeTab === 'costumes' ? 0 : -1}
            >
                <span className={styles.tabIcon}>{'🎨'}</span>
                <span className={styles.tabLabel}>
                    <FormattedMessage
                        defaultMessage="Costumes"
                        description="Mobile tab bar costumes tab"
                        id="gui.mobileTabBar.costumes"
                    />
                </span>
            </button>
            <button
                className={classNames(
                    styles.tab,
                    {[styles.active]: activeTab === 'sounds'}
                )}
                onClick={handleSoundsClick}
                role="tab"
                aria-selected={activeTab === 'sounds'}
                aria-controls="panel-sounds"
                tabIndex={activeTab === 'sounds' ? 0 : -1}
            >
                <span className={styles.tabIcon}>{'🔊'}</span>
                <span className={styles.tabLabel}>
                    <FormattedMessage
                        defaultMessage="Sounds"
                        description="Mobile tab bar sounds tab"
                        id="gui.mobileTabBar.sounds"
                    />
                </span>
            </button>
            <button
                className={classNames(
                    styles.tab,
                    {[styles.active]: activeTab === 'stage'}
                )}
                onClick={handleStageClick}
                role="tab"
                aria-selected={activeTab === 'stage'}
                aria-controls="panel-stage"
                tabIndex={activeTab === 'stage' ? 0 : -1}
            >
                <span className={styles.tabIcon}>{'🎬'}</span>
                <span className={styles.tabLabel}>
                    <FormattedMessage
                        defaultMessage="Stage"
                        description="Mobile tab bar stage tab"
                        id="gui.mobileTabBar.stage"
                    />
                </span>
            </button>
            <button
                className={classNames(
                    styles.tab,
                    {[styles.active]: activeTab === 'files'}
                )}
                onClick={handleFilesClick}
                role="tab"
                aria-selected={activeTab === 'files'}
                aria-controls="panel-files"
                tabIndex={activeTab === 'files' ? 0 : -1}
            >
                <span className={styles.tabIcon}>{'📁'}</span>
                <span className={styles.tabLabel}>
                    <FormattedMessage
                        defaultMessage="Files"
                        description="Mobile tab bar files tab"
                        id="gui.mobileTabBar.files"
                    />
                </span>
            </button>
        </nav>
    );
};

MobileTabBar.propTypes = {
    activeTab: PropTypes.string.isRequired,
    onTabChange: PropTypes.func.isRequired
};

export default MobileTabBar;
