import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';
import { defineMessages, injectIntl, intlShape } from 'react-intl';
import VM from 'scratch-vm';

import backdropLibraryContent from '../lib/libraries/backdrops.json';
import backdropTags from '../lib/libraries/backdrop-tags';
import LibraryComponent from '../components/library/library.jsx';

const messages = defineMessages({
    libraryTitle: {
        defaultMessage: 'Choose a Backdrop',
        description: 'Heading for the backdrop library',
        id: 'gui.costumeLibrary.chooseABackdrop'
    }
});


class BackdropLibrary extends React.Component {
    constructor(props) {
        super(props);
        bindAll(this, [
            'handleItemSelect'
        ]);
    }
    handleItemSelect(item) {
        console.log('[BACKDROP-LIBRARY] handleItemSelect called with item:', {
            name: item?.name,
            md5ext: item?.md5ext,
            rotationCenterX: item?.rotationCenterX,
            rotationCenterY: item?.rotationCenterY
        });

        if (!item) {
            console.error('[BACKDROP-LIBRARY] ERROR: item is undefined or null!');
            return;
        }

        const vmBackdrop = {
            name: item.name,
            rotationCenterX: item.rotationCenterX,
            rotationCenterY: item.rotationCenterY,
            bitmapResolution: item.bitmapResolution,
            skinId: null
        };

        console.log('[BACKDROP-LIBRARY] Calling vm.addBackdrop with:', {
            md5ext: item.md5ext,
            vmBackdrop: vmBackdrop
        });

        const result = this.props.vm.addBackdrop(item.md5ext, vmBackdrop);

        console.log('[BACKDROP-LIBRARY] vm.addBackdrop returned:', result);

        if (result && typeof result.then === 'function') {
            result
                .then(res => {
                    console.log('[BACKDROP-LIBRARY] Promise resolved:', res);
                })
                .catch(err => {
                    console.error('[BACKDROP-LIBRARY] Promise rejected:', err);
                });
        }
    }
    render() {
        return (
            <LibraryComponent
                data={backdropLibraryContent}
                id="backdropLibrary"
                tags={backdropTags}
                title={this.props.intl.formatMessage(messages.libraryTitle)}
                onItemSelected={this.handleItemSelect}
                onRequestClose={this.props.onRequestClose}
            />
        );
    }
}

BackdropLibrary.propTypes = {
    intl: intlShape.isRequired,
    onRequestClose: PropTypes.func,
    vm: PropTypes.instanceOf(VM).isRequired
};

export default injectIntl(BackdropLibrary);
