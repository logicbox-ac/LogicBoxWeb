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

class MobileTabBar extends React.Component {
    constructor (props) {
        super(props);
        this.handleCodeClick = this.handleCodeClick.bind(this);
        this.handleCostumesClick = this.handleCostumesClick.bind(this);
        this.handleSoundsClick = this.handleSoundsClick.bind(this);
        this.handleStageClick = this.handleStageClick.bind(this);
        this.handleFilesClick = this.handleFilesClick.bind(this);
    }
    handleCodeClick () {
        this.props.onTabChange('code');
    }
    handleCostumesClick () {
        this.props.onTabChange('costumes');
    }
    handleSoundsClick () {
        this.props.onTabChange('sounds');
    }
    handleStageClick () {
        this.props.onTabChange('stage');
    }
    handleFilesClick () {
        this.props.onTabChange('files');
    }
    render () {
        const {activeTab} = this.props;
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
                    onClick={this.handleCodeClick}
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
                    onClick={this.handleCostumesClick}
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
                    onClick={this.handleSoundsClick}
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
                    onClick={this.handleStageClick}
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
                    onClick={this.handleFilesClick}
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
    }
}

MobileTabBar.propTypes = {
    activeTab: PropTypes.string.isRequired,
    onTabChange: PropTypes.func.isRequired
};

export default MobileTabBar;
