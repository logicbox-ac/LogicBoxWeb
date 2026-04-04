// Script to patch scratch-blocks with close button functionality
const fs = require('fs');
const path = require('path');

const scratchBlocksPath = path.join(__dirname, '..', 'node_modules', 'scratch-blocks');
const closeButtonSource = path.join(__dirname, '..', 'patches', 'close_button.js');
const closeIconSource = path.join(__dirname, '..', 'patches', 'close.svg');

// Copy close button files
const closeButtonDest = path.join(scratchBlocksPath, 'core', 'close_button.js');
const closeIconDest = path.join(scratchBlocksPath, 'media', 'close.svg');

// Copy files if they exist
if (fs.existsSync(closeButtonSource)) {
  fs.copyFileSync(closeButtonSource, closeButtonDest);
}

if (fs.existsSync(closeIconSource)) {
  fs.copyFileSync(closeIconSource, closeIconDest);
}

// Ensure the shim file is correct (restore original if needed)
const shimPath = path.join(scratchBlocksPath, 'shim', 'vertical.js');
const correctShimContent = "module.exports = require('imports-loader?Blockly=../shim/blocks_compressed_vertical-blockly_compressed_vertical-messages,goog=../shim/blockly_compressed_vertical.goog!exports-loader?Blockly!../msg/scratch_msgs');\n";

if (fs.existsSync(shimPath)) {
  const currentContent = fs.readFileSync(shimPath, 'utf8');
  if (!currentContent.includes('imports-loader')) {
    fs.writeFileSync(shimPath, correctShimContent);
  }
}

// Patch workspace_svg.js
const workspaceSvgPath = path.join(scratchBlocksPath, 'core', 'workspace_svg.js');
if (fs.existsSync(workspaceSvgPath)) {
  let content = fs.readFileSync(workspaceSvgPath, 'utf8');
  
  // Add require if not already there
  if (!content.includes("goog.require('Blockly.CloseButton')")) {
    content = content.replace(
      "goog.require('Blockly.ZoomControls');",
      "goog.require('Blockly.ZoomControls');\ngoog.require('Blockly.CloseButton');"
    );
  }
  
  // Add addCloseButton_ method if not already there
  if (!content.includes('Blockly.WorkspaceSvg.prototype.addCloseButton_')) {
    const addCloseButtonMethod = `
/**
 * Add close button.
 * @private
 */
Blockly.WorkspaceSvg.prototype.addCloseButton_ = function() {
  /** @type {Blockly.CloseButton} */
  this.closeButton_ = new Blockly.CloseButton(this);
  var svgCloseButton = this.closeButton_.createDom();
  this.svgGroup_.appendChild(svgCloseButton);
  this.closeButton_.init();
};
`;
    // Add after addZoomControls_ - find the closing }; and add after it
    const zoomControlsEnd = content.indexOf('return this.zoomControls_.init(bottom);\n};');
    if (zoomControlsEnd !== -1) {
      const insertPos = zoomControlsEnd + 'return this.zoomControls_.init(bottom);\n};'.length;
      content = content.slice(0, insertPos) + '\n' + addCloseButtonMethod + content.slice(insertPos);
    }
  }
  
  // Add close button initialization
  if (!content.includes('this.addCloseButton_()')) {
    content = content.replace(
      /(if \(this\.options\.zoomOptions && this\.options\.zoomOptions\.controls\) \{\s+this\.addZoomControls_\(bottom\);\s+\})/,
      `$1\n  if (this.options.closeButton) {\n    this.addCloseButton_();\n  }`
    );
  }
  
  // Add close button disposal
  if (!content.includes('this.closeButton_.dispose()')) {
    const disposeCode = `  if (this.closeButton_) {\n    this.closeButton_.dispose();\n    this.closeButton_ = null;\n  }\n`;
    const zoomDisposeEnd = content.indexOf('this.zoomControls_ = null;\n  }');
    if (zoomDisposeEnd !== -1) {
      const insertPos = zoomDisposeEnd + 'this.zoomControls_ = null;\n  }'.length;
      content = content.slice(0, insertPos) + '\n' + disposeCode + content.slice(insertPos);
    }
  }
  
  // Add close button positioning
  if (!content.includes('this.closeButton_.position()')) {
    const positionCode = `  if (this.closeButton_) {\n    this.closeButton_.position();\n  }\n`;
    const zoomPositionEnd = content.indexOf('this.zoomControls_.position();\n  }');
    if (zoomPositionEnd !== -1) {
      const insertPos = zoomPositionEnd + 'this.zoomControls_.position();\n  }'.length;
      content = content.slice(0, insertPos) + '\n' + positionCode + content.slice(insertPos);
    }
  }
  
  fs.writeFileSync(workspaceSvgPath, content);
}
