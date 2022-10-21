// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import Rekognition from 'aws-sdk/clients/rekognition';
import S3 from 'aws-sdk/clients/s3';
import SecretsManager from 'aws-sdk/clients/secretsmanager';
import SSM from 'aws-sdk/clients/ssm';
import jwt from 'jsonwebtoken';
import { createHash } from 'crypto';

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

/**
 * Image handler Lambda handler.
 * @param event The image handler request event.
 * @returns Processed request response.
 */
export async function handler(event: ImageHandlerEvent): Promise<ImageHandlerExecutionResult> {
  console.info('Received event:', JSON.stringify(event, null, 2));

  const { DEFAULT_AUTO_GENERATED_IMAGE_PREFIX, DEFAULT_PRESIGNED_URL_EXPIRES } = process.env;

  const imageRequest = new ImageRequest(s3Client, secretProvider);
  const imageHandler = new ImageHandler(s3Client, rekognitionClient);
  const isAlb = event.requestContext && Object.prototype.hasOwnProperty.call(event.requestContext, 'elb');

  try {
    const validJwt = await validateJwt(event);
    if (validJwt !== true)
      return {
        statusCode: StatusCodes.UNAUTHORIZED,
        isBase64Encoded: false,
        headers: getResponseHeaders(true, isAlb),
        body: JSON.stringify({ message: 'Unauthorized. Check the bearer token on your authorization header.', code: 'Unauthorized', status: StatusCodes.UNAUTHORIZED })
      };

    let headers = getResponseHeaders(false, isAlb);

    const imageRequestInfo = await imageRequest.setup(event);

    // eslint-disable-next-line dot-notation
    headers['Expires'] = imageRequestInfo.expires;
    headers['Last-Modified'] = imageRequestInfo.lastModified;

    // Apply the custom headers overwriting any that may need overwriting
    if (imageRequestInfo.headers) {
      headers = { ...headers, ...imageRequestInfo.headers };
    }

    if (imageRequestInfo.edits !== undefined && imageRequestInfo.edits !== null) {
      const optionsHash = createHash('sha256').update(JSON.stringify(imageRequestInfo.edits)).digest('hex');
      const autoGeneratedImageFilename = `${DEFAULT_AUTO_GENERATED_IMAGE_PREFIX}-${optionsHash}-${imageRequestInfo.key}`;
      try {
        await s3Client.headObject({ Bucket: imageRequestInfo.bucket, Key: autoGeneratedImageFilename }).promise();
        const signedUrl = s3Client.getSignedUrl('getObject', { Bucket: imageRequestInfo.bucket, Key: autoGeneratedImageFilename, Expires: parseInt(DEFAULT_PRESIGNED_URL_EXPIRES) });

        headers['Cache-Control'] = `max-age=${parseInt(DEFAULT_PRESIGNED_URL_EXPIRES)},public`;
        headers['Content-Type'] = 'application/json';
        return {
          statusCode: StatusCodes.OK,
          isBase64Encoded: false,
          headers: headers,
          body: JSON.stringify({ presignedUrl: signedUrl })
        };
      } catch (error) {
        console.log(`key ${autoGeneratedImageFilename} not found in bucket ${imageRequestInfo.bucket}`);
      }
    }

    const processedRequest = await imageHandler.process(imageRequestInfo);

    if (imageRequestInfo.edits !== undefined && imageRequestInfo.edits !== null) {
      const optionsHash = createHash('sha256').update(JSON.stringify(imageRequestInfo.edits)).digest('hex');
      const autoGeneratedImageFilename = `${DEFAULT_AUTO_GENERATED_IMAGE_PREFIX}-${optionsHash}-${imageRequestInfo.key}`;
      const s3PutObjectParams = {
        Bucket: imageRequestInfo.bucket,
        Body: Buffer.from(processedRequest, 'base64'),
        Key: autoGeneratedImageFilename,
        ContentType: imageRequestInfo.contentType
      };

      await s3Client.putObject(s3PutObjectParams).promise();
      const signedUrl = s3Client.getSignedUrl('getObject', { Bucket: imageRequestInfo.bucket, Key: autoGeneratedImageFilename, Expires: parseInt(DEFAULT_PRESIGNED_URL_EXPIRES) });

      headers['Cache-Control'] = `max-age=${parseInt(DEFAULT_PRESIGNED_URL_EXPIRES)},public`;
      headers['Content-Type'] = 'application/json';
      return {
        statusCode: StatusCodes.OK,
        isBase64Encoded: false,
        headers: headers,
        body: JSON.stringify({ presignedUrl: signedUrl })
      };
    }

    headers['Content-Type'] = imageRequestInfo.contentType;
    headers['Cache-Control'] = imageRequestInfo.cacheControl;
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
 * Checks the JWT reading the authorization header and parameters from AWS SSM.
 * @param event The image handler request event.
 * @returns Boolean to indicate if its a valid JWT.
 */
async function validateJwt(event: ImageHandlerEvent): Promise<boolean> {
  let isValidJwt = false;
  const { JWT_SECRET_KEY_LOCATION } = process.env;
  try {
    const rawToken = event.headers['Authorization'];
    if (rawToken === undefined) return isValidJwt;
    
    const token = rawToken.replace("Bearer ", "");
    await new SSM().getParameter({
      Name: `${JWT_SECRET_KEY_LOCATION}`,
      WithDecryption: true,
    }).promise()
      .then((data: any) => {
        const decoded = jwt.verify(token, data.Parameter.Value);
        if (decoded) { isValidJwt = true };
      }).catch((err: any) => { console.error(err); });
  } catch (error) {
    console.error(error);
  }
  return isValidJwt;
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
