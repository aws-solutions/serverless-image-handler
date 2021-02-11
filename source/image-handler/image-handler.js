// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

const logger = require("./logger");
const sharp = require("sharp");

class ImageHandler {
  constructor(s3, rekognition) {
    this.s3 = s3;
    this.rekognition = rekognition;
  }

  /**
   * Main method for processing image requests and outputting modified images.
   * @param {ImageRequest} request - An ImageRequest object.
   */
  async process(request) {
    let returnImage = "";
    const originalImage = request.originalImage;
    const edits = request.edits;
    const cropping = request.cropping;

    logger.log("Image process parameters", { cropping, edits });

    const hasEdits = edits !== undefined && Object.keys(edits).length > 0;
    const hasCropping = cropping !== undefined;
    if (hasEdits || hasCropping) {
      let image;
      let keys = [];
      if (hasEdits) {
        keys = Object.keys(edits);
      }

      if (keys.includes("rotate") && edits.rotate === null) {
        image = sharp(originalImage, { failOnError: false });
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
        image = await this.applyCropping(image, cropping);
      }
      if (hasEdits) {
        image = await this.applyEdits(image, edits);
      }

      if (request.outputFormat !== undefined) {
        image.toFormat(request.outputFormat);
      }
      const bufferImage = await image.toBuffer();
      returnImage = bufferImage.toString("base64");
    } else {
      returnImage = originalImage.toString("base64");
    }

    // If the converted image is larger than Lambda's payload hard limit, throw an error.
    let lambdaPayloadLimit = 6 * 1024 * 1024;
    if (request.isAlb) {
      // lambda attached to ALB have a one MB hard limit
      lambdaPayloadLimit = 1 * 1024 * 1024;
    }
    if (returnImage.length > lambdaPayloadLimit) {
      throw {
        status: 413,
        code: "TooLargeImageException",
        message:
          "The converted image is too large to return. Actual = " +
          returnImage.length +
          " - max " +
          lambdaPayloadLimit,
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
  async applyEdits(image, edits) {
    if (edits.resize === undefined) {
      edits.resize = {};
      edits.resize.fit = "inside";
    } else {
      if (edits.resize.width) edits.resize.width = Number(edits.resize.width);
      if (edits.resize.height)
        edits.resize.height = Number(edits.resize.height);
    }

    // Apply the image edits
    for (const editKey in edits) {
      const value = edits[editKey];
      if (editKey === "overlayWith") {
        const metadata = await image.metadata();
        let imageMetadata = metadata;
        if (edits.resize) {
          let imageBuffer = await image.toBuffer();
          imageMetadata = await sharp(imageBuffer)
            .resize({ edits: { resize: edits.resize } })
            .metadata();
        }

        const { bucket, key, wRatio, hRatio, alpha } = value;
        const overlay = await this.getOverlayImage(
          bucket,
          key,
          wRatio,
          hRatio,
          alpha,
          imageMetadata
        );
        const overlayMetadata = await sharp(overlay).metadata();

        let { options } = value;
        if (options) {
          if (options.left !== undefined) {
            let left = options.left;
            if (isNaN(left) && left.endsWith("p")) {
              left = parseInt(left.replace("p", ""));
              if (left < 0) {
                left =
                  imageMetadata.width +
                  (imageMetadata.width * left) / 100 -
                  overlayMetadata.width;
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
            if (isNaN(top) && top.endsWith("p")) {
              top = parseInt(top.replace("p", ""));
              if (top < 0) {
                top =
                  imageMetadata.height +
                  (imageMetadata.height * top) / 100 -
                  overlayMetadata.height;
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
      } else if (editKey === "smartCrop") {
        const options = value;
        const metadata = await image.metadata();
        const imageBuffer = await image.toBuffer();
        const boundingBox = await this.getBoundingBox(
          imageBuffer,
          options.faceIndex
        );
        const cropArea = this.getCropArea(boundingBox, options, metadata);
        try {
          image.extract(cropArea);
        } catch (err) {
          throw {
            status: 400,
            code: "SmartCrop::PaddingOutOfBounds",
            message:
              "The padding value you provided exceeds the boundaries of the original image. Please try choosing a smaller value or applying padding via Sharp for greater specificity.",
          };
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
    bucket,
    key,
    wRatio,
    hRatio,
    alpha,
    sourceImageMetadata
  ) {
    const params = { Bucket: bucket, Key: key };
    try {
      const { width, height } = sourceImageMetadata;
      const overlayImage = await this.s3.getObject(params).promise();
      let resize = {
        fit: "inside",
      };

      // Set width and height of the watermark image based on the ratio
      const zeroToHundred = /^(100|[1-9]?[0-9])$/;
      if (zeroToHundred.test(wRatio)) {
        resize["width"] = parseInt((width * wRatio) / 100);
      }
      if (zeroToHundred.test(hRatio)) {
        resize["height"] = parseInt((height * hRatio) / 100);
      }

      // If alpha is not within 0-100, the default alpha is 0 (fully opaque).
      if (zeroToHundred.test(alpha)) {
        alpha = parseInt(alpha);
      } else {
        alpha = 0;
      }

      const convertedImage = await sharp(overlayImage.Body)
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
            blend: "dest-in",
          },
        ])
        .toBuffer();
      return convertedImage;
    } catch (err) {
      throw {
        status: err.statusCode ? err.statusCode : 500,
        code: err.code,
        message: err.message,
      };
    }
  }

  /**
   * Calculates the crop area for a smart-cropped image based on the bounding
   * box data returned by Amazon Rekognition, as well as padding options and
   * the image metadata.
   * @param {Object} boundingBox - The boudning box of the detected face.
   * @param {Object} options - Set of options for smart cropping.
   * @param {Object} metadata - Sharp image metadata.
   */
  getCropArea(boundingBox, options, metadata) {
    const padding =
      options.padding !== undefined ? parseFloat(options.padding) : 0;
    // Calculate the smart crop area
    const cropArea = {
      left: parseInt(boundingBox.Left * metadata.width - padding),
      top: parseInt(boundingBox.Top * metadata.height - padding),
      width: parseInt(boundingBox.Width * metadata.width + padding * 2),
      height: parseInt(boundingBox.Height * metadata.height + padding * 2),
    };
    // Return the crop area
    return cropArea;
  }

  /**
   * Gets the bounding box of the specified face index within an image, if specified.
   * @param {Sharp} imageBuffer - The original image.
   * @param {Integer} faceIndex - The zero-based face index value, moving from 0 and up as
   * confidence decreases for detected faces within the image.
   */
  async getBoundingBox(imageBuffer, faceIndex) {
    const params = { Image: { Bytes: imageBuffer } };
    const faceIdx = faceIndex !== undefined ? faceIndex : 0;
    try {
      const response = await this.rekognition.detectFaces(params).promise();
      return response.FaceDetails[faceIdx].BoundingBox;
    } catch (err) {
      logger.error(err);
      if (err.message === "Cannot read property 'BoundingBox' of undefined") {
        throw {
          status: 400,
          code: "SmartCrop::FaceIndexOutOfRange",
          message:
            "You have provided a FaceIndex value that exceeds the length of the zero-based detectedFaces array. Please specify a value that is in-range.",
        };
      } else {
        throw {
          status: 500,
          code: err.code,
          message: err.message,
        };
      }
    }
  }

  async applyCropping(image, cropping) {
    return image.extract(cropping);
  }
}

// Exports
module.exports = ImageHandler;
