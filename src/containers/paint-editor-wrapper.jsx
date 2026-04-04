import PropTypes from 'prop-types';
import React from 'react';
import bindAll from 'lodash.bindall';
import VM from 'scratch-vm';
import PaintEditor from 'scratch-paint';
import {inlineSvgFonts} from 'scratch-svg-renderer';

import {connect} from 'react-redux';

class PaintEditorWrapper extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleUpdateImage',
            'handleUpdateName',
            'triggerPaintLayoutSync'
        ]);
    }

    componentDidMount () {
        this.triggerPaintLayoutSync();
    }

    componentDidUpdate (prevProps) {
        if (
            prevProps.imageId !== this.props.imageId ||
            prevProps.selectedCostumeIndex !== this.props.selectedCostumeIndex
        ) {
            this.triggerPaintLayoutSync();
        }
    }

    triggerPaintLayoutSync () {
        if (typeof window === 'undefined') return;

        const emitResize = () => window.dispatchEvent(new Event('resize'));

        window.requestAnimationFrame(emitResize);
        window.setTimeout(emitResize, 120);
    }

    handleUpdateName (name) {
        this.props.vm.renameCostume(this.props.selectedCostumeIndex, name);
    }

    handleUpdateImage (isVector, image, rotationCenterX, rotationCenterY) {
        if (isVector) {
            this.props.vm.updateSvg(
                this.props.selectedCostumeIndex,
                image,
                rotationCenterX,
                rotationCenterY
            );
        } else {
            this.props.vm.updateBitmap(
                this.props.selectedCostumeIndex,
                image,
                rotationCenterX,
                rotationCenterY,
                2 /* bitmapResolution */
            );
        }
    }

    render () {
        if (!this.props.imageId) return null;

        const {
            selectedCostumeIndex,
            vm,
            ...componentProps
        } = this.props;

        return (
            <PaintEditor
                {...componentProps}
                image={vm.getCostume(selectedCostumeIndex)}
                onUpdateImage={this.handleUpdateImage}
                onUpdateName={this.handleUpdateName}
                fontInlineFn={inlineSvgFonts}
            />
        );
    }
}

PaintEditorWrapper.propTypes = {
    imageFormat: PropTypes.string.isRequired,
    imageId: PropTypes.string.isRequired,
    name: PropTypes.string,
    rotationCenterX: PropTypes.number,
    rotationCenterY: PropTypes.number,
    rtl: PropTypes.bool,
    selectedCostumeIndex: PropTypes.number.isRequired,
    vm: PropTypes.instanceOf(VM)
};

const mapStateToProps = (state, {selectedCostumeIndex}) => {
    const targetId = state.scratchGui.vm.editingTarget.id;
    const sprite = state.scratchGui.vm.editingTarget.sprite;
    const index = selectedCostumeIndex < sprite.costumes.length ?
        selectedCostumeIndex : sprite.costumes.length - 1;
    const costume = state.scratchGui.vm.editingTarget.sprite.costumes[index];
    return {
        name: costume && costume.name,
        rotationCenterX: costume && costume.rotationCenterX,
        rotationCenterY: costume && costume.rotationCenterY,
        imageFormat: costume && costume.dataFormat,
        imageId: targetId && costume ? `${targetId}${costume.skinId}` : null,
        rtl: state.locales.isRtl,
        selectedCostumeIndex: index,
        vm: state.scratchGui.vm,
        zoomLevelId: targetId
    };
};

export default connect(
    mapStateToProps
)(PaintEditorWrapper);
