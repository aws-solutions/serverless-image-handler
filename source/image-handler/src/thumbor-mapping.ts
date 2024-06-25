// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import Color from 'color';
import ColorName from 'color-name';

export class ThumborMapping {
  // Constructor
  private path: any;
  cropping: any;
  edits: any;

  constructor() {
    this.edits = {};
    this.cropping = {};
  }

  /**
   * Initializer function for creating a new Thumbor mapping, used by the image
   * handler to perform image modifications based on legacy URL path requests.
   * @param {object} event - The request body.
   */
  process(event: any) {
    // Setup
    this.path = event['path'] || event['rawPath'];
    this.path = this.path.replace('__WIDTH__', '1800').replace('%28', '(').replace('%29', ')');

    // Process the Dimensions
    const dimPath = this.path.match(/\/(\d+)x(\d+)\//);
    if (dimPath) {
      // Assign dimensions from the first match only to avoid parsing dimension from image file names
      const width = Number(dimPath[1]);
      const height = Number(dimPath[2]);

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

    // Parse cropping
    const cropping = this.path.match(/\/(\d+)x(\d+):(\d+)x(\d+)\//);
    if (cropping) {
      const left = Number(cropping[1]);
      const top = Number(cropping[2]);
      const width = Number(cropping[3]);
      const height = Number(cropping[4]);

      if (!isNaN(left) && !isNaN(top) && !isNaN(width) && !isNaN(height)) {
        this.cropping = {
          left: left,
          top: top,
          width: width,
          height: height,
        };
      }
    }

    // Parse roundCrop
    if (this.path.includes('/roundCrop:true/')) {
      this.edits.roundCrop = true;
    }

    // Parse the image path
    let edits = this.path.match(/filters:[^)]+/g);
    if (!edits) {
      edits = [];
    }
    const filetype = this.path.split('.')[this.path.split('.').length - 1];
    for (let i = 0; i < edits.length; i++) {
      const edit = `${edits[i]})`;
      this.mapFilter(edit, filetype);
    }

    return this;
  }

  /**
   * Scanner function for matching supported Thumbor filters and converting their
   * capabilities into Sharp.js supported operations.
   * @param {string} edit - The URL path filter.
   * @param {string} filetype - The file type of the original image.
   */
  mapFilter(edit: string, filetype: any) {
    const matched = edit.match(/:(.+)\((.*)\)/);
    if (!matched) return;
    const editKey = matched[1];
    let value = matched[2];
    // Find the proper filter
    if (editKey === 'autojpg') {
      this.edits.toFormat = 'jpeg';
    } else if (editKey === 'background_color') {
      // @ts-ignore
      if (!ColorName[value]) {
        value = `#${value}`;
      }
      this.edits.flatten = { background: Color(value).object() };
    } else if (editKey === 'blur') {
      const val = value.split(',');
      this.edits.blur = val.length > 1 ? Number(val[1]) : Number(val[0]) / 2;
    } else if (editKey === 'convolution') {
      const arr = value.split(',');
      const strMatrix = arr[0].split(';');
      let matrix: any[] = [];
      strMatrix.forEach(function (str) {
        matrix.push(Number(str));
      });
      const matrixWidth: any = arr[1];
      let matrixHeight = 0;
      let counter = 0;
      for (let i = 0; i < matrix.length; i++) {
        if (counter === matrixWidth - 1) {
          matrixHeight++;
          counter = 0;
        } else {
          counter++;
        }
      }
      this.edits.convolve = {
        width: Number(matrixWidth),
        height: Number(matrixHeight),
        kernel: matrix,
      };
    } else if (editKey === 'equalize') {
      this.edits.normalize = 'true';
    } else if (editKey === 'fill') {
      if (this.edits.resize === undefined) {
        this.edits.resize = {};
      }
      // @ts-ignore
      if (!ColorName[value]) {
        value = `#${value}`;
      }
      this.edits.resize.fit = 'contain';
      this.edits.resize.background = Color(value).object();
    } else if (editKey === 'format') {
      const formattedValue = value.replace(/[^0-9a-z]/gi, '').replace(/jpg/i, 'jpeg');
      const acceptedValues = ['heic', 'heif', 'jpeg', 'png', 'raw', 'tiff', 'webp', 'avif'];
      if (acceptedValues.includes(formattedValue)) {
        this.edits.toFormat = formattedValue;
      }
    } else if (editKey === 'grayscale') {
      this.edits.grayscale = true;
    } else if (editKey === 'no_upscale') {
      if (this.edits.resize === undefined) {
        this.edits.resize = {};
      }
      this.edits.resize.withoutEnlargement = true;
    } else if (editKey === 'proportion') {
      if (this.edits.resize === undefined) {
        this.edits.resize = {};
      }
      const prop = Number(value);
      this.edits.resize.width = Number(this.edits.resize.width * prop);
      this.edits.resize.height = Number(this.edits.resize.height * prop);
    } else if (editKey === 'quality') {
      if (['jpg', 'jpeg'].includes(filetype)) {
        this.edits.jpeg = { quality: Number(value) };
      } else if (filetype === 'png') {
        this.edits.png = { quality: Number(value) };
      } else if (filetype === 'webp') {
        this.edits.webp = { quality: Number(value) };
      } else if (filetype === 'tiff') {
        this.edits.tiff = { quality: Number(value) };
      } else if (filetype === 'heif') {
        this.edits.heif = { quality: Number(value) };
      }
    } else if (editKey === 'rgb') {
      const percentages = value.split(',');
      const values: any[] = [];
      percentages.forEach(function (percentage) {
        const parsedPercentage = Number(percentage);
        const val = 255 * (parsedPercentage / 100);
        values.push(val);
      });
      this.edits.tint = { r: values[0], g: values[1], b: values[2] };
    } else if (editKey === 'rotate') {
      this.edits.rotate = Number(value);
    } else if (editKey === 'sharpen') {
      const sh = value.split(',');
      this.edits.sharpen = 1 + Number(sh[1]) / 2;
    } else if (editKey === 'stretch') {
      if (this.edits.resize === undefined) {
        this.edits.resize = {};
      }

      // If fit-in is not defined, fit parameter would be 'fill'.
      if (this.edits.resize.fit !== 'inside') {
        this.edits.resize.fit = 'fill';
      }
    } else if (editKey === 'strip_exif' || editKey === 'strip_icc') {
      this.edits.rotate = null;
    } else if (editKey === 'upscale') {
      if (this.edits.resize === undefined) {
        this.edits.resize = {};
      }
      this.edits.resize.fit = 'inside';
    } else if (editKey === 'watermark') {
      const options = value.replace(/\s+/g, '').split(',');
      const bucket = options[0];
      const key = options[1];
      const xPos: any = options[2];
      const yPos: any = options[3];
      const alpha = options[4];
      const wRatio = options[5];
      const hRatio = options[6];

      this.edits.overlayWith = {
        bucket,
        key,
        alpha,
        wRatio,
        hRatio,
        options: {},
      };
      const allowedPosPattern = /^(100|[1-9]?[0-9]|-(100|[1-9][0-9]?))p$/;
      if (allowedPosPattern.test(xPos) || !isNaN(xPos)) {
        this.edits.overlayWith.options['left'] = xPos;
      }
      if (allowedPosPattern.test(yPos) || !isNaN(yPos)) {
        this.edits.overlayWith.options['top'] = yPos;
      }
    } else if (editKey === 'roundCrop') {
      // Rounded crops, with optional coordinates
      const roundedImages = value.match(/(\d+)x(\d+)(:(\d+)x(\d+))?/);
      if (roundedImages) {
        const left = Number(roundedImages[1]);
        const top = Number(roundedImages[2]);
        const r_x = Number(roundedImages[4]);
        const r_y = Number(roundedImages[5]);

        this.edits.roundCrop = {};
        if (!isNaN(left)) this.edits.roundCrop.left = left;
        if (!isNaN(top)) this.edits.roundCrop.top = top;
        if (!isNaN(r_x)) this.edits.roundCrop.rx = r_x;
        if (!isNaN(r_y)) this.edits.roundCrop.ry = r_y;
      } else if (value === 'true' || value === '') {
        this.edits.roundCrop = {};
      }
    } else {
      return undefined;
    }
  }
}
