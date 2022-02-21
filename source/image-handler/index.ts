// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import Rekognition from 'aws-sdk/clients/rekognition';
import S3 from 'aws-sdk/clients/s3';
import SecretsManager from 'aws-sdk/clients/secretsmanager';

import { getOptions } from '../solution-utils/get-options';
import { isNullOrWhiteSpace } from '../solution-utils/helpers';
import { ImageHandler } from './image-handler';
import { ImageRequest } from './image-request';
import { Headers, ImageHandlerEvent, ImageHandlerExecutionResult, StatusCodes } from './lib';
import { SecretProvider } from './secret-provider';

const awsSdkOptions = getOptions();
const s3Client = new S3(awsSdkOptions);
const rekognitionClient = new Rekognition(awsSdkOptions);
const secretsManagerClient = new SecretsManager(awsSdkOptions);
const secretProvider = new SecretProvider(secretsManagerClient);

const { SAVE_OUTPUT_BUCKET } = process.env;

/**
 * Image handler Lambda handler.
 * @param event The image handler request event.
 * @returns Processed request response.
 */
export async function handler(event: ImageHandlerEvent): Promise<ImageHandlerExecutionResult> {
  console.info('Received event:', JSON.stringify(event, null, 2));

  const imageRequest = new ImageRequest(s3Client, secretProvider);
  const imageHandler = new ImageHandler(s3Client, rekognitionClient);
  const isAlb = event.requestContext && Object.prototype.hasOwnProperty.call(event.requestContext, 'elb');
  let headers = getResponseHeaders(false, isAlb);

  const requestType = imageRequest.parseRequestType(event);
  const imageKey = imageRequest.parseImageKey(event, requestType);
  const outputFormat = imageRequest.getOutputFormat(event, requestType);
  const savedOutputCacheKey = `${imageKey}${event.path}.${outputFormat}.base64`;
  if (SAVE_OUTPUT_BUCKET) {
    try {
      const params = {
        Bucket: SAVE_OUTPUT_BUCKET,
        Key: savedOutputCacheKey,
      };
      const cachedOutput = await s3Client.getObject(params).promise();
      headers['Content-Type'] = cachedOutput.ContentType;
      if (cachedOutput.Expires) {
        // eslint-disable-next-line dot-notation
        headers['Expires'] = new Date(cachedOutput.Expires).toUTCString();
      }
      if (cachedOutput.LastModified) {
        headers['Last-Modified'] = new Date(cachedOutput.LastModified).toUTCString();
      }
      headers['Cache-Control'] = cachedOutput.CacheControl;
      headers['X-From-S3-Cache'] = 'true';
      console.info('Served from S3 cache');
      return {
        statusCode: StatusCodes.OK,
        isBase64Encoded: true,
        headers: headers,
        // The response is already base64 encoded
        body: cachedOutput.Body.toString('ascii'),
      };
      
    } catch (err) {
      console.error('Failed to get cached object from S3', savedOutputCacheKey, err);
    }
  }

  try {
    const imageRequestInfo = await imageRequest.setup(event);
    console.info(imageRequestInfo);

    const processedRequest = await imageHandler.process(imageRequestInfo);

    headers['Content-Type'] = imageRequestInfo.contentType;
    // eslint-disable-next-line dot-notation
    headers['Expires'] = imageRequestInfo.expires;
    headers['Last-Modified'] = imageRequestInfo.lastModified;
    headers['Cache-Control'] = imageRequestInfo.cacheControl;

    // Apply the custom headers overwriting any that may need overwriting
    if (imageRequestInfo.headers) {
      headers = { ...headers, ...imageRequestInfo.headers };
    }

    
    if (SAVE_OUTPUT_BUCKET) {
      const params = { 
        Bucket: SAVE_OUTPUT_BUCKET, 
        Key: savedOutputCacheKey, 
        Body: processedRequest, 
        CacheControl: imageRequestInfo.cacheControl, 
        ContentType: imageRequestInfo.contentType 
      };
      try {
        await s3Client.upload(params).promise();
        console.info('Saved to S3', savedOutputCacheKey);
      } catch (err) {
        console.error('Failed to save output to S3', err);
      }
    }

    return {
      statusCode: StatusCodes.OK,
      isBase64Encoded: true,
      headers: headers,
      body: processedRequest
    };
  } catch (error) {
    console.error(error);

    // Default fallback image
    const { ENABLE_DEFAULT_FALLBACK_IMAGE, DEFAULT_FALLBACK_IMAGE_BUCKET, DEFAULT_FALLBACK_IMAGE_KEY } = process.env;
    if (ENABLE_DEFAULT_FALLBACK_IMAGE === 'Yes' && !isNullOrWhiteSpace(DEFAULT_FALLBACK_IMAGE_BUCKET) && !isNullOrWhiteSpace(DEFAULT_FALLBACK_IMAGE_KEY)) {
      try {
        const defaultFallbackImage = await s3Client.getObject({ Bucket: DEFAULT_FALLBACK_IMAGE_BUCKET, Key: DEFAULT_FALLBACK_IMAGE_KEY }).promise();

        const headers = getResponseHeaders(false, isAlb);
        headers['Content-Type'] = defaultFallbackImage.ContentType;
        headers['Last-Modified'] = defaultFallbackImage.LastModified;
        headers['Cache-Control'] = 'max-age=31536000,public';

        return {
          statusCode: error.status ? error.status : StatusCodes.INTERNAL_SERVER_ERROR,
          isBase64Encoded: true,
          headers: headers,
          body: defaultFallbackImage.Body.toString('base64')
        };
      } catch (error) {
        console.error('Error occurred while getting the default fallback image.', error);
      }
    }

    if (error.status) {
      return {
        statusCode: error.status,
        isBase64Encoded: false,
        headers: getResponseHeaders(true, isAlb),
        body: JSON.stringify(error)
      };
    } else {
      return {
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
        isBase64Encoded: false,
        headers: getResponseHeaders(true, isAlb),
        body: JSON.stringify({ message: 'Internal error. Please contact the system administrator.', code: 'InternalError', status: StatusCodes.INTERNAL_SERVER_ERROR })
      };
    }
  }
}

/**
 * Generates the appropriate set of response headers based on a success or error condition.
 * @param isError Has an error been thrown.
 * @param isAlb Is the request from ALB.
 * @returns Headers.
 */
function getResponseHeaders(isError: boolean = false, isAlb: boolean = false): Headers {
  const { CORS_ENABLED, CORS_ORIGIN } = process.env;
  const corsEnabled = CORS_ENABLED === 'Yes';
  const headers: Headers = {
    'Access-Control-Allow-Methods': 'GET',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };

  if (!isAlb) {
    headers['Access-Control-Allow-Credentials'] = true;
  }

  if (corsEnabled) {
    headers['Access-Control-Allow-Origin'] = CORS_ORIGIN;
  }

  if (isError) {
    headers['Content-Type'] = 'application/json';
  }

  return headers;
}
