// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0


import {Logger} from '@aws-lambda-powertools/logger'
import {LogStashFormatter} from "./lib/logging/LogStashFormatter";
import {ThumborMapping} from "./thumbor-mapping";
import {GetObjectCommandOutput, S3} from "@aws-sdk/client-s3";
import {APIGatewayProxyEventV2} from "aws-lambda";
import sharp from "sharp";

const logger = new Logger({
  serviceName: process.env.AWS_LAMBDA_FUNCTION_NAME ?? '',
  logFormatter: new LogStashFormatter(),
})


export class ImageRequest {

  requestType: any;
  bucket: any;
  key: any;
  edits: any;
  cropping: any;
  originalImage: any;
  ContentType: any;
  outputFormat: any;
  Expires: any;
  LastModified: any;
  CacheControl: any;
  ETag: any;
  private s3: any;

  constructor(s3: S3) {
    this.s3 = s3
  }

  /**
   * Initializer function for creating a new image request, used by the image
   * handler to perform image modifications.
   * @param {object} event - Lambda request body.
   */
  async setup(event: APIGatewayProxyEventV2): Promise<ImageRequest> {


    this.requestType = this.parseRequestType(event);
    this.bucket = this.parseImageBucket(event, this.requestType);
    this.key = this.parseImageKey(event, this.requestType);
    this.edits = this.parseImageEdits(event, this.requestType);
    this.cropping = this.parseCropping(event, this.requestType);
    this.originalImage = await this.getOriginalImage(this.bucket, this.key);

    // If the original image is SVG file and it has any edits but no output format, change the format to WebP.
    if (this.ContentType === "image/svg+xml" &&
      this.edits &&
      Object.keys(this.edits).length > 0 &&
      !this.edits.toFormat) {
      this.outputFormat = "png";
    }

    /* Decide the output format of the image.
     * 1) If the format is provided, the output format is the provided format.
     * 2) If headers contain "Accept: image/webp", the output format is webp.
     * 3) If headers contain "Accept: image/avif", the output format is webp.
     * 4) Use the default image format for the rest of cases.
     */
    if (this.ContentType !== 'image/svg+xml' || this.edits.toFormat || this.outputFormat) {
      let outputFormat = this.getOutputFormat(event);
      if (this.edits && this.edits.toFormat) {
        this.outputFormat = this.edits.toFormat;
      } else if (outputFormat) {
        this.outputFormat = outputFormat;
      }
    }

    // Fix quality for Thumbor and Custom request type if outputFormat is different from quality type.
    if (this.outputFormat) {
      const requestType = ["Custom", "Thumbor"];
      const acceptedValues = ["jpeg", "png", "webp", "tiff", "heif", "avif"];

      this.ContentType = `image/${this.outputFormat}`;
      if (
        requestType.includes(this.requestType) &&
        acceptedValues.includes(this.outputFormat)
      ) {
        let qualityKey = Object.keys(this.edits).filter((key) =>
          acceptedValues.includes(key)
        )[0];
        if (qualityKey && qualityKey !== this.outputFormat) {
          const qualityValue = this.edits[qualityKey];
          this.edits[this.outputFormat] = qualityValue;
          delete this.edits[qualityKey];
        }
      }
    }

    delete this.s3;

    return this;
  }

  /**
   * Gets the original image from an Amazon S3 bucket.
   * @param {string} bucket - The name of the bucket containing the image.
   * @param {string} key - The key name corresponding to the image.
   * @return {Promise} - The original image or an error.
   */
  async getOriginalImage(bucket: string, key: string): Promise<any> {
    const imageLocation = {Bucket: bucket, Key: key};
    try {
      const originalImage: GetObjectCommandOutput = await this.s3.getObject(imageLocation);
      const metaData = originalImage['Metadata'];
      const isGone = metaData && metaData['buzz-status-code'] && metaData['buzz-status-code'] === '410'

      const imageBuffer = Buffer.from(await originalImage.Body?.transformToByteArray()!);

      if (originalImage.ContentType) {
        // If using default s3 ContentType infer from hex headers
        if (originalImage.ContentType === 'binary/octet-stream') {
          this.ContentType = this.inferImageType(imageBuffer);
        } else {
          this.ContentType = originalImage.ContentType;
        }
      } else {
        this.ContentType = "image";
      }

      if (originalImage.Expires) {
        this.Expires = new Date(originalImage.Expires);
      } else if (isGone) {
        logger.warn(`Content ${imageLocation} is gone`)
        this.Expires = new Date(0);
      }

      if (originalImage.LastModified) {
        this.LastModified = new Date(originalImage.LastModified);
      }

      if (originalImage.CacheControl && !originalImage.CacheControl.includes("31536000")) {
        this.CacheControl = originalImage.CacheControl;
      } else {
        this.CacheControl = "max-age=31536000, immutable";
      }

      if (originalImage.ETag) {
        this.ETag = originalImage.ETag;
      }

      return imageBuffer;
    } catch (err: any) {
      throw {
        status: "NoSuchKey" === (err?.code || err?.Code || err).toString() ? 404 : 500,
        code: (err?.code || err?.Code || err).toString(),
        message: err.message
      };
    }
  }

  /**
   * Parses the name of the appropriate Amazon S3 bucket to source the
   * original image from.
   * @param {string} event - Lambda request body.
   * @param {string} requestType - Image handler request type.
   */
  parseImageBucket(event: APIGatewayProxyEventV2, requestType: string) {
    if (requestType === "Thumbor" || requestType === "Custom") {
      // Use the default image source bucket env var
      const sourceBuckets = this.getAllowedSourceBuckets();
      return sourceBuckets[0];
    } else {
      throw {
        status: 404,
        code: "ImageBucket::CannotFindBucket",
        message:
          "The bucket you specified could not be found. Please check the spelling of the bucket name in your request."
      };
    }
  }

  /**
   * Parses the edits to be made to the original image.
   * @param {string} event - Lambda request body.
   * @param {string} requestType - Image handler request type.
   */
  parseImageEdits(event: APIGatewayProxyEventV2, requestType: string) {
    if (requestType === "Thumbor") {
      const thumborMapping = new ThumborMapping();
      thumborMapping.process(event);
      return thumborMapping.edits;
    } else {
      throw {
        status: 400,
        code: "ImageEdits::CannotParseEdits",
        message:
          "The edits you provided could not be parsed. Please check the syntax of your request and refer to the documentation for additional guidance."
      };
    }
  }

  parseCropping(event: APIGatewayProxyEventV2, requestType: string) {
    if (requestType === "Thumbor") {
      const thumborMapping = new ThumborMapping();
      thumborMapping.process(event);
      return thumborMapping.cropping;
    } else {
      throw {
        status: 400,
        code: "Cropping::CannotParseCropping",
        message:
          "The cropping you provided could not be parsed. Please check the syntax of your request and refer to the documentation for additional guidance."
      };
    }
  }

  /**
   * Parses the name of the appropriate Amazon S3 key corresponding to the
   * original image.
   * @param {String} event - Lambda request body.
   * @param {String} requestType - Type, either "Default", "Thumbor", or "Custom".
   */
  parseImageKey(event: APIGatewayProxyEventV2, requestType: string) {
    if (requestType === "Thumbor" || requestType === "Custom") {
      let path = event.rawPath;

      if (requestType === "Custom") {
        const matchPattern = process.env.REWRITE_MATCH_PATTERN;
        const substitution = process.env.REWRITE_SUBSTITUTION;

        if (matchPattern) {
          const patternStrings = matchPattern.split("/");
          const flags = patternStrings.pop();
          const parsedPatternString = matchPattern.slice(1, matchPattern.length - 1 - flags!.length);
          const regExp = new RegExp(parsedPatternString, flags);
          path = path.replace(regExp, substitution ?? "");
        } else {
          path = path.replace(matchPattern || "", substitution || "");
        }
      }
      path = path
        .replace(/^(\/)?authors\//, '$1')
        .replace(/\/\d+x\d+:\d+x\d+\//g, "/")
        .replace(/\/(\d+|__WIDTH__)x\d+\//g, "/")
        .replace(/\/filters:[^\/]+/g, "/")
        .replace(/\/fit-in\//g, "/")
        .replace(/^\/+/, "")
        .replace(/\/+/g, "/");

      if (path.match(/^\d{4}\/\d{2}\/.*\/[\w-]+\.\w+$/)) {
        path = path.replace(/(.*)\/[\w-]+(\.\w+)$/, "$1/image$2");
      }
      if (path.endsWith("/")) {
        path = path + "image.jpg"
      }
      return decodeURIComponent(path);
    }

    // Return an error for all other conditions
    throw {
      status: 404,
      code: "ImageEdits::CannotFindImage",
      message:
        "The image you specified could not be found. Please check your request syntax as well as the bucket you specified to ensure it exists."
    };
  }

  /**
   * Determines how to handle the request being made based on the URL path
   * prefix to the image request. Categorizes a request as either "image"
   * (uses the Sharp library), "thumbor" (uses Thumbor mapping), or "custom"
   * (uses the rewrite function).
   * @param {object} event - Lambda request body.
   */
  parseRequestType(event: APIGatewayProxyEventV2) {
    const path = event.rawPath;
    const matchThumbor = new RegExp(/^(\/?)((fit-in)?|(filters:.+\(.?\))?|(unsafe)?).*(\.+jpg|\.+png|\.+webp|\.tiff|\.jpeg|\.svg|\.gif|\.avif)$/i);

    if (matchThumbor.test(path) || path.endsWith("/")) {
      // use thumbor mappings
      return "Thumbor";
    } else {
      throw {
        status: 400,
        code: "RequestTypeError",
        message:
          "The type of request you are making could not be processed. Please ensure that your original image is of a supported file type (jpg, png, tiff, webp, svg, gif, avif) and that your image request is provided in the correct syntax. Refer to the documentation for additional guidance on forming image requests."
      };
    }
  }

  /**
   * Returns a formatted image source bucket whitelist as specified in the
   * SOURCE_BUCKETS environment variable of the image handler Lambda
   * function. Provides error handling for missing/invalid values.
   */
  getAllowedSourceBuckets() {
    const sourceBuckets = process.env.SOURCE_BUCKETS;
    if (sourceBuckets === undefined) {
      throw {
        status: 400,
        code: "GetAllowedSourceBuckets::NoSourceBuckets",
        message:
          "The SOURCE_BUCKETS variable could not be read. Please check that it is not empty and contains at least one source bucket, or multiple buckets separated by commas. Spaces can be provided between commas and bucket names, these will be automatically parsed out when decoding."
      };
    } else {
      const formatted = sourceBuckets.replace(/\s+/g, "");
      return formatted.split(",");
    }
  }

  /**
   * Return the output format depending on the accepts headers and request type
   * @param {Object} event - The request body.
   * @param requestType
   */
  getOutputFormat(event: APIGatewayProxyEventV2): keyof sharp.FormatEnum | null {
    const autoWebP = process.env.AUTO_WEBP;
    const autoAvif = process.env.AUTO_AVIF;
    let accept = (event.headers?.Accept || event.headers?.accept) ?? "";
    if (autoAvif === "Yes" && accept && accept.includes("image/avif")) {
      return "avif";
    } else if (autoWebP === "Yes" && accept && accept.includes("image/webp")) {
      return "webp";
    }
    return null;
  }

  /**
   * Return the output format depending on first four hex values of an image file.
   * @param {Buffer} imageBuffer - Image buffer.
   */
  inferImageType(imageBuffer: Buffer) {
    switch (imageBuffer.toString("hex").substring(0, 8).toUpperCase()) {
      case "89504E47":
        return "image/png";
      case "FFD8FFDB":
        return "image/jpeg";
      case "FFD8FFE0":
        return "image/jpeg";
      case "FFD8FFEE":
        return "image/jpeg";
      case "FFD8FFE1":
        return "image/jpeg";
      case "52494646":
        return "image/webp";
      case "49492A00":
        return "image/tiff";
      case "4D4D002A":
        return "image/tiff";
      default:
        throw {
          status: 500,
          code: "RequestTypeError",
          message:
            "The file does not have an extension and the file type could not be inferred. Please ensure that your original image is of a supported file type (jpg, png, tiff, webp, svg, avif). Refer to the documentation for additional guidance on forming image requests.",
        };
    }
  }
}