/*********************************************************************************************************************
 *  Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.                                           *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/LICENSE-2.0                                                                    *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 *********************************************************************************************************************/

'use strict';

// console.log('Loading function');

const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');
const S3 = require('aws-sdk/clients/s3');
const s3 = new S3();
const sharp = require('sharp');
const https = require('https');
const url = require('url').URL;

/**
 * Request handler.
 */
exports.handler = async (event, context, callback) => {
    // console.log('!! logging event', event);
    if(event.Records[0]['eventSource'] == "aws:sqs") {
        const requestBody = JSON.parse(event.Records[0]['body']);
        await tileImage(process.env.S3_BUCKET, requestBody);
        sendResponse(
            requestBody['callback_url'],
            requestBody['callback_token'],
            requestBody['image_number'],
            'ready');
        return context.logStreamName;
    }
};

/**
 * Gets the original image from an Amazon S3 bucket.
 * @param {String} bucket - The name of the bucket containing the image.
 * @param {String} key - The key name corresponding to the image.
 * @return {Promise} - The original image or an error.
 */
let tileImage = async function(bucket, requestBody) {
    const imagesLocation = requestBody['aws_key']
    const uniq_key = imagesLocation.split('/').pop()
    const tmp_location = '/tmp/' + uniq_key
    try {
        const originalImage = await getOriginalImage(bucket, imagesLocation);
        const image = sharp(originalImage);
        const tiles = image.png().tile({
            layout: 'zoomify'
          }).toFile(tmp_location + 'tiled.dz', function(err, info) {
            if (err) {
                // console.log('err', err);
            } else {
                // console.log('successfully tiled images ' + tmp_location);
                Promise.all(upload_recursive_dir(tmp_location + 'tiled/', bucket, requestBody['aws_key'] + '/tiles', [])).then(function(errs, data) {
                        // if (errs.length) console.log('errors ', errs);// an error occurred
                        // console.log('successfully uploaded tiled images');
                        // if (errs.length)  {
                        //     console.log('errors ', errs);// an error occurred
                        //     sendResponse(
                        //         requestBody['callback_url'],
                        //         requestBody['callback_token'],
                        //         requestBody['image_number'],
                        //         'error');
                        // } else {
                            // console.log('successfully uploaded tiled images');
                            sendResponse(
                                requestBody['callback_url'],
                                requestBody['callback_token'],
                                requestBody['image_number'],
                                'ready');
                        // }
                    }).catch(function(exception) {
                        // console.error('caught exception', exception);
                        sendResponse(
                            requestBody['callback_url'],
                            requestBody['callback_token'],
                            requestBody['image_number'],
                            'error');
                    }).finally(function() {
                        deleteFolderRecursive(tmp_location + 'tiled/');
                        // console.log('successfully deleted tmp files');
                    });;
            }
        });
    } catch(err) {
        // console.error('caught exception', err);
        sendResponse(
                requestBody['callback_url'],
                requestBody['callback_token'],
                requestBody['image_number'],
                'error');
        return Promise.reject({
            status: 500,
            code: err.code,
            message: err.message
        })
    }
}


/**
 * Gets the original image from an Amazon S3 bucket.
 * @param {String} bucket - The name of the bucket containing the image.
 * @param {String} key - The key name corresponding to the image.
 * @return {Promise} - The original image or an error.
 */
let getOriginalImage = async function(bucket, imagesLocation) {
    let images = await getImageObjects(bucket, imagesLocation);
    let originalObject = images.find(isOriginal);
    // console.log('originalObject filename', originalObject.Key);
    return downloadImage(bucket, originalObject.Key);
}

function isOriginal(fileObject) {
    return fileObject.Key.includes("/original-");
}

let getImageObjects = async function(bucket, location) {
    const request = s3.listObjects({
        Bucket: bucket,
        Marker: location,
        MaxKeys: 10
    }).promise();
    try {
        const imageObjects = await request;
        return Promise.resolve(imageObjects.Contents);
    }
    catch(err) {
        return Promise.reject({
            status: 500,
            code: err.code,
            message: err.message
        })
    }
}

let downloadImage = async function(bucket, key){
    let imageLocation = { Bucket: bucket, Key: key };
    const request = s3.getObject(imageLocation).promise();
    try {
        const originalImage = await request;
        return Promise.resolve(originalImage.Body);
    }
    catch(err) {
        return Promise.reject({
            status: 500,
            code: err.code,
            message: err.message
        })
    }
}


let upload_recursive_dir = function(base_tmpdir, destS3Bucket, s3_key, promises) {
    let files = fs.readdirSync(base_tmpdir);

    files.forEach(function (filename) {
        let local_temp_path = base_tmpdir + filename;
        let destS3key = s3_key + filename;
        if (fs.lstatSync(local_temp_path).isDirectory()) {
            promises = upload_recursive_dir(local_temp_path + '/', destS3Bucket, destS3key + '/', promises);
        } else if(filename.endsWith('.xml') || filename.endsWith('.png')) {
            fs.readFile(local_temp_path, function (err, file) {
              // if (err) console.log('readFile err', err); // an error occurred // an error occurred
              let params = {
                Bucket: destS3Bucket,
                Key: destS3key,
                Body: file
              }
              promises.push(s3.putObject(params).promise());
            });
        }
    });
    return promises;
}

let deleteFolderRecursive = function (directory_path) {
    if (fs.existsSync(directory_path)) {
        // console.log('removing folder: ', directory_path);
        fs.readdirSync(directory_path).forEach(function (file, index) {
            var currentPath = path.join(directory_path, file);
            if (fs.lstatSync(currentPath).isDirectory()) {
                deleteFolderRecursive(currentPath);
            } else {
                fs.unlinkSync(currentPath); // delete file
            }
        });
        fs.rmdirSync(directory_path); // delete directories
    }
};

/**
 * Sends a response to the pre-signed S3 URL
 */
let sendResponse = function(callback_url, auth_token, image_number, result) {

    const responseBody = JSON.stringify({
        number: image_number,
        image_status: result
    });

    // console.log('RESPONSE BODY:\n', responseBody);
    const parsedUrl = new URL(callback_url);
    // console.log('host', parsedUrl.hostname);
    const options = {
        hostname: parsedUrl.hostname,
        port: 443,
        path: '/webhooks/tiled_images',
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': responseBody.length,
            'X-Api-Token': auth_token
        }
    };

    // console.log('options', options);
    let body='';

    let reqPost =  https.request(options, function(res) {
        console.log("webhook res: ", res.statusCode);
        res.on('data', function (chunk) {
            body += chunk;
        });
        res.on('end', function () {
           // console.log("Result", body.toString());
           // context.succeed("Sucess")
        });
        res.on('error', function () {
          // console.log("Result Error", body.toString());
          // context.done(null, 'FAILURE');
        });
    });
    reqPost.write(responseBody);
    reqPost.end();
};
