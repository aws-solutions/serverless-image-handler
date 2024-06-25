// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Logger } from '@aws-lambda-powertools/logger';
import { S3 } from '@aws-sdk/client-s3';
import sharp from 'sharp';

import { LogStashFormatter } from './lib/logging/LogStashFormatter';
import { ImageRequest } from './image-request';

const logger = new Logger({
  serviceName: process.env.AWS_LAMBDA_FUNCTION_NAME ?? 'image-handler',
  logFormatter: new LogStashFormatter(),
});

const ApiGWResponseSizeLimit = 6 * 1024 * 1024;

export class ImageHandler {
  private s3: any;

  constructor(s3: S3) {
    this.s3 = s3;
  }

  /**
   * Main method for processing image requests and outputting modified images.
   * @param request An image request.
   * @returns Processed and modified image encoded as base64 string.
   */
  async process(request: ImageRequest) {
    let returnImage;
    const originalImage = request.originalImage;
    const edits = request.edits;
    const cropping = request.cropping;

    const hasEdits = edits !== undefined && Object.keys(edits).length > 0;
    const hasCropping = cropping !== undefined && Object.keys(cropping).length > 0;
    let image: sharp.Sharp;
    if (hasEdits || hasCropping) {
      const keys = Object.keys(edits);

      if (keys.includes('rotate') && edits.rotate === null) {
        image = sharp(originalImage, { failOnError: false }).withMetadata();
      } else {
        const metadata = await sharp(originalImage, {
          failOnError: false,
        }).metadata();
        if (metadata.orientation) {
          image = sharp(originalImage, { failOnError: false }).withMetadata({
            orientation: metadata.orientation,
          });
        } else {
          image = sharp(originalImage, { failOnError: false }).withMetadata();
        }
      }

      if (hasCropping) {
        const image_metadata = await image.metadata();
        const width: any = image_metadata.width;
        const height: any = image_metadata.height;
        if (cropping.left + cropping.width > width || cropping.top + cropping.height > height) {
          throw {
            status: 400,
            code: 'CropOutOfBounds',
            message: `The cropping ${cropping.left},${cropping.top}x${cropping.width}:${cropping.height} is outside the image boundary of ${width}x${height}`,
          };
        }
        if (cropping.width === 0 || cropping.height === 0) {
          throw {
            status: 400,
            code: 'CropHasZeroDimension',
            message: `The cropping with dimension ${cropping.width}x${cropping.height} is invalid`,
          };
        }
        image = image.extract(cropping);
      }
      if (hasEdits) {
        image = await this.applyEdits(image, edits);
      }
    } else {
      image = sharp(originalImage, { failOnError: false }).withMetadata();
    }

    if ('image/webp' === request.ContentType && request.outputFormat === 'webp') {
      image.webp({ effort: 6, alphaQuality: 75 });
    } else if ('image/png' === request.ContentType) {
      image.png({ palette: true, quality: 100, effort: 7, compressionLevel: 6 });
    } else if ('image/jpeg' === request.ContentType) {
      image.jpeg({ mozjpeg: true });
    } else if (request.outputFormat !== undefined) {
      image.toFormat(request.outputFormat);
    }

    try {
      const bufferImage = await image.toBuffer();
      returnImage = bufferImage.toString('base64');
    } catch (e) {
      throw {
        status: 400,
        code: 'Cropping failed',
        message: `Cropping failed with "${e}"`,
      };
    }

    // If the converted image is larger than Lambda's payload hard limit, throw an error.
    if (returnImage.length > ApiGWResponseSizeLimit) {
      throw {
        status: 413,
        code: 'TooLargeImageException',
        message: `The converted image is too large to return. Actual = ${returnImage.length} - max ${ApiGWResponseSizeLimit}`,
      };
    }

    return returnImage;
  }

  /**
   * Applies image modifications to the original image based on edits
   * specified in the ImageRequest.
   * @param {Sharp} image - The original sharp image.
   * @param {object} edits - The edits to be made to the original image.
   */
  async applyEdits(image: sharp.Sharp, edits: any) {
    if (edits.resize === undefined) {
      edits.resize = {};
      edits.resize.fit = 'inside';
    } else {
      if (edits.resize.width) edits.resize.width = Math.round(Number(edits.resize.width));
      if (edits.resize.height) edits.resize.height = Math.round(Number(edits.resize.height));
    }

    // Apply the image edits
    for (const editKey in edits) {
      const value = edits[editKey];
      if (editKey === 'overlayWith') {
        let imageMetadata = await image.metadata();
        if (edits.resize) {
          let imageBuffer = await image.toBuffer();
          imageMetadata = await sharp(imageBuffer).resize(edits.resize).metadata();
        }

        const { bucket, key, wRatio, hRatio, alpha } = value;
        const overlay = await this.getOverlayImage(bucket, key, wRatio, hRatio, alpha, imageMetadata);
        const overlayMetadata = await sharp(overlay).metadata();

        let { options } = value;
        if (options) {
          if (options.left !== undefined) {
            let left = options.left;
            if (isNaN(left) && left.endsWith('p')) {
              left = parseInt(left.replace('p', ''));
              if (left < 0) {
                left = imageMetadata.width + (imageMetadata.width * left) / 100 - overlayMetadata.width;
              } else {
                left = (imageMetadata.width * left) / 100;
              }
            } else {
              left = parseInt(left);
              if (left < 0) {
                left = imageMetadata.width + left - overlayMetadata.width;
              }
            }
            isNaN(left) ? delete options.left : (options.left = left);
          }
          if (options.top !== undefined) {
            let top = options.top;
            if (isNaN(top) && top.endsWith('p')) {
              top = parseInt(top.replace('p', ''));
              if (top < 0) {
                top = imageMetadata.height + (imageMetadata.height * top) / 100 - overlayMetadata.height;
              } else {
                top = (imageMetadata.height * top) / 100;
              }
            } else {
              top = parseInt(top);
              if (top < 0) {
                top = imageMetadata.height + top - overlayMetadata.height;
              }
            }
            isNaN(top) ? delete options.top : (options.top = top);
          }
        }

        const params = [{ ...options, input: overlay }];
        image.composite(params);
      } else if (editKey === 'roundCrop') {
        const options = value;
        const imageBuffer = await image.toBuffer({ resolveWithObject: true });
        let width = imageBuffer.info.width;
        let height = imageBuffer.info.height;

        //check for parameters, if not provided, set to defaults
        const radiusX = options.rx && options.rx >= 0 ? options.rx : Math.min(width, height) / 2;
        const radiusY = options.ry && options.ry >= 0 ? options.ry : Math.min(width, height) / 2;
        const topOffset = options.top && options.top >= 0 ? options.top : height / 2;
        const leftOffset = options.left && options.left >= 0 ? options.left : width / 2;

        if (options) {
          const ellipse = Buffer.from(
            `<svg viewBox="0 0 ${width} ${height}"> <ellipse cx="${leftOffset}" cy="${topOffset}" rx="${radiusX}" ry="${radiusY}" /></svg>`,
          );
          const params: any = [{ input: ellipse, blend: 'dest-in' }];
          let data = await image
            .composite(params)
            .png() // transparent background instead of black background
            .toBuffer();
          image = sharp(data).withMetadata().trim();
        }
      } else {
        image[editKey](value);
      }
    }
    // Return the modified image
    return image;
  }

  /**
   * Gets an image to be used as an overlay to the primary image from an
   * Amazon S3 bucket.
   * @param {string} bucket - The name of the bucket containing the overlay.
   * @param {string} key - The object keyname corresponding to the overlay.
   * @param {number} wRatio - The width rate of the overlay image.
   * @param {number} hRatio - The height rate of the overlay image.
   * @param {number} alpha - The transparency alpha to the overlay.
   * @param {object} sourceImageMetadata - The metadata of the source image.
   */
  async getOverlayImage(
    bucket: any,
    key: any,
    wRatio: any,
    hRatio: any,
    alpha: any,
    sourceImageMetadata: sharp.Metadata,
  ): Promise<Buffer> {
    const params = { Bucket: bucket, Key: key };
    try {
      const { width, height }: sharp.Metadata = sourceImageMetadata;
      const overlayImage = await this.s3.getObject(params);
      let resize: Record<any, any> = {
        fit: 'inside',
      };

      // Set width and height of the watermark image based on the ratio
      const zeroToHundred = /^(100|[1-9]?[0-9])$/;
      if (zeroToHundred.test(wRatio)) {
        resize['width'] = Math.floor((width! * wRatio) / 100);
      }
      if (zeroToHundred.test(hRatio)) {
        resize['height'] = Math.floor((height! * hRatio) / 100);
      }

      // If alpha is not within 0-100, the default alpha is 0 (fully opaque).
      if (zeroToHundred.test(alpha)) {
        alpha = parseInt(alpha);
      } else {
        alpha = 0;
      }

      let input = Buffer.from(await overlayImage.Body?.transformToByteArray()!);
      return await sharp(input)
        .resize(resize)
        .composite([
          {
            input: Buffer.from([255, 255, 255, 255 * (1 - alpha / 100)]),
            raw: {
              width: 1,
              height: 1,
              channels: 4,
            },
            tile: true,
            blend: 'dest-in',
          },
        ])
        .toBuffer();
    } catch (err: any) {
      throw {
        status: err.statusCode ? err.statusCode : 500,
        code: err.code.toString(),
        message: err.message,
      };
    }
  }
}
