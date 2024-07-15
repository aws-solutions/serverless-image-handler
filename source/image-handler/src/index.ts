// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { ImageHandler } from './image-handler';
import { ImageRequest } from './image-request';
import { Headers, ImageHandlerExecutionResult, StatusCodes } from './lib';
import { S3 } from '@aws-sdk/client-s3';
import { APIGatewayProxyEventV2 } from 'aws-lambda';
import { Logger } from '@aws-lambda-powertools/logger';
import { LogStashFormatter } from './lib/LogstashFormatter';

const s3Client = new S3();

export const logger = new Logger({
  serviceName: process.env.AWS_LAMBDA_FUNCTION_NAME ?? '',
  logFormatter: new LogStashFormatter(),
});

/**
 * Image handler Lambda handler.
 * @param event The image handler request event.
 * @returns Processed request response.
 */
export async function handler(event: APIGatewayProxyEventV2): Promise<ImageHandlerExecutionResult> {
  logger.appendKeys({ ...event, originalImage: undefined });
  logger.info('Image manipulation request', { headers: event.headers });

  const imageRequest = new ImageRequest(s3Client);
  const imageHandler = new ImageHandler(s3Client);

  try {
    const imageRequestInfo = await imageRequest.setup(event);
    logger.info('image request', { imageRequestInfo });

    if (imageRequestInfo.expires && imageRequestInfo.expires.getTime() < Date.now()) {
      logger.warn('Expired content was requested: ' + imageRequestInfo.key);
      return {
        statusCode: StatusCodes.GONE,
        isBase64Encoded: false,
        headers: getResponseHeaders(true),
        body: JSON.stringify({
          message: 'HTTP/410. Content ' + imageRequestInfo.key + ' has expired.',
          code: 'Gone',
          status: 410,
        }),
      };
    }

    const processedRequest = await imageHandler.process(imageRequestInfo);

    let headers = getResponseHeaders(false);
    headers['Content-Type'] = imageRequestInfo.contentType;

    if (imageRequestInfo.expires) {
      // eslint-disable-next-line dot-notation
      headers['Expires'] = new Date(imageRequestInfo.expires).toUTCString();
      let seconds_until_expiry = Math.min(
        31536000,
        Math.floor((imageRequestInfo.expires.getTime() - Date.now()) / 1000),
      );
      headers['Cache-Control'] = 'max-age=' + seconds_until_expiry + ', immutable';
    } else {
      headers['Cache-Control'] = imageRequestInfo.cacheControl + ', immutable';
    }
    if (imageRequestInfo.lastModified) {
      headers['Last-Modified'] = new Date(imageRequestInfo.lastModified).toUTCString();
    }

    // Apply the custom headers overwriting any that may need overwriting
    if (imageRequestInfo.headers) {
      headers = { ...headers, ...imageRequestInfo.headers };
    }

    return {
      statusCode: StatusCodes.OK,
      isBase64Encoded: true,
      headers,
      body: processedRequest,
    };
  } catch (error) {
    if (error.code && error.code !== 'NoSuchKey') {
      logger.warn('Error occurred during image processing', { error });
    }
    const { statusCode, body } = getErrorResponse(error);
    return {
      statusCode,
      isBase64Encoded: false,
      headers: getResponseHeaders(true),
      body,
    };
  }
}

/**
 * Generates the appropriate set of response headers based on a success or error condition.
 * @param isError Has an error been thrown.
 * @returns Headers.
 */
function getResponseHeaders(isError: boolean = false): Headers {
  const { CORS_ENABLED, CORS_ORIGIN } = process.env;
  const corsEnabled = CORS_ENABLED === 'Yes';
  const headers: Headers = {
    'Access-Control-Allow-Methods': 'GET',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (corsEnabled) {
    headers['Access-Control-Allow-Origin'] = CORS_ORIGIN;
  }

  if (isError) {
    headers['Content-Type'] = 'application/json';
  }

  return headers;
}

/**
 * Determines the appropriate error response values
 * @param error The error object from a try/catch block
 * @returns appropriate status code and body
 */
export function getErrorResponse(error) {
  if (error?.status) {
    return {
      statusCode: error.status,
      body: JSON.stringify(error),
    };
  }
  /**
   * if an image overlay is attempted and the overlaying image has greater dimensions
   * that the base image, sharp will throw an exception and return this string
   */
  if (error?.message === 'Image to composite must have same dimensions or smaller') {
    return {
      statusCode: StatusCodes.BAD_REQUEST,
      body: JSON.stringify({
        /**
         * return a message indicating overlay dimensions is the issue, the caller may not
         * know that the sharp composite function was used
         */
        message: 'Image to overlay must have same dimensions or smaller',
        code: 'BadRequest',
        status: StatusCodes.BAD_REQUEST,
      }),
    };
  }
  return {
    statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
    body: JSON.stringify({
      message: 'Internal error. Please contact the system administrator.',
      code: 'InternalError',
      status: StatusCodes.INTERNAL_SERVER_ERROR,
    }),
  };
}
