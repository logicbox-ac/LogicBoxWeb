/**
 * @license
 * Visual Blocks Editor
 *
 * Copyright 2024 Massachusetts Institute of Technology
 * https://developers.google.com/blockly/
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview Object representing a close button.
 */
'use strict';

goog.provide('Blockly.CloseButton');

goog.require('Blockly.Touch');
goog.require('goog.dom');


/**
 * Class for a close button.
 * @param {!Blockly.Workspace} workspace The workspace to sit in.
 * @constructor
 */
Blockly.CloseButton = function(workspace) {
  this.workspace_ = workspace;
};

/**
 * Close icon path.
 * @type {string}
 * @private
 */
Blockly.CloseButton.prototype.CLOSE_PATH_ = 'close.svg';

/**
 * Width of the close button.
 * @type {number}
 * @private
 */
Blockly.CloseButton.prototype.WIDTH_ = 36;

/**
 * Height of the close button.
 * @type {number}
 * @private
 */
Blockly.CloseButton.prototype.HEIGHT_ = 36;

/**
 * Distance between close button and top edge of workspace.
 * @type {number}
 * @private
 */
Blockly.CloseButton.prototype.MARGIN_TOP_ = 12;

/**
 * Distance between close button and right edge of workspace.
 * @type {number}
 * @private
 */
Blockly.CloseButton.prototype.MARGIN_SIDE_ = 12;

/**
 * The SVG group containing the close button.
 * @type {Element}
 * @private
 */
Blockly.CloseButton.prototype.svgGroup_ = null;

/**
 * Left coordinate of the close button.
 * @type {number}
 * @private
 */
Blockly.CloseButton.prototype.left_ = 0;

/**
 * Top coordinate of the close button.
 * @type {number}
 * @private
 */
Blockly.CloseButton.prototype.top_ = 0;

/**
 * Create the close button.
 * @return {!Element} The close button SVG group.
 */
Blockly.CloseButton.prototype.createDom = function() {
  this.svgGroup_ =
      Blockly.utils.createSvgElement('g', {'class': 'blocklyCloseButton'}, null);
  this.createCloseSvg_();
  return this.svgGroup_;
};

/**
 * Initialize the close button.
 * @return {number} Height of the close button.
 */
Blockly.CloseButton.prototype.init = function() {
  return this.HEIGHT_;
};

/**
 * Dispose of this close button.
 * Unlink from all DOM elements to prevent memory leaks.
 */
Blockly.CloseButton.prototype.dispose = function() {
  if (this.svgGroup_) {
    goog.dom.removeNode(this.svgGroup_);
    this.svgGroup_ = null;
  }
  this.workspace_ = null;
};

/**
 * Move the close button to the top-right corner.
 */
Blockly.CloseButton.prototype.position = function() {
  var metrics = this.workspace_.getMetrics();
  if (!metrics) {
    // There are no metrics available (workspace is probably not visible).
    return;
  }
  if (this.workspace_.RTL) {
    this.left_ = this.MARGIN_SIDE_ + Blockly.Scrollbar.scrollbarThickness;
    if (metrics.toolboxPosition == Blockly.TOOLBOX_AT_LEFT) {
      this.left_ += metrics.flyoutWidth;
      if (this.workspace_.toolbox_) {
        this.left_ += metrics.absoluteLeft;
      }
    }
  } else {
    this.left_ = metrics.viewWidth + metrics.absoluteLeft -
        this.WIDTH_ - this.MARGIN_SIDE_ - Blockly.Scrollbar.scrollbarThickness;

    if (metrics.toolboxPosition == Blockly.TOOLBOX_AT_RIGHT) {
      this.left_ -= metrics.flyoutWidth;
    }
  }
  this.top_ = metrics.absoluteTop + this.MARGIN_TOP_;
  if (metrics.toolboxPosition == Blockly.TOOLBOX_AT_TOP) {
    this.top_ += metrics.flyoutHeight;
  }
  this.svgGroup_.setAttribute('transform',
      'translate(' + this.left_ + ',' + this.top_ + ')');
};

/**
 * Create the close icon and its event handler.
 * @private
 */
Blockly.CloseButton.prototype.createCloseSvg_ = function() {
  /* This markup will be generated and added to the "blocklyCloseButton" group:
    <image width="36" height="36" xlink:href="../media/close.svg">
    </image>
  */
  var ws = this.workspace_;
  /**
   * Close button control.
   * @type {SVGElement}
   */
  var closeSvg = Blockly.utils.createSvgElement(
      'image',
      {
        'width': this.WIDTH_,
        'height': this.HEIGHT_,
        'x': 0,
        'y': 0
      },
      this.svgGroup_
  );
  closeSvg.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href',
      ws.options.pathToMedia + this.CLOSE_PATH_);

  // Attach listener.
  Blockly.bindEventWithChecks_(closeSvg, 'mousedown', null, function(e) {
    ws.markFocused();
    // Trigger close event - can be handled by parent application
    if (ws.options.closeButtonCallback) {
      ws.options.closeButtonCallback();
    }
    Blockly.Touch.clearTouchIdentifier();  // Don't block future drags.
    e.stopPropagation();  // Don't start a workspace scroll.
    e.preventDefault();  // Stop double-clicking from selecting text.
  });
};
