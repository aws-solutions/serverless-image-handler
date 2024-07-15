// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  ContentTypes,
  DefaultImageRequest,
  Headers,
  ImageEdits,
  ImageFormatTypes,
  ImageHandlerError,
  ImageRequestInfo,
  RequestTypes,
  StatusCodes,
} from './lib';
import { ThumborMapper } from './thumbor-mapper';
import { GetObjectCommand, GetObjectCommandInput, GetObjectCommandOutput, S3 } from '@aws-sdk/client-s3';
import { APIGatewayProxyEventV2 } from 'aws-lambda';
import { logger } from './index';

type OriginalImageInfo = Partial<{
  contentType: string;
  expires: Date;
  lastModified: Date;
  cacheControl: string;
  originalImage: Buffer;
}>;

export class ImageRequest {
  constructor(private readonly s3Client: S3) {}

  /**
   * Determines the output format of an image
   * @param imageRequestInfo Initialized image request information
   * @param event Lambda requrest body
   */
  private determineOutputFormat(imageRequestInfo: ImageRequestInfo, event: APIGatewayProxyEventV2): void {
    const outputFormat = this.getOutputFormat(event, imageRequestInfo.requestType);
    // if webp check reduction effort, if invalid value, use 4 (default in sharp)
    if (outputFormat === ImageFormatTypes.WEBP && imageRequestInfo.requestType === RequestTypes.DEFAULT) {
      const decoded = this.decodeRequest(event);
      if (typeof decoded.effort !== 'undefined') {
        const effort = Math.trunc(decoded.effort);
        const isValid = !isNaN(effort) && effort >= 0 && effort <= 6;
        imageRequestInfo.effort = isValid ? effort : 4;
      }
    }
    if (imageRequestInfo.edits?.toFormat) {
      imageRequestInfo.outputFormat = imageRequestInfo.edits.toFormat;
    } else if (outputFormat) {
      imageRequestInfo.outputFormat = outputFormat;
    }
  }

  /**
   * Fix quality for Thumbor and Custom request type if outputFormat is different from quality type.
   * @param imageRequestInfo Initialized image request information
   */
  private fixQuality(imageRequestInfo: ImageRequestInfo): void {
    if (imageRequestInfo.outputFormat) {
      const requestType = [RequestTypes.CUSTOM, RequestTypes.THUMBOR];
      const acceptedValues = [
        ImageFormatTypes.JPEG,
        ImageFormatTypes.PNG,
        ImageFormatTypes.WEBP,
        ImageFormatTypes.TIFF,
        ImageFormatTypes.HEIF,
        ImageFormatTypes.GIF,
        ImageFormatTypes.AVIF,
      ];

      imageRequestInfo.contentType = `image/${imageRequestInfo.outputFormat}`;
      if (
        requestType.includes(imageRequestInfo.requestType) &&
        acceptedValues.includes(imageRequestInfo.outputFormat)
      ) {
        const qualityKey = Object.keys(imageRequestInfo.edits).filter(key =>
          acceptedValues.includes(key as ImageFormatTypes),
        )[0];

        if (qualityKey && qualityKey !== imageRequestInfo.outputFormat) {
          imageRequestInfo.edits[imageRequestInfo.outputFormat] = imageRequestInfo.edits[qualityKey];
          delete imageRequestInfo.edits[qualityKey];
        }
      }
    }
  }

  /**
   * Initializer function for creating a new image request, used by the image handler to perform image modifications.
   * @param event Lambda request body.
   * @returns Initialized image request information.
   */
  public async setup(event: APIGatewayProxyEventV2): Promise<ImageRequestInfo> {
    try {
      let imageRequestInfo: ImageRequestInfo = <ImageRequestInfo>{};

      imageRequestInfo.requestType = this.parseRequestType(event);
      imageRequestInfo.bucket = (process.env.SOURCE_BUCKETS ?? '').split(',')[0];
      imageRequestInfo.key = this.parseImageKey(event, imageRequestInfo.requestType);
      imageRequestInfo.edits = this.parseImageEdits(event, imageRequestInfo.requestType);

      const originalImage = await this.getOriginalImage(imageRequestInfo.bucket, imageRequestInfo.key);
      imageRequestInfo = { ...imageRequestInfo, ...originalImage };

      imageRequestInfo.headers = this.parseImageHeaders(event, imageRequestInfo.requestType);

      // If the original image is SVG file and it has any edits but no output format, change the format to PNG.
      if (
        imageRequestInfo.contentType === ContentTypes.SVG &&
        imageRequestInfo.edits &&
        Object.keys(imageRequestInfo.edits).length > 0 &&
        !imageRequestInfo.edits.toFormat
      ) {
        imageRequestInfo.outputFormat = ImageFormatTypes.PNG;
      }

      /* Decide the output format of the image.
       * 1) If the format is provided, the output format is the provided format.
       * 2) If headers contain "Accept: image/webp", the output format is webp.
       * 3) Use the default image format for the rest of cases.
       */
      if (
        imageRequestInfo.contentType !== ContentTypes.SVG ||
        imageRequestInfo.edits.toFormat ||
        imageRequestInfo.outputFormat
      ) {
        this.determineOutputFormat(imageRequestInfo, event);
      }

      // Fix quality for Thumbor and Custom request type if outputFormat is different from quality type.
      this.fixQuality(imageRequestInfo);

      return imageRequestInfo;
    } catch (error) {
      if (error.code && error.code !== 'NoSuchKey') {
        logger.warn('Error occurred while setting up the image request. Error: ', error);
      }

      throw error;
    }
  }

  /**
   * Gets the original image from an Amazon S3 bucket.
   * @param bucket The name of the bucket containing the image.
   * @param key The key name corresponding to the image.
   * @returns The original image or an error.
   */
  public async getOriginalImage(bucket: string, key: string): Promise<OriginalImageInfo> {
    try {
      const result: OriginalImageInfo = {};

      let originalImage: GetObjectCommandOutput;
      try {
        const getObjectCommand: GetObjectCommandInput = { Bucket: bucket, Key: key };
        logger.info('Getting image from S3:', { getObjectCommand });
        originalImage = await this.s3Client.send(new GetObjectCommand(getObjectCommand));
      } catch (error) {
        logger.warn('Error occurred while getting the image from S3. Error: ', error);
        throw new ImageHandlerError(
          StatusCodes.NOT_FOUND,
          'NoSuchKey',
          `The image ${key} does not exist or the request may not be base64 encoded properly.`,
        );
      }
      let bodyBytes = await originalImage.Body?.transformToByteArray();
      const imageBuffer = Buffer.from(bodyBytes);

      if (originalImage.ContentType) {
        // If using default S3 ContentType infer from hex headers
        if (['binary/octet-stream', 'application/octet-stream'].includes(originalImage.ContentType)) {
          result.contentType = this.inferImageType(imageBuffer);
        } else {
          result.contentType = originalImage.ContentType;
        }
      } else {
        result.contentType = 'image';
      }

      if (originalImage.Expires) {
        result.expires = originalImage.Expires;
      }

      if (originalImage.LastModified) {
        result.lastModified = originalImage.LastModified;
      }

      result.cacheControl = originalImage.CacheControl ?? 'max-age=31536000';
      result.originalImage = imageBuffer;

      return result;
    } catch (error) {
      let status = StatusCodes.INTERNAL_SERVER_ERROR;
      let message = error.message;
      if (error.code === 'NoSuchKey') {
        status = StatusCodes.NOT_FOUND;
        message = `The image ${key} does not exist or the request may not be base64 encoded properly.`;
      } else {
        logger.warn('Error occurred while getting the original image. Error: ', error);
      }
      throw new ImageHandlerError(status, error.code, message);
    }
  }

  /**
   * Parses the edits to be made to the original image.
   * @param event Lambda request body.
   * @param requestType Image handler request type.
   * @returns The edits to be made to the original image.
   */
  public parseImageEdits(event: APIGatewayProxyEventV2, requestType: RequestTypes): ImageEdits {
    if (requestType === RequestTypes.DEFAULT) {
      const decoded = this.decodeRequest(event);
      return decoded.edits;
    } else if (requestType === RequestTypes.THUMBOR) {
      const thumborMapping = new ThumborMapper();
      return thumborMapping.mapPathToEdits(event.rawPath);
    } else if (requestType === RequestTypes.CUSTOM) {
      const thumborMapping = new ThumborMapper();
      const parsedPath = thumborMapping.parseCustomPath(event.rawPath);
      return thumborMapping.mapPathToEdits(parsedPath);
    } else {
      throw new ImageHandlerError(
        StatusCodes.BAD_REQUEST,
        'ImageEdits::CannotParseEdits',
        'The edits you provided could not be parsed. Please check the syntax of your request and refer to the documentation for additional guidance.',
      );
    }
  }

  /**
   * Parses the name of the appropriate Amazon S3 key corresponding to the original image.
   * @param event Lambda request body.
   * @param requestType Type of the request.
   * @returns The name of the appropriate Amazon S3 key.
   */
  public parseImageKey(event: APIGatewayProxyEventV2, requestType: RequestTypes): string {
    if (requestType === RequestTypes.DEFAULT) {
      // Decode the image request and return the image key
      const { key } = this.decodeRequest(event);
      return key;
    }

    if (requestType === RequestTypes.THUMBOR || requestType === RequestTypes.CUSTOM) {
      let { rawPath } = event;

      return decodeURIComponent(
        rawPath
          .replace(/\/\d+x\d+:\d+x\d+(?=\/)/g, '')
          .replace(/\/\d+x\d+(?=\/)/g, '')
          .replace(/filters:watermark\(.*\)/u, '')
          .replace(/filters:[^/]+/g, '')
          .replace(/\/fit-in(?=\/)/g, '')
          .replace(/^\/+/g, '')
          .replace(/^\/+/, '')
          .replace(/\/+/g, '/')
          .replace(/^authors\//, ''),
      );
    }

    // Return an error for all other conditions
    throw new ImageHandlerError(
      StatusCodes.NOT_FOUND,
      'ImageEdits::CannotFindImage',
      'The image you specified could not be found. Please check your request syntax as well as the bucket you specified to ensure it exists.',
    );
  }

  /**
   * Determines how to handle the request being made based on the URL path prefix to the image request.
   * Categorizes a request as either "image" (uses the Sharp library), "thumbor" (uses Thumbor mapping), or "custom" (uses the rewrite function).
   * @param event Lambda request body.
   * @returns The request type.
   */
  public parseRequestType(event: APIGatewayProxyEventV2): RequestTypes {
    const { rawPath } = event;
    const matchDefault = /^(\/?)([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
    const matchThumbor1 = /^(\/?)((fit-in)?|(filters:.+\(.?\))?|(unsafe)?)/i;
    const matchThumbor2 = /^((.(?!(\.[^.\\/]+$)))*$)/i; // NOSONAR
    const matchThumbor3 = /.*(\.jpg$|\.jpeg$|.\.png$|\.webp$|\.tiff$|\.tif$|\.svg$|\.gif$|\.avif$)/i; // NOSONAR
    const { REWRITE_MATCH_PATTERN, REWRITE_SUBSTITUTION } = process.env;
    const definedEnvironmentVariables =
      REWRITE_MATCH_PATTERN !== '' &&
      REWRITE_SUBSTITUTION !== '' &&
      REWRITE_MATCH_PATTERN !== undefined &&
      REWRITE_SUBSTITUTION !== undefined;

    // Check if path is base 64 encoded
    let isBase64Encoded = true;
    try {
      this.decodeRequest(event);
    } catch (error) {
      isBase64Encoded = false;
    }

    if (matchDefault.test(rawPath) && isBase64Encoded) {
      // use sharp
      return RequestTypes.DEFAULT;
    } else if (definedEnvironmentVariables) {
      // use rewrite function then thumbor mappings
      return RequestTypes.CUSTOM;
    } else if (matchThumbor1.test(rawPath) && (matchThumbor2.test(rawPath) || matchThumbor3.test(rawPath))) {
      // use thumbor mappings
      return RequestTypes.THUMBOR;
    } else {
      throw new ImageHandlerError(
        StatusCodes.BAD_REQUEST,
        'RequestTypeError',
        'The type of request you are making could not be processed. Please ensure that your original image is of a supported file type (jpg/jpeg, png, tiff/tif, webp, svg, gif, avif) and that your image request is provided in the correct syntax. Refer to the documentation for additional guidance on forming image requests.',
      );
    }
  }

  // eslint-disable-next-line jsdoc/require-returns-check
  /**
   * Parses the headers to be sent with the response.
   * @param event Lambda request body.
   * @param requestType Image handler request type.
   * @returns (optional) The headers to be sent with the response.
   */
  public parseImageHeaders(event: APIGatewayProxyEventV2, requestType: RequestTypes): Headers {
    if (requestType === RequestTypes.DEFAULT) {
      const { headers } = this.decodeRequest(event);
      if (headers) {
        return headers;
      }
    }
  }

  /**
   * Decodes the base64-encoded image request path associated with default image requests.
   * Provides error handling for invalid or undefined path values.
   * @param event Lambda request body.
   * @returns The decoded from base-64 image request.
   */
  public decodeRequest(event: APIGatewayProxyEventV2): DefaultImageRequest {
    const { rawPath } = event;

    if (rawPath) {
      const encoded = rawPath.startsWith('/') ? rawPath.slice(1) : rawPath;
      const toBuffer = Buffer.from(encoded, 'base64');
      try {
        // To support European characters, 'ascii' was removed.
        return JSON.parse(toBuffer.toString());
      } catch (error) {
        throw new ImageHandlerError(
          StatusCodes.BAD_REQUEST,
          'DecodeRequest::CannotDecodeRequest',
          'The image request you provided could not be decoded. Please check that your request is base64 encoded properly and refer to the documentation for additional guidance.',
        );
      }
    } else {
      throw new ImageHandlerError(
        StatusCodes.BAD_REQUEST,
        'DecodeRequest::CannotReadPath',
        'The URL path you provided could not be read. Please ensure that it is properly formed according to the solution documentation.',
      );
    }
  }

  /**
   * Return the output format depending on the accepts headers and request type.
   * @param event Lambda request body.
   * @param requestType The request type.
   * @returns The output format.
   */
  public getOutputFormat(event: APIGatewayProxyEventV2, requestType: RequestTypes = undefined): ImageFormatTypes {
    const { AUTO_WEBP, AUTO_AVIF } = process.env;
    const accept = event.headers?.accept;

    if (AUTO_AVIF === 'Yes' && accept && accept.includes(ContentTypes.AVIF)) {
      return ImageFormatTypes.WEBP;
    } else if (AUTO_WEBP === 'Yes' && accept && accept.includes(ContentTypes.WEBP)) {
      return ImageFormatTypes.WEBP;
    } else if (requestType === RequestTypes.DEFAULT) {
      const decoded = this.decodeRequest(event);
      return decoded.outputFormat;
    }

    return null;
  }

  /**
   * Return the output format depending on first four hex values of an image file.
   * @param imageBuffer Image buffer.
   * @returns The output format.
   */
  public inferImageType(imageBuffer: Buffer): string {
    const imageSignatures: { [key: string]: string } = {
      '89504E47': ContentTypes.PNG,
      '52494646': ContentTypes.WEBP,
      '49492A00': ContentTypes.TIFF,
      '4D4D002A': ContentTypes.TIFF,
      '47494638': ContentTypes.GIF,
    };
    const imageSignature = imageBuffer.subarray(0, 4).toString('hex').toUpperCase();
    if (imageSignatures[imageSignature]) {
      return imageSignatures[imageSignature];
    }
    if (imageBuffer.subarray(0, 2).toString('hex').toUpperCase() === 'FFD8') {
      return ContentTypes.JPEG;
    }
    if (imageBuffer.subarray(4, 12).toString('hex').toUpperCase() === '6674797061766966') {
      // FTYPAVIF (File Type AVIF)
      return ContentTypes.AVIF;
    }
    // SVG does not have an imageSignature we can use here, would require parsing the XML to some degree
    throw new ImageHandlerError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'RequestTypeError',
      'The file does not have an extension and the file type could not be inferred. Please ensure that your original image is of a supported file type (jpg/jpeg, png, tiff, webp, gif, avif). Inferring the image type from hex headers is not available for SVG images. Refer to the documentation for additional guidance on forming image requests.',
    );
  }
}
