/*********************************************************************************************************************
 *  Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.                                           *
 *                                                                                                                    *
 *  Licensed under the Amazon Software License (the "License"). You may not use this file except in compliance        *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://aws.amazon.com/asl/                                                                                    *
 *                                                                                                                    *
 *  or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 *********************************************************************************************************************/

function importOriginalImage() {
    // Gather the bucket name and image key
    const bucketName = $(`#txt-bucket-name`).first().val();
    const keyName = $(`#txt-key-name`).first().val();
    // Assemble the image request
    const request = {
        bucket: bucketName,
        key: keyName
    }
    const strRequest = JSON.stringify(request);
    const encRequest = btoa(strRequest);
    // Import the image data into the element
    $(`#img-original`)
        .attr(`src`, `${appVariables.apiEndpoint}/${encRequest}`)
        .attr(`data-bucket`, bucketName)
        .attr(`data-key`, keyName);
}

function getPreviewImage() {
    // Gather the editor inputs
    const _width = $(`#editor-width`).first().val();
    const _height = $(`#editor-height`).first().val();
    const _resize = $(`#editor-resize-mode`).first().val();
    const _fillColor = $(`#editor-fill-color`).first().val();
    const _backgroundColor = $(`#editor-background-color`).first().val();
    const _grayscale = $(`#editor-grayscale`).first().prop("checked");
    const _flip = $(`#editor-flip`).first().prop("checked");
    const _flop = $(`#editor-flop`).first().prop("checked");
    const _negative = $(`#editor-negative`).first().prop("checked");
    const _flatten = $(`#editor-flatten`).first().prop("checked");
    const _normalize = $(`#editor-normalize`).first().prop("checked");
    const _rgb = $(`#editor-rgb`).first().val();
    const _smartCrop = $(`#editor-smart-crop`).first().prop("checked");
    const _smartCropIndex = $(`#editor-smart-crop-index`).first().val();
    const _smartCropPadding = $(`#editor-smart-crop-padding`).first().val();
    // Setup the edits object
    const _edits = {}
    _edits.resize = {};
    if (_resize !== "Disabled") {
        if (_width !== "") { _edits.resize.width = Number(_width) }
        if (_height !== "") { _edits.resize.height = Number(_height) }
        _edits.resize.fit = _resize;
    }
    if (_fillColor !== "") { _edits.resize.background = hexToRgbA(_fillColor, 1) }
    if (_backgroundColor !== "") { _edits.flatten = { background: hexToRgbA(_backgroundColor, undefined) }}
    if (_grayscale) { _edits.grayscale = _grayscale }
    if (_flip) { _edits.flip = _flip }
    if (_flop) { _edits.flop = _flop }
    if (_negative) { _edits.negate = _negative }
    if (_flatten) { _edits.flatten = _flatten }
    if (_normalize) { _edits.normalise = _normalize }
    if (_rgb !== "") { 
        const input = _rgb.replace(/\s+/g, '');
        const arr = input.split(',');
        const rgb = { r: Number(arr[0]), g: Number(arr[1]), b: Number(arr[2]) };
        _edits.tint = rgb
    }
    if (_smartCrop) {
        _edits.smartCrop = {};
        if (_smartCropIndex !== "") { _edits.smartCrop.faceIndex = Number(_smartCropIndex) }
        if (_smartCropPadding !== "") { _edits.smartCrop.padding = Number(_smartCropPadding) }
    }
    if (Object.keys(_edits.resize).length === 0) { delete _edits.resize };
    // Gather the bucket and key names
    const bucketName = $(`#img-original`).first().attr(`data-bucket`);
    const keyName = $(`#img-original`).first().attr(`data-key`);
    // Set up the request body
    const request = {
        bucket: bucketName,
        key: keyName,
        edits: _edits
    }
    if (Object.keys(request.edits).length === 0) { delete request.edits };
    console.log(request);
    // Setup encoded request
    const str = JSON.stringify(request);
    const enc = btoa(str);
    // Fill the preview image
    $(`#img-preview`).attr(`src`, `${appVariables.apiEndpoint}/${enc}`);
    // Fill the request body field
    $(`#preview-request-body`).html(JSON.stringify(request, undefined, 2));
    // Fill the encoded URL field
    $(`#preview-encoded-url`).val(`${appVariables.apiEndpoint}/${enc}`);
}

function hexToRgbA(hex, _alpha) {
    var c;
    if(/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)){
        c= hex.substring(1).split('');
        if(c.length== 3){
            c= [c[0], c[0], c[1], c[1], c[2], c[2]];
        }
        c= '0x'+c.join('');
        return { r: ((c>>16)&255), g: ((c>>8)&255), b: (c&255), alpha: Number(_alpha)};
    }
    throw new Error('Bad Hex');
}

function resetEdits() {
    $('.form-control').val('');
	document.getElementById('editor-resize-mode').selectedIndex = 0;
	$(".form-check-input").prop('checked', false);
}