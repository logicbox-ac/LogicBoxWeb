import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import React from 'react';

import {
    activateDeck,
    closeCards,
    shrinkExpandCards,
    nextStep,
    prevStep,
    dragCard,
    startDrag,
    endDrag,
    setCardsContent
} from '../reducers/cards';

import {
    openTipsLibrary
} from '../reducers/modals';

import CardsComponent from '../components/cards/cards.jsx';
import {loadImageData} from '../lib/libraries/decks/translate-image.js';
import {loadDecksLibrary} from '../lib/libraries/loaders';
import {notScratchDesktop} from '../lib/isScratchDesktop';

class Cards extends React.Component {
    componentDidMount () {
        this.maybeLoadContent();
        if (this.props.locale !== 'en') {
            loadImageData(this.props.locale);
        }
    }
    componentDidUpdate (prevProps) {
        if (
            !this.props.content &&
            (this.props.visible || this.props.activeDeckId) &&
            (
                this.props.visible !== prevProps.visible ||
                this.props.activeDeckId !== prevProps.activeDeckId
            )
        ) {
            this.maybeLoadContent();
        }
        if (this.props.locale !== prevProps.locale) {
            loadImageData(this.props.locale);
        }
    }
    async maybeLoadContent () {
        if (this.props.content || (!this.props.visible && !this.props.activeDeckId)) {
            return;
        }
        const content = await loadDecksLibrary();
        this.props.onLoadCardsContent(content);
    }
    render () {
        return (
            <CardsComponent {...this.props} />
        );
    }
}

Cards.propTypes = {
    activeDeckId: PropTypes.string,
    content: PropTypes.object,
    locale: PropTypes.string.isRequired,
    onLoadCardsContent: PropTypes.func,
    visible: PropTypes.bool
};

const mapStateToProps = state => ({
    visible: state.scratchGui.cards.visible,
    content: state.scratchGui.cards.content,
    activeDeckId: state.scratchGui.cards.activeDeckId,
    step: state.scratchGui.cards.step,
    expanded: state.scratchGui.cards.expanded,
    x: state.scratchGui.cards.x,
    y: state.scratchGui.cards.y,
    isRtl: state.locales.isRtl,
    locale: state.locales.locale,
    dragging: state.scratchGui.cards.dragging,
    showVideos: notScratchDesktop()
});

const mapDispatchToProps = dispatch => ({
    onActivateDeckFactory: id => () => dispatch(activateDeck(id)),
    onLoadCardsContent: content => dispatch(setCardsContent(content)),
    onShowAll: () => {
        dispatch(openTipsLibrary());
        dispatch(closeCards());
    },
    onCloseCards: () => dispatch(closeCards()),
    onShrinkExpandCards: () => dispatch(shrinkExpandCards()),
    onNextStep: () => dispatch(nextStep()),
    onPrevStep: () => dispatch(prevStep()),
    onDrag: (e_, data) => dispatch(dragCard(data.x, data.y)),
    onStartDrag: () => dispatch(startDrag()),
    onEndDrag: () => dispatch(endDrag())
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(Cards);
