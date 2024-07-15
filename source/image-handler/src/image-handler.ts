// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import sharp, { FormatEnum, OverlayOptions } from 'sharp';

import {
  ContentTypes,
  ImageEdits,
  ImageFitTypes,
  ImageFormatTypes,
  ImageHandlerError,
  ImageRequestInfo,
  StatusCodes,
} from './lib';
import { S3 } from '@aws-sdk/client-s3';

export class ImageHandler {
  private readonly LAMBDA_PAYLOAD_LIMIT = 6 * 1024 * 1024;

  constructor(private readonly s3Client: S3) {}

  /**
   * Creates a Sharp object from Buffer
   * @param originalImage An image buffer.
   * @param edits The edits to be applied to an image
   * @param options Additional sharp options to be applied
   * @returns A Sharp image object
   */
  // eslint-disable-next-line @typescript-eslint/ban-types
  private async instantiateSharpImage(originalImage: Buffer, edits: ImageEdits, options: Object): Promise<sharp.Sharp> {
    let image: sharp.Sharp;

    if (edits && edits.rotate !== undefined && edits.rotate === null) {
      image = sharp(originalImage, options);
    } else {
      const metadata = await sharp(originalImage, options).metadata();
      image = metadata.orientation
        ? sharp(originalImage, options).withMetadata({ orientation: metadata.orientation })
        : sharp(originalImage, options).withMetadata();
    }

    return image;
  }

  /**
   * Modify an image's output format if specified, also automatically optimize the image based on the output format or content type.
   * @param modifiedImage the image object.
   * @param imageRequestInfo the image request
   * @returns A Sharp image object
   */
  private modifyImageOutput(modifiedImage: sharp.Sharp, imageRequestInfo: ImageRequestInfo): sharp.Sharp {
    const modifiedOutputImage = modifiedImage;

    if (
      ImageFormatTypes.WEBP === imageRequestInfo.outputFormat ||
      (undefined === imageRequestInfo.outputFormat && imageRequestInfo.contentType === ContentTypes.WEBP)
    ) {
      modifiedOutputImage.webp({ effort: imageRequestInfo.effort ?? 6 });
    } else if (
      ImageFormatTypes.PNG === imageRequestInfo.outputFormat ||
      (undefined === imageRequestInfo.outputFormat && imageRequestInfo.contentType === ContentTypes.PNG)
    ) {
      modifiedOutputImage.png({ palette: true, quality: 100, effort: 7, compressionLevel: 6 });
    } else if (
      ImageFormatTypes.JPEG === imageRequestInfo.outputFormat ||
      ImageFormatTypes.JPG === imageRequestInfo.outputFormat ||
      (undefined === imageRequestInfo.outputFormat && imageRequestInfo.contentType === ContentTypes.JPEG)
    ) {
      modifiedOutputImage.jpeg({ mozjpeg: true });
    }

    return modifiedOutputImage;
  }

  /**
   * Main method for processing image requests and outputting modified images.
   * @param imageRequestInfo An image request.
   * @returns Processed and modified image encoded as base64 string.
   */
  async process(imageRequestInfo: ImageRequestInfo): Promise<string> {
    const { originalImage, edits } = imageRequestInfo;
    const options = { failOnError: false, animated: imageRequestInfo.contentType === ContentTypes.GIF };
    let base64EncodedImage = '';

    // Apply edits if specified
    if (edits && Object.keys(edits).length) {
      // convert image to Sharp object
      options.animated =
        typeof edits.animated !== 'undefined' ? edits.animated : imageRequestInfo.contentType === ContentTypes.GIF;
      let image = await this.instantiateSharpImage(originalImage, edits, options);

      // default to non-animated if image does not have multiple pages
      if (options.animated) {
        const metadata = await image.metadata();
        if (!metadata.pages || metadata.pages <= 1) {
          options.animated = false;
          image = await this.instantiateSharpImage(originalImage, edits, options);
        }
      }

      // apply image edits
      let modifiedImage = await this.applyEdits(image, edits, options.animated);
      // modify image output if requested
      modifiedImage = this.modifyImageOutput(modifiedImage, imageRequestInfo);
      // convert to base64 encoded string
      const imageBuffer = await modifiedImage.toBuffer();
      base64EncodedImage = imageBuffer.toString('base64');
    } else {
      // convert image to Sharp and change output format if specified
      let image = await this.instantiateSharpImage(originalImage, edits, options);
      const modifiedImage = this.modifyImageOutput(image, imageRequestInfo);
      // convert to base64 encoded string
      const imageBuffer = await modifiedImage.toBuffer();
      base64EncodedImage = imageBuffer.toString('base64');
    }

    // binary data need to be base64 encoded to pass to the API Gateway proxy https://docs.aws.amazon.com/apigateway/latest/developerguide/lambda-proxy-binary-media.html.
    // checks whether base64 encoded image fits in 6M limit, see https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html.
    if (base64EncodedImage.length > this.LAMBDA_PAYLOAD_LIMIT) {
      throw new ImageHandlerError(
        StatusCodes.REQUEST_TOO_LONG,
        'TooLargeImageException',
        'The converted image is too large to return.',
      );
    }

    return base64EncodedImage;
  }

  /**
   * Applies image modifications to the original image based on edits.
   * @param originalImage The original sharp image.
   * @param edits The edits to be made to the original image.
   * @param isAnimation a flag whether the edit applies to animated files or not.
   * @returns A modifications to the original image.
   */
  public async applyEdits(originalImage: sharp.Sharp, edits: ImageEdits, isAnimation: boolean): Promise<sharp.Sharp> {
    await this.applyResize(originalImage, edits);

    // Apply the image edits
    for (const edit in edits) {
      if (this.skipEdit(edit, isAnimation)) continue;

      switch (edit) {
        case 'roundCrop': {
          originalImage = await this.applyRoundCrop(originalImage, edits);
          break;
        }
        case 'crop': {
          this.applyCrop(originalImage, edits);
          break;
        }
        case 'animated': {
          break;
        }
        default: {
          if (edit in originalImage) {
            originalImage[edit](edits[edit]);
          }
        }
      }
    }
    // Return the modified image
    return originalImage;
  }

  /**
   * Applies resize edit.
   * @param originalImage The original sharp image.
   * @param edits The edits to be made to the original image.
   */
  private async applyResize(originalImage: sharp.Sharp, edits: ImageEdits): Promise<void> {
    if (edits.resize === undefined) {
      edits.resize = {};
      edits.resize.fit = ImageFitTypes.INSIDE;
      return;
    }
    const resize = this.validateResizeInputs(edits.resize);

    if (resize.ratio) {
      const ratio = resize.ratio;

      const { width, height } = resize.width && resize.height ? resize : await originalImage.metadata();

      resize.width = Math.round(width * ratio);
      resize.height = Math.round(height * ratio);
      // Sharp doesn't have such parameter for resize(), we got it from Thumbor mapper.  We don't need to keep this field in the `resize` object
      delete resize.ratio;

      if (!resize.fit) resize.fit = ImageFitTypes.INSIDE;
    }
  }

  /**
   * Validates resize edit parameters.
   * @param resize The resize parameters.
   */
  private validateResizeInputs(resize: any) {
    if (resize.width) resize.width = Math.round(Number(resize.width));
    if (resize.height) resize.height = Math.round(Number(resize.height));

    if ((resize.width != null && resize.width <= 0) || (resize.height != null && resize.height <= 0)) {
      throw new ImageHandlerError(StatusCodes.BAD_REQUEST, 'InvalidResizeException', 'The image size is invalid.');
    }
    return resize;
  }

  /**
   * Determines if the edits specified contain a valid roundCrop item
   * @param edits The edits speficed
   * @returns boolean
   */
  private hasRoundCrop(edits: ImageEdits): boolean {
    return edits.roundCrop === true || typeof edits.roundCrop === 'object';
  }

  /**
   * @param param Value of corner to check
   * @returns Boolean identifying whether roundCrop parameters are valid
   */
  private validRoundCropParam(param: number) {
    return param && param >= 0;
  }

  /**
   * Applies round crop edit.
   * @param originalImage The original sharp image.
   * @param edits The edits to be made to the original image.
   */
  private async applyRoundCrop(originalImage: sharp.Sharp, edits: ImageEdits): Promise<sharp.Sharp> {
    // round crop can be boolean or object
    if (this.hasRoundCrop(edits)) {
      const { top, left, rx, ry } =
        typeof edits.roundCrop === 'object'
          ? edits.roundCrop
          : {
              top: undefined,
              left: undefined,
              rx: undefined,
              ry: undefined,
            };
      const imageBuffer = await originalImage.toBuffer({ resolveWithObject: true });
      const width = imageBuffer.info.width;
      const height = imageBuffer.info.height;

      // check for parameters, if not provided, set to defaults
      const radiusX = this.validRoundCropParam(rx) ? rx : Math.min(width, height) / 2;
      const radiusY = this.validRoundCropParam(ry) ? ry : Math.min(width, height) / 2;
      const topOffset = this.validRoundCropParam(top) ? top : height / 2;
      const leftOffset = this.validRoundCropParam(left) ? left : width / 2;

      const ellipse = Buffer.from(
        `<svg viewBox="0 0 ${width} ${height}"> <ellipse cx="${leftOffset}" cy="${topOffset}" rx="${radiusX}" ry="${radiusY}" /></svg>`,
      );
      const overlayOptions: OverlayOptions[] = [{ input: ellipse, blend: 'dest-in' }];

      // Need to break out into another sharp pipeline to allow for resize after composite
      const data = await originalImage
        .composite(overlayOptions)
        .png() // transparent background instead of black background
        .toBuffer();
      return sharp(data).withMetadata().trim();
    }

    return originalImage;
  }

  /**
   * Applies crop edit.
   * @param originalImage The original sharp image.
   * @param edits The edits to be made to the original image.
   */
  private applyCrop(originalImage: sharp.Sharp, edits: ImageEdits): void {
    try {
      originalImage.extract(edits.crop);
    } catch (error) {
      throw new ImageHandlerError(
        StatusCodes.BAD_REQUEST,
        'Crop::AreaOutOfBounds',
        'The cropping area you provided exceeds the boundaries of the original image. Please try choosing a correct cropping value.',
      );
    }
  }

  /**
   * Checks whether an edit needs to be skipped or not.
   * @param edit the current edit.
   * @param isAnimation a flag whether the edit applies to `gif` file or not.
   * @returns whether the edit needs to be skipped or not.
   */
  private skipEdit(edit: string, isAnimation: boolean): boolean {
    return isAnimation && ['rotate', 'smartCrop', 'roundCrop', 'contentModeration'].includes(edit);
  }

  /**
   * Converts serverless image handler image format type to 'sharp' format.
   * @param imageFormatType Result output file type.
   * @returns Converted 'sharp' format.
   */
  private static convertImageFormatType(imageFormatType: ImageFormatTypes): keyof FormatEnum {
    switch (imageFormatType) {
      case ImageFormatTypes.JPG:
        return 'jpg';
      case ImageFormatTypes.JPEG:
        return 'jpeg';
      case ImageFormatTypes.PNG:
        return 'png';
      case ImageFormatTypes.WEBP:
        return 'webp';
      case ImageFormatTypes.TIFF:
        return 'tiff';
      case ImageFormatTypes.HEIF:
        return 'heif';
      case ImageFormatTypes.RAW:
        return 'raw';
      case ImageFormatTypes.GIF:
        return 'gif';
      case ImageFormatTypes.AVIF:
        return 'avif';
      default:
        throw new ImageHandlerError(
          StatusCodes.INTERNAL_SERVER_ERROR,
          'UnsupportedOutputImageFormatException',
          `Format to ${imageFormatType} not supported`,
        );
    }
  }
}
