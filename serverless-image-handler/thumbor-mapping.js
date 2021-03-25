// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

const Color = require('color');
const ColorName = require('color-name');

class ThumborMapping {

    // Constructor
    constructor() {
        this.edits = {};
    }

    /**
     * Initializer function for creating a new Thumbor mapping, used by the image
     * handler to perform image modifications based on legacy URL path requests.
     * @param {object} event - The request body.
     */
    process(event) {
        // Setup
        this.path = event.path;
        let edits = this.path.match(/filters:[^\)]+/g);
        if (!edits) {
            edits = [];
        }
        const filetype = (this.path.split('.'))[(this.path.split('.')).length - 1];

        // Process the Dimensions
        const dimPath = this.path.match(/\/((\d+x\d+)|(0x\d+))\//g);
        if (dimPath) {
            // Assign dimenions from the first match only to avoid parsing dimension from image file names
            const dims = dimPath[0].replace(/\//g, '').split('x');
            const width = Number(dims[0]);
            const height = Number(dims[1]);

            // Set only if the dimensions provided are valid
            if (!isNaN(width) && !isNaN(height)) {
                this.edits.resize = {};

                // If width or height is 0, fit would be inside.
                if (width === 0 || height === 0) {
                    this.edits.resize.fit = 'inside';
                }
                this.edits.resize.width = width === 0 ? null : width;
                this.edits.resize.height = height === 0 ? null : height;
            }
        }

        // fit-in filter
        if (this.path.includes('fit-in')) {
            if (this.edits.resize === undefined) {
                this.edits.resize = {};
            }
            this.edits.resize.fit = 'inside';
        }

        // Parse the image path
        for (let i = 0; i < edits.length; i++) {
            const edit = `${edits[i]})`;
            this.mapFilter(edit, filetype);
        }

        return this;
    }

    /**
     * Enables users to migrate their current image request model to the SIH solution,
     * without changing their legacy application code to accomodate new image requests.
     * @param {string} path - The URL path extracted from the web request.
     * @return {object} - The parsed path using the match pattern and the substitution.
     */
    parseCustomPath(path) {
        // Setup from the environment variables
        const matchPattern = process.env.REWRITE_MATCH_PATTERN;
        const substitution = process.env.REWRITE_SUBSTITUTION;

        // Perform the substitution and return
        if (path !== undefined && matchPattern !== undefined && substitution !== undefined) {
            let parsedPath = '';

            if (typeof(matchPattern) === 'string') {
                const patternStrings = matchPattern.split('/');
                const flags = patternStrings.pop();
                const parsedPatternString = matchPattern.slice(1, matchPattern.length - 1 - flags.length);
                const regExp = new RegExp(parsedPatternString, flags);
                parsedPath = path.replace(regExp, substitution);
            } else {
                parsedPath = path.replace(matchPattern, substitution);
            }

            return { path: parsedPath };
        } else {
            throw new Error('ThumborMapping::ParseCustomPath::ParsingError');
        }
    }

    /**
     * Scanner function for matching supported Thumbor filters and converting their
     * capabilities into Sharp.js supported operations.
     * @param {string} edit - The URL path filter.
     * @param {string} filetype - The file type of the original image.
     */
    mapFilter(edit, filetype) {
        const matched = edit.match(/:(.+)\((.*)\)/);
        const editKey = matched[1];
        let value = matched[2];
        // Find the proper filter
        if (editKey === ('autojpg')) {
            this.edits.toFormat = 'jpeg';
        } else if (editKey === ('background_color')) {
            if (!ColorName[value]) {
                value = `#${value}`
            }
            this.edits.flatten = { background: Color(value).object() };
        } else if (editKey === ('blur')) {
            const val = value.split(',');
            this.edits.blur = (val.length > 1) ? Number(val[1]) : Number(val[0]) / 2;
        } else if (editKey === ('convolution')) {
            const arr = value.split(',');
            const strMatrix = (arr[0]).split(';');
            let matrix = [];
            strMatrix.forEach(function(str) {
                matrix.push(Number(str));
            });
            const matrixWidth = arr[1];
            let matrixHeight = 0;
            let counter = 0;
            for (let i = 0; i < matrix.length; i++) {
                if (counter === (matrixWidth - 1)) {
                    matrixHeight++;
                    counter = 0;
                } else {
                    counter++;
                }
            }
            this.edits.convolve = {
                width: Number(matrixWidth),
                height: Number(matrixHeight),
                kernel: matrix
            }
        } else if (editKey === ('equalize')) {
            this.edits.normalize = "true";
        } else if (editKey === ('fill')) {
            if (this.edits.resize === undefined) {
                this.edits.resize = {};
            }
            if (!ColorName[value]) {
                value = `#${value}`
            }
            this.edits.resize.fit = 'contain';
            this.edits.resize.background = Color(value).object();
        } else if (editKey === ('format')) {
            const formattedValue = value.replace(/[^0-9a-z]/gi, '').replace(/jpg/i, 'jpeg');
            const acceptedValues = ['heic', 'heif', 'jpeg', 'png', 'raw', 'tiff', 'webp'];
            if (acceptedValues.includes(formattedValue)) {
                this.edits.toFormat = formattedValue;
            }
        } else if (editKey === ('grayscale')) {
            this.edits.grayscale = true;
        } else if (editKey === ('no_upscale')) {
            if (this.edits.resize === undefined) {
                this.edits.resize = {};
            }
            this.edits.resize.withoutEnlargement = true;
        } else if (editKey === ('proportion')) {
            if (this.edits.resize === undefined) {
                this.edits.resize = {};
            }
            const prop = Number(value);
            this.edits.resize.width = Number(this.edits.resize.width * prop);
            this.edits.resize.height = Number(this.edits.resize.height * prop);
        } else if (editKey === ('quality')) {
            if (['jpg', 'jpeg'].includes(filetype)) {
                this.edits.jpeg = { quality: Number(value) }
            } else if (filetype === 'png') {
                this.edits.png = { quality: Number(value) }
            } else if (filetype === 'webp') {
                this.edits.webp = { quality: Number(value) }
            } else if (filetype === 'tiff') {
                this.edits.tiff = { quality: Number(value) }
            } else if (filetype === 'heif') {
                this.edits.heif = { quality: Number(value) }
            }
        } else if (editKey === ('rgb')) {
            const percentages = value.split(',');
            const values = [];
            percentages.forEach(function (percentage) {
                const parsedPercentage = Number(percentage);
                const val = 255 * (parsedPercentage / 100);
                values.push(val);
            })
            this.edits.tint = { r: values[0], g: values[1], b: values[2] };
        } else if (editKey === ('rotate')) {
            this.edits.rotate = Number(value);
        } else if (editKey === ('sharpen')) {
            const sh = value.split(',');
            const sigma = 1 + Number(sh[1]) / 2;
            this.edits.sharpen = sigma;
        } else if (editKey === ('stretch')) {
            if (this.edits.resize === undefined) {
                this.edits.resize = {};
            }

            // If fit-in is not defined, fit parameter would be 'fill'.
            if (this.edits.resize.fit !== 'inside') {
                this.edits.resize.fit = 'fill';
            }
        } else if (editKey === ('strip_exif') || editKey === ('strip_icc')) {
            this.edits.rotate = null;
        } else if (editKey === ('upscale')) {
            if (this.edits.resize === undefined) {
                this.edits.resize = {};
            }
            this.edits.resize.fit = "inside"
        } else if (editKey === ('watermark')) {
            const options = value.replace(/\s+/g, '').split(',');
            const bucket = options[0];
            const key = options[1];
            const xPos = options[2];
            const yPos = options[3];
            const alpha = options[4];
            const wRatio = options[5];
            const hRatio = options[6];

            this.edits.overlayWith = {
                bucket,
                key,
                alpha,
                wRatio,
                hRatio,
                options: {}
            }
            const allowedPosPattern = /^(100|[1-9]?[0-9]|-(100|[1-9][0-9]?))p$/;
            if (allowedPosPattern.test(xPos) || !isNaN(xPos)) {
                this.edits.overlayWith.options['left'] = xPos;
            }
            if (allowedPosPattern.test(yPos) || !isNaN(yPos)) {
                this.edits.overlayWith.options['top'] = yPos;
            }
        } else {
            return undefined;
        }
    }
}

// Exports
module.exports = ThumborMapping;