// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

const AWS = require('aws-sdk');
const axios = require('axios');
const uuid = require('uuid');
const crypto = require('crypto');

const s3 = new AWS.S3();
const s3USEast = new AWS.S3({apiVersion: '2006-03-01', region: 'us-east-1'});
const secretsManager = new AWS.SecretsManager();
const METRICS_ENDPOINT = 'https://metrics.awssolutionsbuilder.com/generic';

/**
 * Request handler.
 */
exports.handler = async (event, context) => {
    console.log('Received event:', JSON.stringify(event, null, 2));

    const properties = event.ResourceProperties;
    let response = {
        status: 'SUCCESS',
        data: {}
    };

    try {
        switch (properties.customAction) {
            case 'sendMetric':
                if (properties.anonymousData === 'Yes') {
                    const anonymousProperties = {
                        SolutionId: properties.solutionId,
                        UUID: properties.UUID,
                        Version: properties.version,
                        EnableSignature: properties.enableSignature,
                        EnableDefaultFallbackImage: properties.enableDefaultFallbackImage,
                        Type: event.RequestType
                    };

                    response.data = await sendAnonymousUsage(anonymousProperties);
                }
                break;
            case 'putConfigFile':
                if (['Create', 'Update'].includes(event.RequestType)) {
                    const { configItem, destS3Bucket, destS3key } = properties;
                    response.data = await putConfigFile(configItem, destS3Bucket, destS3key);
                }
                break;
            case 'copyS3assets':
                if (['Create', 'Update'].includes(event.RequestType)) {
                    const { manifestKey, sourceS3Bucket, sourceS3key, destS3Bucket } = properties;
                    response.data = await copyAssets(manifestKey, sourceS3Bucket, sourceS3key, destS3Bucket);
                }
                break;
            case 'createUuid':
                if (['Create', 'Update'].includes(event.RequestType)) {
                    response.data = { UUID: uuid.v4() };
                }
                break;
            case 'checkSourceBuckets':
                if (['Create', 'Update'].includes(event.RequestType)) {
                    const { sourceBuckets } = properties;
                    response.data = await validateBuckets(sourceBuckets);
                }
                break;
            case 'checkSecretsManager':
                if (['Create', 'Update'].includes(event.RequestType)) {
                    const { secretsManagerName, secretsManagerKey } = properties;
                    response.data = await checkSecretsManager(secretsManagerName, secretsManagerKey);
                }
                break;
            case 'checkFallbackImage':
                if (['Create', 'Update'].includes(event.RequestType)) {
                    const { fallbackImageS3Bucket, fallbackImageS3Key } = properties;
                    response.data = await checkFallbackImage(fallbackImageS3Bucket, fallbackImageS3Key);
                }
                break;
            case 'createCFLoggingBucket':
                if(['Create'].includes(event.RequestType)) {
                    const stackName = properties.stackName;
                    let bucketPolicyStatement = properties.policy;
                    const currentDate = new Date();
                    const bucketSuffix = crypto.createHash('md5').update(properties.bucketSuffix + currentDate.getTime()).digest("hex");
                    response.data = await createLoggingBucket(stackName, bucketSuffix, bucketPolicyStatement);
                }
                break;                
            default:
                break;
        }
    } catch (error) {
        console.error(`Error occurred at ${event.RequestType}::${properties.customAction}`, error);
        response = {
          status: 'FAILED',
          data: {
            Error: {
                code: error.code ? error.code : 'CustomResourceError',
                message: error.message ? error.message : 'Custom resource error occurred.'
            }
          }
        }
    } finally {
        await sendResponse(event, context.logStreamName, response);
    }

    return response;
}

/**
 * Sends a response to the pre-signed S3 URL
 * @param {object} event - Custom resource event
 * @param {string} logStreamName - Custom resource log stream name
 * @param {object} response - Response object { status: "SUCCESS|FAILED", data: any }
 */
async function sendResponse(event, logStreamName, response) {
    let reason = `See the details in CloudWatch Log Stream: ${logStreamName}`;
    if (response.status === 'FAILED') {
        reason = `[${response.data.Error.code}] ${reason}`;
    }

    const responseBody = JSON.stringify({
        Status: response.status,
        Reason: reason,
        PhysicalResourceId: logStreamName,
        StackId: event.StackId,
        RequestId: event.RequestId,
        LogicalResourceId: event.LogicalResourceId,
        Data: response.data,
    });

    console.log(`RESPONSE BODY: ${responseBody}`);

    const config = {
        headers: {
            'Content-Type': '',
            'Content-Length': responseBody.length
        }
    };

    return await axios.put(event.ResponseURL, responseBody, config);
}

/**
 * Sends anonymous usage.
 * @param {object} properties - Anonymous properties object { SolutionId: string, UUID: string, Version: String, Type: "Create|Update|Delete" }
 * @return {Promise} - Promise mesage object
 */
async function sendAnonymousUsage(properties) {
    const config = {
        headers: {
            'Content-Type': 'application/json'
        }
    };
    const data = {
        Solution: properties.SolutionId,
        TimeStamp: `${new Date().toISOString().replace(/T/, ' ')}`,
        UUID: properties.UUID,
        Version: properties.Version,
        Data: {
            Region: process.env.AWS_REGION,
            Type: properties.Type,
            EnableSignature: properties.EnableSignature,
            EnableDefaultFallbackImage: properties.EnableDefaultFallbackImage
        }
    };

    try {
        await axios.post(METRICS_ENDPOINT, data, config);
        return {
            Message: 'Anonymous data was sent successfully.',
            Data: data
        };
    } catch (error) {
        console.error('Error to send anonymous usage.');
        return {
            Message: 'Anonymous data was sent failed.',
            Data: data
        };
    }
}

/**
 * Checks if AWS Secrets Manager secret is valid.
 * @param {string} secretName AWS Secrets Manager secret name
 * @param {string} secretKey AWS Secrets Manager secret's key name
 * @return {Promise} ARN of the AWS Secrets Manager secret
 */
async function checkSecretsManager(secretName, secretKey) {
    if (!secretName || secretName.replace(/\s/g, '') === '') {
        throw {
            code: 'SecretNotProvided',
            message: 'You need to provide AWS Secrets Manager secert.'
        };
    }
    if (!secretKey || secretKey.replace(/\s/g, '') === '') {
        throw {
            code: 'SecretKeyNotProvided',
            message: 'You need to provide AWS Secrets Manager secert key.'
        };
    }

    const retryCount = 3;
    let arn = '';

    for (let retry = 1; retry <= retryCount; retry++) {
        try {
            const response = await secretsManager.getSecretValue({ SecretId: secretName }).promise();
            const secretString = JSON.parse(response.SecretString);

            if (secretString[secretKey] === undefined) {
                throw {
                    code: 'SecretKeyNotFound',
                    message: `AWS Secrets Manager secret requries ${secretKey} key.`
                };
            }

            arn = response.ARN;
            break;
        } catch (error) {
            if (retry === retryCount) {
                console.error(`AWS Secrets Manager secret or signature might not exist: ${secretName}/${secretKey}`);
                throw error;
            } else {
                console.log('Waiting for retry...');
                await sleep(retry);
            }
        }
    }

    return {
        Message: 'Secrets Manager validated.',
        ARN: arn
    };
}

/**
 * Puts the config file into S3 bucket.
 * @param {string} config The config of the config file
 * @param {string} bucket Bucket to put the config file
 * @param {string} objectKey The config file key
 * @return {Promise} Result of the putting config file
 */
async function putConfigFile(config, bucket, objectKey) {
    console.log(`Attempting to save content blob destination location: ${bucket}/${objectKey}`);
    console.log(JSON.stringify(config, null, 2));

    let content = `'use strict';\n\nconst appVariables = {\nCONTENT\n};`;
    let stringBuilder = [];

    for (let key in config) {
        stringBuilder.push(`${key}: '${config[key]}'`);
    }
    content = stringBuilder.length > 0 ? content.replace('CONTENT', stringBuilder.join(',\n')) : content.replace('CONTENT', '');

    const retryCount = 3;
    const params = {
        Bucket: bucket,
        Body: content,
        Key: objectKey,
        ContentType: getContentType(objectKey)
    };

    for (let retry = 1; retry <= retryCount; retry++) {
        try {
            await s3.putObject(params).promise();
            break;
        } catch (error) {
            if (retry === retryCount || error.code !== 'AccessDenied') {
                console.error(`Error creating ${bucket}/${objectKey} content`, error);
                throw {
                    code: 'ConfigFileCreationFailure',
                    message: `Saving config file to ${bucket}/${objectKey} failed.`
                };
            } else {
                console.log('Waiting for retry...');
                await sleep(retry);
            }
        }
    }

    return {
        Message: 'Config file uploaded.',
        Content: content
    };
}

/**
 * Copies assets from the source S3 bucket to the destination S3 bucket.
 * @param {string} manifestKey Assets manifest key
 * @param {string} sourceS3Bucket Source S3 bucket
 * @param {string} sourceS3prefix Source S3 prefix
 * @param {string} destS3Bucket Destination S3 bucket
 * @return {Promise} The result of copying assets
 */
async function copyAssets(manifestKey, sourceS3Bucket, sourceS3prefix, destS3Bucket) {
    console.log(`source bucket: ${sourceS3Bucket}`);
    console.log(`source prefix: ${sourceS3prefix}`);
    console.log(`destination bucket: ${destS3Bucket}`);

    const retryCount = 3;
    let manifest = {};

    // Download manifest
    for (let retry = 1; retry <= retryCount; retry++) {
        try {
            const params = {
                Bucket: sourceS3Bucket,
                Key: manifestKey
            };
            const response = await s3.getObject(params).promise();
            manifest = JSON.parse(response.Body.toString());

            break;
        } catch (error) {
            if (retry === retryCount || error.code !== 'AccessDenied') {
                console.error('Error occurred while getting manifest file.', error);
                throw {
                    code: 'GetManifestFailure',
                    message: 'Copy of website assets failed.'
                };
            } else {
                console.log('Waiting for retry...');
                await sleep(retry);
            }
        }
    }

    // Copy asset files
    let promises = [];
    try {
        for (let filename of manifest.files) {
            const params = {
                Bucket: destS3Bucket,
                CopySource: `${sourceS3Bucket}/${sourceS3prefix}/${filename}`,
                Key: filename,
                ContentType: getContentType(filename)
            };
            promises.push(s3.copyObject(params).promise());
        }

        if (promises.length > 0) {
            await Promise.all(promises);
        }

        return {
            Message: 'Copy assets completed.',
            Manifest: manifest
        };
    } catch (error) {
        console.error('Error occurred while copying assets.', error);
        throw {
            code: 'CopyAssetsFailure',
            message: 'Copy of website assets failed.'
        };
    }
}

/**
 * Gets content type by file name.
 * @param {string} filename - File name
 * @return {string} - Content type
 */
function getContentType(filename) {
    let contentType = '';
    if (filename.endsWith('.html')) {
        contentType = 'text/html';
    } else if (filename.endsWith('.css')) {
        contentType = 'text/css';
    } else if (filename.endsWith('.png')) {
        contentType = 'image/png';
    } else if (filename.endsWith('.svg')) {
        contentType = 'image/svg+xml';
    } else if (filename.endsWith('.jpg')) {
        contentType = 'image/jpeg';
    } else if (filename.endsWith('.js')) {
        contentType = 'application/javascript';
    } else {
        contentType = 'binary/octet-stream';
    }
    return contentType;
}

/**
 * Validates if buckets exist in the account.
 * @param {string} buckets Comma-separated bucket names
 * @return {Promise} The result of validation
 */
async function validateBuckets(buckets) {
    buckets = buckets.replace(/\s/g, '');
    console.log(`Attempting to check if the following buckets exist: ${buckets}`);
    const checkBuckets = buckets.split(',');
    const errorBuckets = [];

    for (let bucket of checkBuckets) {
        const params = { Bucket: bucket };
        try {
            await s3.headBucket(params).promise();
            console.log(`Found bucket: ${bucket}`);
        } catch (error) {
            console.error(`Could not find bucket: ${bucket}`);
            console.error(error);
            errorBuckets.push(bucket);
        }
    }

    if (errorBuckets.length === 0) {
        return { Message: 'Buckets validated.' };
    } else {
        throw {
            code: 'BucketNotFound',
            message: `Could not find the following source bucket(s) in your account: ${errorBuckets.join(',')}. Please specify at least one source bucket that exists within your account and try again. If specifying multiple source buckets, please ensure that they are comma-separated.`
        };
    }
}

/**
 *
 * @param {string} bucket - Bucket name to check if key exists
 * @param {string} key - Key to check if it exists in the bucket
 * @return {Promise} The result of validation
 */
async function checkFallbackImage(bucket, key) {
    if (!bucket || bucket.replace(/\s/g, '') === '') {
        throw {
            code: 'S3BucketNotProvided',
            message: 'You need to provide the default fallback image bucket.'
        };
    }
    if (!key || key.replace(/\s/g, '') === '') {
        throw {
            code: 'S3KeyNotProvided',
            message: 'You need to provide the default fallback image object key.'
        };
    }

    const retryCount = 3;
    let data = {};

    for (let retry = 1; retry <= retryCount; retry++) {
        try {
            data = await s3.headObject({ Bucket: bucket, Key: key }).promise();
            break;
        } catch (error) {
            if (retry === retryCount || !['AccessDenied', 'Forbidden'].includes(error.code)) {
                console.error(`Either the object does not exist or you don't have permission to access the object: ${bucket}/${key}`);
                throw {
                    code: 'FallbackImageError',
                    message: `Either the object does not exist or you don't have permission to access the object: ${bucket}/${key}`
                };
            } else {
                console.log('Waiting for retry...');
                await sleep(retry);
            }
        }
    }

    return {
        Message: 'The default fallback image validated.',
        Data: data
    };
}

/**
 * Sleeps for some seconds.
 * @param {number} retry - Retry count
 * @return {Promise} - Sleep promise
 */
async function sleep(retry) {
    const retrySeconds = Number(process.env.RETRY_SECONDS);
    return new Promise(resolve => setTimeout(resolve, retrySeconds * 1000 * retry));
}

/**
 * Creates a bucket with settings for cloudfront logging.
 * @param {String} stackName - Name of CloudFormation stack
 * @param {JSON} bucketPolicyStatement - S3 bucket policy statement
 * @return {Promise} - Bucket name of the created bucket
 */
async function createLoggingBucket(stackName, bucketSuffix, bucketPolicyStatement){
    const bucketParams = {
        Bucket: `${stackName}-logs-${bucketSuffix.substring(0,8)}`.toLowerCase(),
        ACL: "log-delivery-write" 
    };

    //create bucket
    try{
        await s3USEast.createBucket(bucketParams).promise()
        console.log(`Successfully created bucket: ${bucketParams.Bucket}`);
    } catch(error) {
        console.error(`Could not create bucket: ${bucketParams.Bucket}`, error);
        throw error;
    }

    const encryptionParams = {
        Bucket: bucketParams.Bucket,
        ServerSideEncryptionConfiguration: {
            Rules: [{
                ApplyServerSideEncryptionByDefault: {
                    SSEAlgorithm: 'AES256'
                },
            },]
        }
    };

    //Add encryption to bucket
    console.log("Adding Encryption...")
    try {
        await s3USEast.putBucketEncryption(encryptionParams).promise();
        console.log(`Successfully enabled encryptoin on bucket: ${bucketParams.Bucket}`);
    } catch(error) {
        console.error(`Failed to add encryption to bucket: ${bucketParams.Bucket}`, error);
        throw error;
    }

    //Update resource attribute of policy statement
    bucketPolicyStatement.Resource = `arn:aws:s3:::${bucketParams.Bucket}/*`
    bucketPolicy = {"Version": "2012-10-17", "Statement":[ bucketPolicyStatement ]};

    //Define policy parameters
    const policyParams = {
        Bucket: bucketParams.Bucket,
        Policy: JSON.stringify(bucketPolicy)
    };

    //Add Policy to bucket
    console.log("Adding policy...")
    try {
        await s3USEast.putBucketPolicy(policyParams).promise();
        console.log(`Successfully added policy added to bucket: ${bucketParams.Bucket}`);
    } catch(error) {
        console.error(`Failed to add policy to bucket ${bucketParams.Bucket}`, error);
        throw error;
    }

    return {bucketName: bucketParams.Bucket};
}