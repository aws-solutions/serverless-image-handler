// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const rekognition = new AWS.Rekognition();
const secretsManager = new AWS.SecretsManager();

const ImageRequest = require('./image-request.js');
const ImageHandler = require('./image-handler.js');

exports.handler = async (event) => {
    console.log(event);
    const imageRequest = new ImageRequest(s3, secretsManager);
    const imageHandler = new ImageHandler(s3, rekognition);
    const isAlb = event.requestContext && event.requestContext.hasOwnProperty('elb');

    try {
        const request = await imageRequest.setup(event);
        console.log(request);

        const processedRequest = await imageHandler.process(request);
        const headers = getResponseHeaders(false, isAlb);
        headers["Content-Type"] = request.ContentType;
        headers["Expires"] = request.Expires;
        headers["Last-Modified"] = request.LastModified;
        headers["Cache-Control"] = request.CacheControl;

        if (request.headers) {
            // Apply the custom headers overwritting any that may need overwriting
            for (let key in request.headers) {
                headers[key] = request.headers[key];
            }
        }

        return {
            statusCode: 200,
            isBase64Encoded: true,
            headers : headers,
            body: processedRequest
        };
    } catch (err) {
        console.error(err);

        // Default fallback image
        if (process.env.ENABLE_DEFAULT_FALLBACK_IMAGE === 'Yes'
            && process.env.DEFAULT_FALLBACK_IMAGE_BUCKET
            && process.env.DEFAULT_FALLBACK_IMAGE_BUCKET.replace(/\s/, '') !== ''
            && process.env.DEFAULT_FALLBACK_IMAGE_KEY
            && process.env.DEFAULT_FALLBACK_IMAGE_KEY.replace(/\s/, '') !== '') {
            try {
                const bucket = process.env.DEFAULT_FALLBACK_IMAGE_BUCKET;
                const objectKey = process.env.DEFAULT_FALLBACK_IMAGE_KEY;
                const defaultFallbackImage = await s3.getObject({ Bucket: bucket, Key: objectKey }).promise();
                const headers = getResponseHeaders(false, isAlb);
                headers['Content-Type'] = defaultFallbackImage.ContentType;
                headers['Last-Modified'] = defaultFallbackImage.LastModified;
                headers['Cache-Control'] = 'max-age=31536000,public';

                return {
                    statusCode: err.status ? err.status : 500,
                    isBase64Encoded: true,
                    headers: headers,
                    body: defaultFallbackImage.Body.toString('base64')
                };
            } catch (error) {
                console.error('Error occurred while getting the default fallback image.', error);
            }
        }

        if (err.status) {
            return {
                statusCode: err.status,
                isBase64Encoded: false,
                headers : getResponseHeaders(true, isAlb),
                body: JSON.stringify(err)
            };
        } else {
            return {
                statusCode: 500,
                isBase64Encoded: false,
                headers : getResponseHeaders(true, isAlb),
                body: JSON.stringify({ message: 'Internal error. Please contact the system administrator.', code: 'InternalError', status: 500 })
            };
        }
    }
}

/**
 * Generates the appropriate set of response headers based on a success
 * or error condition.
 * @param {boolean} isErr - has an error been thrown?
 * @param {boolean} isAlb - is the request from ALB?
 * @return {object} - Headers object
 */
const getResponseHeaders = (isErr = false, isAlb = false) => {
    const corsEnabled = (process.env.CORS_ENABLED === "Yes");
    const headers = {
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
    }
    if (!isAlb) {
        headers["Access-Control-Allow-Credentials"] = true;
    }
    if (corsEnabled) {
        headers["Access-Control-Allow-Origin"] = process.env.CORS_ORIGIN;
    }
    if (isErr) {
        headers["Content-Type"] = "application/json"
    }
    return headers;
}