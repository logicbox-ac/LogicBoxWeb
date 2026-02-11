import classNames from 'classnames';
import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';
import {defineMessages, injectIntl, intlShape} from 'react-intl';

import LibraryItem from '../../containers/library-item.jsx';
import Modal from '../../containers/modal.jsx';
import Divider from '../divider/divider.jsx';
import Filter from '../filter/filter.jsx';
import TagButton from '../../containers/tag-button.jsx';
import Spinner from '../spinner/spinner.jsx';
import {CATEGORIES} from '../../../src/lib/libraries/decks/index.jsx';

import styles from './library.css';

const messages = defineMessages({
    filterPlaceholder: {
        id: 'gui.library.filterPlaceholder',
        defaultMessage: 'Search',
        description: 'Placeholder text for library search field'
    },
    allTag: {
        id: 'gui.library.allTag',
        defaultMessage: 'All',
        description: 'Label for library tag to revert to all items after filtering by tag.'
    },
    // Strings here need to be defined statically
    // https://formatjs.io/docs/getting-started/message-declaration/#pre-declaring-using-definemessage-for-later-consumption-less-recommended
    [CATEGORIES.gettingStarted]: {
        id: `gui.library.gettingStarted`,
        defaultMessage: 'Getting Started',
        description: 'Label for getting started category'
    },
    [CATEGORIES.basics]: {
        id: `gui.library.basics`,
        defaultMessage: 'Basics',
        description: 'Label for basics category'
    },
    [CATEGORIES.intermediate]: {
        id: `gui.library.intermediate`,
        defaultMessage: 'Intermediate',
        description: 'Label for intermediate category'
    },
    [CATEGORIES.prompts]: {
        id: `gui.library.prompts`,
        defaultMessage: 'Prompts',
        description: 'Label for prompts category'
    }
});

const ALL_TAG = {tag: 'all', intlLabel: messages.allTag};
const tagListPrefix = [ALL_TAG];

class LibraryComponent extends React.Component {
    constructor(props) {
        super(props);
        bindAll(this, [
            'handleClose',
            'handleFilterChange',
            'handleFilterClear',
            'handleMouseEnter',
            'handleMouseLeave',
            'handlePlayingEnd',
            'handleSelect',
            'handleTagClick',
            'setFilteredDataRef'
        ]);
        this.state = {
            playingItem: null,
            filterQuery: '',
            selectedTag: ALL_TAG.tag,
            loaded: false
        };
    }
    componentDidMount () {
        // Allow the spinner to display before loading the content
        setTimeout(() => {
            this.setState({loaded: true});
            
            // Log mobile layout info after content loads
            if (window.innerWidth <= 767) {
                setTimeout(() => {
                    this.logMobileLayout();
                }, 100);
            }
        });
        if (this.props.setStopHandler) this.props.setStopHandler(this.handlePlayingEnd);
    }
    componentDidUpdate (prevProps, prevState) {
        if (prevState.filterQuery !== this.state.filterQuery ||
            prevState.selectedTag !== this.state.selectedTag) {
            this.scrollToTop();
            
            // Log mobile layout after filter/tag changes
            if (window.innerWidth <= 767) {
                setTimeout(() => {
                    this.logMobileLayout();
                }, 100);
            }
        }
    }
    handleSelect (id) {
        const filteredData = this.getFilteredData();
        const selectedItem = filteredData.find(item => this.constructKey(item) === id);

        if (!selectedItem || !this.props.onItemSelected) {
            return;
        }

        this.handleClose();
        this.props.onItemSelected(selectedItem);
    }
    handleClose () {
        this.props.onRequestClose();
    }
    handleTagClick (tag) {
        if (this.state.playingItem === null) {
            this.setState({
                filterQuery: '',
                selectedTag: tag.toLowerCase()
            });
        } else {
            this.props.onItemMouseLeave((this.getFilteredData()
                .find(item => this.constructKey(item) === this.state.playingItem)));
            this.setState({
                filterQuery: '',
                playingItem: null,
                selectedTag: tag.toLowerCase()
            });
        }
    }
    handleMouseEnter (id) {
        // don't restart if mouse over already playing item
        if (this.props.onItemMouseEnter && this.state.playingItem !== id) {
            this.props.onItemMouseEnter(this.getFilteredData()
                .find(item => this.constructKey(item) === id));
            this.setState({
                playingItem: id
            });
        }
    }
    handleMouseLeave (id) {
        if (this.props.onItemMouseLeave) {
            this.props.onItemMouseLeave(this.getFilteredData()
                .find(item => this.constructKey(item) === id));
            this.setState({
                playingItem: null
            });
        }
    }
    handlePlayingEnd () {
        if (this.state.playingItem !== null) {
            this.setState({
                playingItem: null
            });
        }
    }
    handleFilterChange (event) {
        if (this.state.playingItem === null) {
            this.setState({
                filterQuery: event.target.value,
                selectedTag: ALL_TAG.tag
            });
        } else {
            this.props.onItemMouseLeave(this.getFilteredData()
                .find(item => this.constructKey(item) === this.state.playingItem));
            this.setState({
                filterQuery: event.target.value,
                playingItem: null,
                selectedTag: ALL_TAG.tag
            });
        }
    }
    handleFilterClear () {
        this.setState({filterQuery: ''});
    }
    getFilteredData () {
        if (this.state.selectedTag === ALL_TAG.tag) {
            if (!this.state.filterQuery) return this.props.data;
            return this.props.data.filter(dataItem => (
                (dataItem.tags || [])
                    // Second argument to map sets `this`
                    .map(String.prototype.toLowerCase.call, String.prototype.toLowerCase)
                    .concat(dataItem.name ?
                        (typeof dataItem.name === 'string' ?
                            // Use the name if it is a string, else use formatMessage to get the translated name
                            dataItem.name : this.props.intl.formatMessage(dataItem.name.props)
                        ).toLowerCase() :
                        null)
                    .join('\n') // unlikely to partially match newlines
                    .indexOf(this.state.filterQuery.toLowerCase()) !== -1
            ));
        }
        return this.props.data.filter(dataItem => (
            dataItem.tags &&
            dataItem.tags
                .map(String.prototype.toLowerCase.call, String.prototype.toLowerCase)
                .indexOf(this.state.selectedTag) !== -1
        ));
    }
    constructKey (data) {
        return typeof data.name === 'string' ? data.name : data.rawURL;
    }
    scrollToTop () {
        this.filteredDataRef.scrollTop = 0;
    }
    setFilteredDataRef (ref) {
        this.filteredDataRef = ref;
    }
    logMobileLayout () {
        if (!this.filteredDataRef) return;
        
        const gridContainer = this.filteredDataRef;
        const gridItems = gridContainer.querySelectorAll('[class*="library-item"]');
        const categories = gridContainer.querySelectorAll('[class*="libraryCategory"]');
        const categoryItems = gridContainer.querySelectorAll('[class*="libraryCategoryItems"]');
        
        console.log('[MOBILE-LAYOUT] ========== SCREEN & VIEWPORT ==========');
        console.log('[MOBILE-LAYOUT] Screen dimensions:', {
            screenWidth: window.innerWidth,
            screenHeight: window.innerHeight,
            devicePixelRatio: window.devicePixelRatio
        });
        console.log('[MOBILE-LAYOUT] Viewport:', {
            innerWidth: window.innerWidth,
            innerHeight: window.innerHeight,
            outerWidth: window.outerWidth,
            outerHeight: window.outerHeight
        });
        
        console.log('[MOBILE-LAYOUT] ========== GRID CONTAINER ==========');
        const gridRect = gridContainer.getBoundingClientRect();
        const gridStyles = window.getComputedStyle(gridContainer);
        console.log('[MOBILE-LAYOUT] Grid container dimensions:', {
            width: gridRect.width,
            height: gridRect.height,
            top: gridRect.top,
            left: gridRect.left,
            right: gridRect.right,
            bottom: gridRect.bottom
        });
        console.log('[MOBILE-LAYOUT] Grid container computed styles:', {
            display: gridStyles.display,
            flexWrap: gridStyles.flexWrap,
            justifyContent: gridStyles.justifyContent,
            alignContent: gridStyles.alignContent,
            padding: gridStyles.padding,
            gap: gridStyles.gap,
            overflow: gridStyles.overflow,
            overflowY: gridStyles.overflowY
        });
        console.log('[MOBILE-LAYOUT] Grid scroll info:', {
            scrollHeight: gridContainer.scrollHeight,
            clientHeight: gridContainer.clientHeight,
            scrollTop: gridContainer.scrollTop,
            isScrollable: gridContainer.scrollHeight > gridContainer.clientHeight,
            scrollableAmount: gridContainer.scrollHeight - gridContainer.clientHeight
        });
        
        if (categories.length > 0) {
            console.log('[MOBILE-LAYOUT] ========== CATEGORIES ==========');
            console.log('[MOBILE-LAYOUT] Total categories:', categories.length);
            categories.forEach((cat, idx) => {
                const catRect = cat.getBoundingClientRect();
                const catStyles = window.getComputedStyle(cat);
                const title = cat.querySelector('[class*="libraryCategoryTitle"]');
                console.log(`[MOBILE-LAYOUT] Category ${idx + 1}:`, {
                    title: title ? title.textContent : 'No title',
                    width: catRect.width,
                    height: catRect.height,
                    display: catStyles.display,
                    flexDirection: catStyles.flexDirection,
                    isVisible: catRect.width > 0 && catRect.height > 0
                });
            });
        }
        
        if (categoryItems.length > 0) {
            console.log('[MOBILE-LAYOUT] ========== CATEGORY ITEMS CONTAINERS ==========');
            categoryItems.forEach((container, idx) => {
                const containerRect = container.getBoundingClientRect();
                const containerStyles = window.getComputedStyle(container);
                const itemsInContainer = container.querySelectorAll('[class*="library-item"]');
                console.log(`[MOBILE-LAYOUT] Category items container ${idx + 1}:`, {
                    width: containerRect.width,
                    height: containerRect.height,
                    display: containerStyles.display,
                    flexWrap: containerStyles.flexWrap,
                    gap: containerStyles.gap,
                    itemCount: itemsInContainer.length
                });
            });
        }
        
        console.log('[MOBILE-LAYOUT] ========== GRID ITEMS ==========');
        console.log('[MOBILE-LAYOUT] Total items rendered:', gridItems.length);
        
        if (gridItems.length > 0) {
            // Sample first 3 items for detailed info
            const sampleItems = Array.from(gridItems).slice(0, 3);
            sampleItems.forEach((item, idx) => {
                const itemRect = item.getBoundingClientRect();
                const itemStyles = window.getComputedStyle(item);
                console.log(`[MOBILE-LAYOUT] Sample item ${idx + 1}:`, {
                    width: itemRect.width,
                    height: itemRect.height,
                    top: itemRect.top,
                    left: itemRect.left,
                    display: itemStyles.display,
                    flexBasis: itemStyles.flexBasis,
                    flexGrow: itemStyles.flexGrow,
                    flexShrink: itemStyles.flexShrink,
                    margin: itemStyles.margin,
                    padding: itemStyles.padding,
                    boxSizing: itemStyles.boxSizing
                });
            });
            
            // Check if items are fitting in viewport
            const itemsInViewport = Array.from(gridItems).filter(item => {
                const rect = item.getBoundingClientRect();
                return rect.top >= 0 && rect.left >= 0 && 
                       rect.bottom <= window.innerHeight && 
                       rect.right <= window.innerWidth;
            });
            
            console.log('[MOBILE-LAYOUT] Items visibility:', {
                totalItems: gridItems.length,
                itemsFullyInViewport: itemsInViewport.length,
                itemsOutsideViewport: gridItems.length - itemsInViewport.length
            });
            
            // Check horizontal overflow
            const itemsOverflowingRight = Array.from(gridItems).filter(item => {
                const rect = item.getBoundingClientRect();
                return rect.right > window.innerWidth;
            });
            
            if (itemsOverflowingRight.length > 0) {
                console.warn('[MOBILE-LAYOUT] ⚠️ HORIZONTAL OVERFLOW DETECTED!', {
                    itemsOverflowing: itemsOverflowingRight.length,
                    screenWidth: window.innerWidth,
                    sampleOverflowItem: {
                        right: itemsOverflowingRight[0].getBoundingClientRect().right,
                        width: itemsOverflowingRight[0].getBoundingClientRect().width
                    }
                });
            } else {
                console.log('[MOBILE-LAYOUT] ✓ No horizontal overflow - all items fit within screen width');
            }
        }
        
        console.log('[MOBILE-LAYOUT] ========================================');
    }
    renderElement (data) {
        const key = this.constructKey(data);
        return (<LibraryItem
            bluetoothRequired={data.bluetoothRequired}
            collaborator={data.collaborator}
            description={data.description}
            disabled={data.disabled}
            extensionId={data.extensionId}
            featured={data.featured}
            hidden={data.hidden}
            iconMd5={data.costumes ? data.costumes[0].md5ext : data.md5ext}
            iconRawURL={data.rawURL}
            icons={data.costumes}
            id={key}
            insetIconURL={data.insetIconURL}
            internetConnectionRequired={data.internetConnectionRequired}
            isPlaying={this.state.playingItem === key}
            key={key}
            name={data.name}
            showPlayButton={this.props.showPlayButton}
            onMouseEnter={this.handleMouseEnter}
            onMouseLeave={this.handleMouseLeave}
            onSelect={this.handleSelect}
        />);
    }
    renderData (data) {
        const isMobile = window.innerWidth <= 767;
        
        if (isMobile) {
            console.log('[MOBILE-LIBRARY] Rendering in mobile view:', {
                screenWidth: window.innerWidth,
                dataLength: data.length,
                selectedTag: this.state.selectedTag,
                withCategories: this.props.withCategories
            });
        }

        if (this.state.selectedTag !== ALL_TAG.tag || !this.props.withCategories) {
            const items = data.map(item => this.renderElement(item));
            
            if (isMobile) {
                console.log('[MOBILE-LIBRARY] Rendering without categories - grid view:', {
                    itemCount: items.length,
                    renderMode: 'direct-grid'
                });
            }
            
            return items;
        }

        const dataByCategory = Object.groupBy(data, el => el.category);
        const categoriesOrder = Object.values(CATEGORIES);
        
        if (isMobile) {
            console.log('[MOBILE-LIBRARY] Rendering with categories:', {
                categories: Object.keys(dataByCategory),
                itemsPerCategory: Object.entries(dataByCategory).map(([key, values]) => ({
                    category: key,
                    count: values.length
                }))
            });
        }

        return Object.entries(dataByCategory)
            .sort(([key1], [key2]) => categoriesOrder.indexOf(key1) - categoriesOrder.indexOf(key2))
            .map(([key, values]) =>
                (<div
                    key={key}
                    className={styles.libraryCategory}
                >
                    {key === 'undefined' ?
                        null :
                        <span className={styles.libraryCategoryTitle}>
                            {this.props.intl.formatMessage(messages[key])}
                        </span>
                    }
                    <div
                        className={styles.libraryCategoryItems}
                    >
                        {values.map(item => this.renderElement(item))}
                    </div>
                </div>));
    }
    render () {
        const isMobile = window.innerWidth <= 767;
        const filteredData = this.getFilteredData();
        
        if (isMobile) {
            console.log('[MOBILE-LIBRARY] ========== RENDER START ==========');
            console.log('[MOBILE-LIBRARY] Render called:', {
                screenWidth: window.innerWidth,
                id: this.props.id,
                title: this.props.title,
                filteredDataCount: filteredData.length,
                loaded: this.state.loaded,
                hasFilterBar: this.props.filterable || this.props.tags,
                selectedTag: this.state.selectedTag,
                filterQuery: this.state.filterQuery
            });
        }

        return (
            <Modal
                fullScreen
                contentLabel={this.props.title}
                id={this.props.id}
                onRequestClose={this.handleClose}
            >
                {(this.props.filterable || this.props.tags) && (
                    <div className={styles.filterBar}>
                        {this.props.filterable && (
                            <Filter
                                className={classNames(
                                    styles.filterBarItem,
                                    styles.filter
                                )}
                                filterQuery={this.state.filterQuery}
                                inputClassName={styles.filterInput}
                                placeholderText={this.props.intl.formatMessage(messages.filterPlaceholder)}
                                onChange={this.handleFilterChange}
                                onClear={this.handleFilterClear}
                            />
                        )}
                        {this.props.filterable && this.props.tags && (
                            <Divider className={classNames(styles.filterBarItem, styles.divider)} />
                        )}
                        {this.props.tags &&
                            <div className={styles.tagWrapper}>
                                {tagListPrefix.concat(this.props.tags).map((tagProps, id) => (
                                    <TagButton
                                        active={this.state.selectedTag === tagProps.tag.toLowerCase()}
                                        className={classNames(
                                            styles.filterBarItem,
                                            styles.tagButton,
                                            tagProps.className
                                        )}
                                        key={`tag-button-${id}`}
                                        onClick={this.handleTagClick}
                                        {...tagProps}
                                    />
                                ))}
                            </div>
                        }
                    </div>
                )}
                <div
                    className={classNames(styles.libraryScrollGrid, {
                        [styles.withFilterBar]: this.props.filterable || this.props.tags
                    })}
                    ref={this.setFilteredDataRef}
                >
                    {this.state.loaded ? this.renderData(filteredData) : (
                        <div className={styles.spinnerWrapper}>
                            <Spinner
                                large
                                level="primary"
                            />
                        </div>
                    )}
                </div>
            </Modal>
        );
    }
}

LibraryComponent.propTypes = {
    data: PropTypes.arrayOf(
        /* eslint-disable react/no-unused-prop-types, lines-around-comment */
        // An item in the library
        PropTypes.shape({
            // @todo remove md5/rawURL prop from library, refactor to use storage
            md5: PropTypes.string,
            name: PropTypes.oneOfType([
                PropTypes.string,
                PropTypes.node
            ]),
            rawURL: PropTypes.string
        })
        /* eslint-enable react/no-unused-prop-types, lines-around-comment */
    ),
    filterable: PropTypes.bool,
    withCategories: PropTypes.bool,
    id: PropTypes.string.isRequired,
    intl: intlShape.isRequired,
    onItemMouseEnter: PropTypes.func,
    onItemMouseLeave: PropTypes.func,
    onItemSelected: PropTypes.func,
    onRequestClose: PropTypes.func,
    setStopHandler: PropTypes.func,
    showPlayButton: PropTypes.bool,
    tags: PropTypes.arrayOf(PropTypes.shape(TagButton.propTypes)),
    title: PropTypes.string.isRequired
};

LibraryComponent.defaultProps = {
    filterable: true,
    showPlayButton: false
};

export default injectIntl(LibraryComponent);
