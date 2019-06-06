/*********************************************************************************************************************
 *  Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.                                           *
 *                                                                                                                    *
 *  Licensed under the Amazon Software License (the "License"). You may not use this file except in compliance        *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://aws.amazon.com/asl/                                                                                    *
 *                                                                                                                    *
 *  or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 *********************************************************************************************************************/

'use strict';

console.log('Loading function');

const AWS = require('aws-sdk');
const https = require('https');
const url = require('url');
const moment = require('moment');
const S3Helper = require('./lib/s3-helper.js');
const UsageMetrics = require('./lib/usage-metrics');
const UUID = require('node-uuid');

/**
 * Request handler.
 */
exports.handler = (event, context, callback) => {
    console.log('Received event:', JSON.stringify(event, null, 2));

    let responseStatus = 'FAILED';
    let responseData = {};

    if (event.RequestType === 'Delete') {
        if (event.ResourceProperties.customAction === 'sendMetric') {
            responseStatus = 'SUCCESS';

            if (event.ResourceProperties.anonymousData === 'Yes') {
                let _metric = {
                    Solution: event.ResourceProperties.solutionId,
                    UUID: event.ResourceProperties.UUID,
                    TimeStamp: moment().utc().format('YYYY-MM-DD HH:mm:ss.S'),
                    Data: {
                        Version: event.ResourceProperties.version,
                        Deleted: moment().utc().format()
                    }
                };

                let _usageMetrics = new UsageMetrics();
                _usageMetrics.sendAnonymousMetric(_metric).then((data) => {
                    console.log(data);
                    console.log('Annonymous metrics successfully sent.');
                    sendResponse(event, callback, context.logStreamName, responseStatus, responseData);
                }).catch((err) => {
                    responseData = {
                        Error: 'Sending anonymous delete metric failed'
                    };
                    console.log([responseData.Error, ':\n', err].join(''));
                    sendResponse(event, callback, context.logStreamName, responseStatus, responseData);
                });
            } else {
                sendResponse(event, callback, context.logStreamName, 'SUCCESS');
            }

        } else {
            sendResponse(event, callback, context.logStreamName, 'SUCCESS');
        }
    }

    if (event.RequestType === 'Create') {
        if (event.ResourceProperties.customAction === 'putConfigFile') {
            let _s3Helper = new S3Helper();
            console.log(event.ResourceProperties.configItem);
            _s3Helper.putConfigFile(event.ResourceProperties.configItem, event.ResourceProperties.destS3Bucket, event.ResourceProperties.destS3key).then((data) => {
                responseStatus = 'SUCCESS';
                responseData = setting;
                sendResponse(event, callback, context.logStreamName, responseStatus, responseData);
            }).catch((err) => {
                responseData = {
                    Error: `Saving config file to ${event.ResourceProperties.destS3Bucket}/${event.ResourceProperties.destS3key} failed`
                };
                console.log([responseData.Error, ':\n', err].join(''));
                sendResponse(event, callback, context.logStreamName, responseStatus, responseData);
            });

        } else if (event.ResourceProperties.customAction === 'copyS3assets') {
            let _s3Helper = new S3Helper();

            _s3Helper.copyAssets(event.ResourceProperties.manifestKey,
                event.ResourceProperties.sourceS3Bucket, event.ResourceProperties.sourceS3key,
                event.ResourceProperties.destS3Bucket).then((data) => {
                responseStatus = 'SUCCESS';
                responseData = {};
                sendResponse(event, callback, context.logStreamName, responseStatus, responseData);
            }).catch((err) => {
                responseData = {
                    Error: `Copy of website assets failed`
                };
                console.log([responseData.Error, ':\n', err].join(''));
                sendResponse(event, callback, context.logStreamName, responseStatus, responseData);
            });

        } else if (event.ResourceProperties.customAction === 'createUuid') {
            responseStatus = 'SUCCESS';
            responseData = {
                UUID: UUID.v4()
            };
            sendResponse(event, callback, context.logStreamName, responseStatus, responseData);

        } else if (event.ResourceProperties.customAction === 'checkSourceBuckets') {
            let _s3Helper = new S3Helper();

            _s3Helper.validateBuckets(event.ResourceProperties.sourceBuckets).then((data) => {
                responseStatus = 'SUCCESS';
                responseData = {};
                sendResponse(event, callback, context.logStreamName, responseStatus, responseData);
            }).catch((err) => {
                responseData = {
                    Error: `Could not find the following source bucket(s) in your account: ${err}. Please specify at least one source bucket that exists within your account and try again. If specifying multiple source buckets, please ensure that they are comma-separated.`
                };
                console.log(responseData.Error);
                sendResponse(event, callback, context.logStreamName, responseStatus, responseData, responseData.Error);
            });

        } else if (event.ResourceProperties.customAction === 'sendMetric') {
            if (event.ResourceProperties.anonymousData === 'Yes') {
                let _metric = {
                    Solution: event.ResourceProperties.solutionId,
                    UUID: event.ResourceProperties.UUID,
                    TimeStamp: moment().utc().format('YYYY-MM-DD HH:mm:ss.S'),
                    Data: {
                        Version: event.ResourceProperties.version,
                        Launch: moment().utc().format()
                    }
                };

                let _usageMetrics = new UsageMetrics();
                _usageMetrics.sendAnonymousMetric(_metric).then((data) => {
                    console.log(data);
                    console.log('Annonymous metrics successfully sent.');
                    responseStatus = 'SUCCESS';
                    responseData = {};
                    sendResponse(event, callback, context.logStreamName, responseStatus, responseData);
                }).catch((err) => {
                    responseData = {
                        Error: 'Sending anonymous launch metric failed'
                    };
                    console.log([responseData.Error, ':\n', err].join(''));
                    sendResponse(event, callback, context.logStreamName, responseStatus, responseData);
                });
            } else {
                sendResponse(event, callback, context.logStreamName, 'SUCCESS');
            }

        } else {
            sendResponse(event, callback, context.logStreamName, 'SUCCESS');
        }
    }

    if (event.RequestType === 'Update') {
        if (event.ResourceProperties.customAction === 'copyS3assets') {
            let _s3Helper = new S3Helper();

            _s3Helper.copyAssets(event.ResourceProperties.manifestKey,
                event.ResourceProperties.sourceS3Bucket, event.ResourceProperties.sourceS3key,
                event.ResourceProperties.destS3Bucket).then((data) => {
                responseStatus = 'SUCCESS';
                responseData = {};
                sendResponse(event, callback, context.logStreamName, responseStatus, responseData);
            }).catch((err) => {
                responseData = {
                    Error: `Copy of website assets failed`
                };
                console.log([responseData.Error, ':\n', err].join(''));
                sendResponse(event, callback, context.logStreamName, responseStatus, responseData);
            });

        } else if (event.ResourceProperties.customAction === 'putConfigFile') {
            let _s3Helper = new S3Helper();
            console.log(event.ResourceProperties.configItem);
            _s3Helper.putConfigFile(event.ResourceProperties.configItem, event.ResourceProperties.destS3Bucket, event.ResourceProperties.destS3key).then((data) => {
                responseStatus = 'SUCCESS';
                responseData = setting;
                sendResponse(event, callback, context.logStreamName, responseStatus, responseData);
            }).catch((err) => {
                responseData = {
                    Error: `Saving config file to ${event.ResourceProperties.destS3Bucket}/${event.ResourceProperties.destS3key} failed`
                };
                console.log([responseData.Error, ':\n', err].join(''));
                sendResponse(event, callback, context.logStreamName, responseStatus, responseData);
            });

        } else if (event.ResourceProperties.customAction === 'checkSourceBuckets') {
            let _s3Helper = new S3Helper();

            _s3Helper.validateBuckets(event.ResourceProperties.sourceBuckets).then((data) => {
                responseStatus = 'SUCCESS';
                responseData = {};
                sendResponse(event, callback, context.logStreamName, responseStatus, responseData);
            }).catch((err) => {
                responseData = {
                    Error: `Could not find the following source bucket(s) in your account: ${err}. Please specify at least one source bucket that exists within your account and try again. If specifying multiple source buckets, please ensure that they are comma-separated.`
                };
                console.log(responseData.Error);
                sendResponse(event, callback, context.logStreamName, responseStatus, responseData, responseData.Error);
            });
            
        } else {
            sendResponse(event, callback, context.logStreamName, 'SUCCESS');
        }
    }
};

/**
 * Sends a response to the pre-signed S3 URL
 */
let sendResponse = function(event, callback, logStreamName, responseStatus, responseData, customReason) {
        
    const defaultReason = `See the details in CloudWatch Log Stream: ${logStreamName}`;
    const reason = (customReason !== undefined) ? customReason : defaultReason;
    
    const responseBody = JSON.stringify({
        Status: responseStatus,
        Reason: reason,
        PhysicalResourceId: logStreamName,
        StackId: event.StackId,
        RequestId: event.RequestId,
        LogicalResourceId: event.LogicalResourceId,
        Data: responseData,
    });

    console.log('RESPONSE BODY:\n', responseBody);
    const parsedUrl = url.parse(event.ResponseURL);
    const options = {
        hostname: parsedUrl.hostname,
        port: 443,
        path: parsedUrl.path,
        method: 'PUT',
        headers: {
            'Content-Type': '',
            'Content-Length': responseBody.length,
        }
    };

    const req = https.request(options, (res) => {
        console.log('STATUS:', res.statusCode);
        console.log('HEADERS:', JSON.stringify(res.headers));
        callback(null, 'Successfully sent stack response!');
    });

    req.on('error', (err) => {
        console.log('sendResponse Error:\n', err);
        callback(err);
    });

    req.write(responseBody);
    req.end();
};