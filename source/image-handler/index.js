// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

const logger = require("./logger");
const AWS = require("aws-sdk");
const s3 = new AWS.S3();
const rekognition = new AWS.Rekognition();

const ImageRequest = require("./image-request.js");
const ImageHandler = require("./image-handler.js");

exports.handler = async (event) => {
  logger.registerCloudwatchEvent(event);

  const imageRequest = new ImageRequest(s3);
  const imageHandler = new ImageHandler(s3, rekognition);
  const isAlb = event.requestContext && event.requestContext.hasOwnProperty("elb");

  try {
    const request = await imageRequest.setup(event);
    logger.info("Image manipulation request", request);

    let now = Date.now();
    if (request.Expires && request.Expires.getTime() < now) {
      logger.warn("Expired content was requested: " + request.key);
      let headers = getResponseHeaders(410, isAlb);
      return {
        statusCode: 410,
        isBase64Encoded: false,
        headers: headers,
        body: JSON.stringify({
          message: "HTTP/410. Content " + request.key + " has expired.",
          code: "Gone",
          status: 410,
        }),
      };
    } else {
      const processedRequest = await imageHandler.process(request);
      const headers = getResponseHeaders(200, isAlb);
      headers["Content-Type"] = request.ContentType;
      headers["ETag"] = request.ETag;
      if (request.LastModified)
        headers["Last-Modified"] = request.LastModified.toUTCString();
      if (request.Expires) {
        headers["Expires"] = request.Expires.toUTCString();
        let seconds_until_expiry = Math.min(
          31536000,
          Math.floor((request.Expires.getTime() - now) / 1000)
        );
        headers["Cache-Control"] =
          "max-age=" + seconds_until_expiry + ",public";
      } else {
        headers["Cache-Control"] = request.CacheControl;
      }

      if (request.headers) {
        // Apply the custom headers overwriting any that may need overwriting
        for (let key in request.headers) {
          headers[key] = request.headers[key];
        }
      }

      logger.info("Image transformation was successful.", {
        statusCode: 200,
        isBase64Encoded: true,
        headers: headers,
      });

      return {
        statusCode: 200,
        isBase64Encoded: true,
        headers: headers,
        body: processedRequest,
      };
    }
  } catch (err) {
    logger.error(err.message, err);

    // Default fallback image
    if (
      process.env.ENABLE_DEFAULT_FALLBACK_IMAGE === "Yes" &&
      process.env.DEFAULT_FALLBACK_IMAGE_BUCKET &&
      process.env.DEFAULT_FALLBACK_IMAGE_BUCKET.replace(/\s/, "") !== "" &&
      process.env.DEFAULT_FALLBACK_IMAGE_KEY &&
      process.env.DEFAULT_FALLBACK_IMAGE_KEY.replace(/\s/, "") !== ""
    ) {
      try {
        const bucket = process.env.DEFAULT_FALLBACK_IMAGE_BUCKET;
        const objectKey = process.env.DEFAULT_FALLBACK_IMAGE_KEY;
        const defaultFallbackImage = await s3
          .getObject({Bucket: bucket, Key: objectKey})
          .promise();
        const headers = getResponseHeaders(200, isAlb);
        headers["Content-Type"] = defaultFallbackImage.ContentType;
        headers["Last-Modified"] = defaultFallbackImage.LastModified;
        headers["Cache-Control"] = "public, max-age=31536000, immutable";

        return {
          statusCode: err.status ? err.status : 500,
          isBase64Encoded: true,
          headers: headers,
          body: defaultFallbackImage.Body.toString("base64"),
        };
      } catch (error) {
        logger.error(
          "Error occurred while getting the default fallback image.",
          error
        );
      }
    }

    if (err.status) {
      logger.warn("Error occurred during image processing", {
        statusCode: err.status,
        isBase64Encoded: false,
        headers: getResponseHeaders(err.status, isAlb),
        body: JSON.stringify(err),
      });
      return {
        statusCode: err.status,
        isBase64Encoded: false,
        headers: getResponseHeaders(err.status, isAlb),
        body: JSON.stringify(err),
      };
    } else {
      return {
        statusCode: 500,
        isBase64Encoded: false,
        headers: getResponseHeaders(500, isAlb),
        body: JSON.stringify({
          message: "Internal error. Please contact the system administrator.",
          code: "InternalError",
          status: 500,
        }),
      };
    }
  }
};

/**
 * Generates the appropriate set of response headers based on a success
 * or error condition.
 * @param {number} status_code - has an error been thrown?
 * @param {boolean} isAlb - is the request from ALB?
 * @return {object} - Headers object
 */
const getResponseHeaders = (status_code = 200, isAlb = false) => {
  const corsEnabled = process.env.CORS_ENABLED === "Yes";
  const headers = {
    "Access-Control-Allow-Methods": "GET",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
  if (!isAlb) {
    headers["Access-Control-Allow-Credentials"] = true;
  }
  if (corsEnabled) {
    headers["Access-Control-Allow-Origin"] = process.env.CORS_ORIGIN;
  }
  if (200 !== status_code) {
    headers["Content-Type"] = "application/json";
  }
  if (status_code >= 400 && status_code < 500) {
    headers["Cache-Control"] = "public, max-age=7200";
  } else if (status_code >= 500 && status_code < 600) {
    headers["Cache-Control"] = "max-age=0, must-revalidate";
  }
  return headers;
};
