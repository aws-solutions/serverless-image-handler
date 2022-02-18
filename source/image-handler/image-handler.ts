// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import S3 from 'aws-sdk/clients/s3';
import Rekognition from 'aws-sdk/clients/rekognition';
import sharp, { FormatEnum, OverlayOptions, ResizeOptions } from 'sharp';

import { BoundingBox, BoxSize, ImageEdits, ImageFitTypes, ImageFormatTypes, ImageHandlerError, ImageRequestInfo, RekognitionCompatibleImage, StatusCodes } from './lib';

export class ImageHandler {
  private readonly LAMBDA_PAYLOAD_LIMIT = 6 * 1024 * 1024;

  constructor(private readonly s3Client: S3, private readonly rekognitionClient: Rekognition) {}

  /**
   * Main method for processing image requests and outputting modified images.
   * @param imageRequestInfo An image request.
   * @returns Processed and modified image encoded as base64 string.
   */
  async process(imageRequestInfo: ImageRequestInfo): Promise<string> {
    const { originalImage, edits } = imageRequestInfo;

    let base64EncodedImage = '';

    if (edits && Object.keys(edits).length) {
      let image: sharp.Sharp = null;

      if (edits.rotate !== undefined && edits.rotate === null) {
        image = sharp(originalImage, { failOnError: false });
      } else {
        const metadata = await sharp(originalImage, { failOnError: false }).metadata();
        image = metadata.orientation
          ? sharp(originalImage, { failOnError: false }).withMetadata({ orientation: metadata.orientation })
          : sharp(originalImage, { failOnError: false }).withMetadata();
      }

      const modifiedImage = await this.applyEdits(image, edits);
      if (imageRequestInfo.outputFormat !== undefined) {
        if (imageRequestInfo.outputFormat === ImageFormatTypes.WEBP && typeof imageRequestInfo.reductionEffort !== 'undefined') {
          modifiedImage.webp({ reductionEffort: imageRequestInfo.reductionEffort });
        } else {
          modifiedImage.toFormat(ImageHandler.convertImageFormatType(imageRequestInfo.outputFormat));
        }
      }

      const imageBuffer = await modifiedImage.toBuffer();
      base64EncodedImage = imageBuffer.toString('base64');
    } else {
      // change output format if specified
      if (imageRequestInfo.outputFormat !== undefined) {
        const modifiedImage = sharp(originalImage, { failOnError: false });
        modifiedImage.toFormat(ImageHandler.convertImageFormatType(imageRequestInfo.outputFormat));

        const imageBuffer = await modifiedImage.toBuffer();
        base64EncodedImage = imageBuffer.toString('base64');
      } else {
        base64EncodedImage = originalImage.toString('base64');
      }
    }

    // binary data need to be base64 encoded to pass to the API Gateway proxy https://docs.aws.amazon.com/apigateway/latest/developerguide/lambda-proxy-binary-media.html.
    // checks whether base64 encoded image fits in 6M limit, see https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html.
    if (base64EncodedImage.length > this.LAMBDA_PAYLOAD_LIMIT) {
      throw new ImageHandlerError(StatusCodes.REQUEST_TOO_LONG, 'TooLargeImageException', 'The converted image is too large to return.');
    }

    return base64EncodedImage;
  }

  /**
   * Applies image modifications to the original image based on edits.
   * @param originalImage The original sharp image.
   * @param edits The edits to be made to the original image.
   * @returns A modifications to the original image.
   */
  public async applyEdits(originalImage: sharp.Sharp, edits: ImageEdits): Promise<sharp.Sharp> {
    if (edits.resize === undefined) {
      edits.resize = {};
      edits.resize.fit = ImageFitTypes.INSIDE;
    } else {
      if (edits.resize.width) edits.resize.width = Math.round(Number(edits.resize.width));
      if (edits.resize.height) edits.resize.height = Math.round(Number(edits.resize.height));
    }

    // Apply the image edits
    for (const edit in edits) {
      switch (edit) {
        case 'overlayWith': {
          let imageMetadata: sharp.Metadata = await originalImage.metadata();

          if (edits.resize) {
            const imageBuffer = await originalImage.toBuffer();
            const resizeOptions: ResizeOptions = edits.resize;

            imageMetadata = await sharp(imageBuffer).resize(resizeOptions).metadata();
          }

          const { bucket, key, wRatio, hRatio, alpha, options } = edits.overlayWith;
          const overlay = await this.getOverlayImage(bucket, key, wRatio, hRatio, alpha, imageMetadata);
          const overlayMetadata = await sharp(overlay).metadata();
          const overlayOption: OverlayOptions = { ...options, input: overlay };

          if (options) {
            const { left: leftOption, top: topOption } = options;
            const getSize = (editSize: string | undefined, imageSize: number, overlaySize: number): number => {
              let resultSize = NaN;

              if (editSize !== undefined) {
                if (editSize.endsWith('p')) {
                  resultSize = parseInt(editSize.replace('p', ''));
                  resultSize = Math.floor(resultSize < 0 ? imageSize + (imageSize * resultSize) / 100 - overlaySize : (imageSize * resultSize) / 100);
                } else {
                  resultSize = parseInt(editSize);

                  if (resultSize < 0) {
                    resultSize = imageSize + resultSize - overlaySize;
                  }
                }
              }

              return resultSize;
            };

            const left = getSize(leftOption, imageMetadata.width, overlayMetadata.width);
            if (!isNaN(left)) overlayOption.left = left;

            const top = getSize(topOption, imageMetadata.height, overlayMetadata.height);
            if (!isNaN(top)) overlayOption.top = top;
          }

          originalImage.composite([overlayOption]);
          break;
        }
        case 'smartCrop': {
          // smart crop can be boolean or object
          if (edits.smartCrop === true || typeof edits.smartCrop === 'object') {
            const { faceIndex, padding } =
              typeof edits.smartCrop === 'object'
                ? edits.smartCrop
                : {
                    faceIndex: undefined,
                    padding: undefined
                  };
            const { imageBuffer, format } = await this.getRekognitionCompatibleImage(originalImage);
            const boundingBox = await this.getBoundingBox(imageBuffer.data, faceIndex ?? 0);
            const cropArea = this.getCropArea(boundingBox, padding ?? 0, imageBuffer.info);
            try {
              originalImage.extract(cropArea);
              // convert image back to previous format
              if (format !== imageBuffer.info.format) {
                originalImage.toFormat(format);
              }
            } catch (error) {
              throw new ImageHandlerError(
                StatusCodes.BAD_REQUEST,
                'SmartCrop::PaddingOutOfBounds',
                'The padding value you provided exceeds the boundaries of the original image. Please try choosing a smaller value or applying padding via Sharp for greater specificity.'
              );
            }
          }
          break;
        }
        case 'roundCrop': {
          // round crop can be boolean or object
          if (edits.roundCrop === true || typeof edits.roundCrop === 'object') {
            const { top, left, rx, ry } =
              typeof edits.roundCrop === 'object'
                ? edits.roundCrop
                : {
                    top: undefined,
                    left: undefined,
                    rx: undefined,
                    ry: undefined
                  };
            const imageBuffer = await originalImage.toBuffer({ resolveWithObject: true });
            const width = imageBuffer.info.width;
            const height = imageBuffer.info.height;

            // check for parameters, if not provided, set to defaults
            const radiusX = rx && rx >= 0 ? rx : Math.min(width, height) / 2;
            const radiusY = ry && ry >= 0 ? ry : Math.min(width, height) / 2;
            const topOffset = top && top >= 0 ? top : height / 2;
            const leftOffset = left && left >= 0 ? left : width / 2;

            const ellipse = Buffer.from(`<svg viewBox="0 0 ${width} ${height}"> <ellipse cx="${leftOffset}" cy="${topOffset}" rx="${radiusX}" ry="${radiusY}" /></svg>`);
            const overlayOptions: OverlayOptions[] = [{ input: ellipse, blend: 'dest-in' }];

            const data = await originalImage.composite(overlayOptions).toBuffer();
            originalImage = sharp(data).withMetadata().trim();
          }
          break;
        }
        case 'contentModeration': {
          // content moderation can be boolean or object
          if (edits.contentModeration === true || typeof edits.contentModeration === 'object') {
            const { minConfidence, blur, moderationLabels } =
              typeof edits.contentModeration === 'object'
                ? edits.contentModeration
                : {
                    minConfidence: undefined,
                    blur: undefined,
                    moderationLabels: undefined
                  };
            const { imageBuffer, format } = await this.getRekognitionCompatibleImage(originalImage);
            const inappropriateContent = await this.detectInappropriateContent(imageBuffer.data, minConfidence);
            const blurValue = blur !== undefined ? Math.ceil(blur) : 50;

            if (blurValue >= 0.3 && blurValue <= 1000) {
              if (moderationLabels) {
                for (const moderationLabel of inappropriateContent.ModerationLabels) {
                  if (moderationLabels.includes(moderationLabel.Name)) {
                    originalImage.blur(blur);
                    break;
                  }
                }
              } else if (inappropriateContent.ModerationLabels.length) {
                originalImage.blur(blur);
              }
            }
            // convert image back to previous format
            if (format !== imageBuffer.info.format) {
              originalImage.toFormat(format);
            }
          }
          break;
        }
        case 'crop': {
          try {
            originalImage.extract(edits.crop);
          } catch (error) {
            throw new ImageHandlerError(
              StatusCodes.BAD_REQUEST,
              'Crop::AreaOutOfBounds',
              'The cropping area you provided exceeds the boundaries of the original image. Please try choosing a correct cropping value.'
            );
          }
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
   * Gets an image to be used as an overlay to the primary image from an Amazon S3 bucket.
   * @param bucket The name of the bucket containing the overlay.
   * @param key The object keyname corresponding to the overlay.
   * @param wRatio The width rate of the overlay image.
   * @param hRatio The height rate of the overlay image.
   * @param alpha The transparency alpha to the overlay.
   * @param sourceImageMetadata The metadata of the source image.
   * @returns An image to bo ber used as an overlay.
   */
  public async getOverlayImage(bucket: string, key: string, wRatio: string, hRatio: string, alpha: string, sourceImageMetadata: sharp.Metadata): Promise<Buffer> {
    const params = { Bucket: bucket, Key: key };
    try {
      const { width, height } = sourceImageMetadata;
      const overlayImage: S3.GetObjectOutput = await this.s3Client.getObject(params).promise();
      const resizeOptions: ResizeOptions = {
        fit: ImageFitTypes.INSIDE
      };

      // Set width and height of the watermark image based on the ratio
      const zeroToHundred = /^(100|[1-9]?[0-9])$/;
      if (zeroToHundred.test(wRatio)) {
        resizeOptions.width = Math.floor((width * parseInt(wRatio)) / 100);
      }
      if (zeroToHundred.test(hRatio)) {
        resizeOptions.height = Math.floor((height * parseInt(hRatio)) / 100);
      }

      // If alpha is not within 0-100, the default alpha is 0 (fully opaque).
      const alphaValue = zeroToHundred.test(alpha) ? parseInt(alpha) : 0;
      const imageBuffer = Buffer.isBuffer(overlayImage.Body) ? overlayImage.Body : Buffer.from(overlayImage.Body as Uint8Array);
      return await sharp(imageBuffer)
        .resize(resizeOptions)
        .composite([
          {
            input: Buffer.from([255, 255, 255, 255 * (1 - alphaValue / 100)]),
            raw: {
              width: 1,
              height: 1,
              channels: 4
            },
            tile: true,
            blend: 'dest-in'
          }
        ])
        .toBuffer();
    } catch (error) {
      throw new ImageHandlerError(error.statusCode ? error.statusCode : StatusCodes.INTERNAL_SERVER_ERROR, error.code, error.message);
    }
  }

  /**
   * Calculates the crop area for a smart-cropped image based on the bounding box data returned by Amazon Rekognition, as well as padding options and the image metadata.
   * @param boundingBox The bounding box of the detected face.
   * @param padding Set of options for smart cropping.
   * @param boxSize Sharp image metadata.
   * @returns Calculated crop area for a smart-cropped image.
   */
  public getCropArea(boundingBox: BoundingBox, padding: number, boxSize: BoxSize): BoundingBox {
    // calculate needed options dimensions
    let left = Math.floor(boundingBox.left * boxSize.width - padding);
    let top = Math.floor(boundingBox.top * boxSize.height - padding);
    let extractWidth = Math.floor(boundingBox.width * boxSize.width + padding * 2);
    let extractHeight = Math.floor(boundingBox.height * boxSize.height + padding * 2);

    // check if dimensions fit within image dimensions and re-adjust if necessary
    left = left < 0 ? 0 : left;
    top = top < 0 ? 0 : top;
    const maxWidth = boxSize.width - left;
    const maxHeight = boxSize.height - top;
    extractWidth = extractWidth > maxWidth ? maxWidth : extractWidth;
    extractHeight = extractHeight > maxHeight ? maxHeight : extractHeight;

    // Calculate the smart crop area
    return {
      left: left,
      top: top,
      width: extractWidth,
      height: extractHeight
    };
  }

  /**
   * Gets the bounding box of the specified face index within an image, if specified.
   * @param imageBuffer The original image.
   * @param faceIndex The zero-based face index value, moving from 0 and up as confidence decreases for detected faces within the image.
   * @returns The bounding box of the specified face index within an image.
   */
  public async getBoundingBox(imageBuffer: Buffer, faceIndex: number): Promise<BoundingBox> {
    const params = { Image: { Bytes: imageBuffer } };

    try {
      const response = await this.rekognitionClient.detectFaces(params).promise();
      if (response.FaceDetails.length <= 0) {
        return { height: 1, left: 0, top: 0, width: 1 };
      }

      const boundingBox: { Height?: number; Left?: number; Top?: number; Width?: number } = {};
      // handle bounds > 1 and < 0
      for (const bound in response.FaceDetails[faceIndex].BoundingBox) {
        if (response.FaceDetails[faceIndex].BoundingBox[bound] < 0) boundingBox[bound] = 0;
        else if (response.FaceDetails[faceIndex].BoundingBox[bound] > 1) boundingBox[bound] = 1;
        else boundingBox[bound] = response.FaceDetails[faceIndex].BoundingBox[bound];
      }

      // handle bounds greater than the size of the image
      if (boundingBox.Left + boundingBox.Width > 1) {
        boundingBox.Width = 1 - boundingBox.Left;
      }
      if (boundingBox.Top + boundingBox.Height > 1) {
        boundingBox.Height = 1 - boundingBox.Top;
      }

      return { height: boundingBox.Height, left: boundingBox.Left, top: boundingBox.Top, width: boundingBox.Width };
    } catch (error) {
      console.error(error);

      if (error.message === "Cannot read property 'BoundingBox' of undefined" || error.message === "Cannot read properties of undefined (reading 'BoundingBox')") {
        throw new ImageHandlerError(
          StatusCodes.BAD_REQUEST,
          'SmartCrop::FaceIndexOutOfRange',
          'You have provided a FaceIndex value that exceeds the length of the zero-based detectedFaces array. Please specify a value that is in-range.'
        );
      } else {
        throw new ImageHandlerError(error.statusCode ? error.statusCode : StatusCodes.INTERNAL_SERVER_ERROR, error.code, error.message);
      }
    }
  }

  /**
   * Detects inappropriate content in an image.
   * @param imageBuffer The original image.
   * @param minConfidence The options to pass to the detectModerationLabels Rekognition function.
   * @returns Detected inappropriate content in an image.
   */
  private async detectInappropriateContent(imageBuffer: Buffer, minConfidence: number | undefined): Promise<Rekognition.DetectModerationLabelsResponse> {
    try {
      const params = {
        Image: { Bytes: imageBuffer },
        MinConfidence: minConfidence ?? 75
      };
      return await this.rekognitionClient.detectModerationLabels(params).promise();
    } catch (error) {
      console.error(error);
      throw new ImageHandlerError(error.statusCode ? error.statusCode : StatusCodes.INTERNAL_SERVER_ERROR, error.code, error.message);
    }
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
      default:
        throw new ImageHandlerError(StatusCodes.INTERNAL_SERVER_ERROR, 'UnsupportedOutputImageFormatException', `Format to ${imageFormatType} not supported`);
    }
  }

  /**
   * Converts the image to a rekognition compatible format if current format is not compatible.
   * @param image the image to be modified by rekognition.
   * @returns object containing image buffer data and original image format.
   */
  private async getRekognitionCompatibleImage(image: sharp.Sharp): Promise<RekognitionCompatibleImage> {
    const metadata = await image.metadata();
    const format = metadata.format;
    let imageBuffer: { data: Buffer; info: sharp.OutputInfo };

    // convert image to png if not jpeg or png
    if (!['jpeg', 'png'].includes(format)) {
      imageBuffer = await image.png().toBuffer({ resolveWithObject: true });
    } else {
      imageBuffer = await image.toBuffer({ resolveWithObject: true });
    }

    return { imageBuffer: imageBuffer, format: format };
  }
}
