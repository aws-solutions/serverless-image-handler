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
const s3 = new AWS.S3();
const sharp = require('sharp');
const https = require('https');
const url = require('url').URL;

/**
 * Request handler.
 */
exports.handler = async (event, context) => {
    // console.log('!! logging event', event);
    if(event.Records[0]['eventSource'] == "aws:sqs") {
        const message_body = JSON.parse(event.Records[0]['body']);
        console.log('tiling', message_body)
        try {
            await tileImage(message_body);
            console.log('sending callback to Sake');
            await sendCallbackResponse(
                message_body['callback_url'],
                message_body['callback_token'],
                message_body['image_number'],
                'ready');
            context.succeed("Success");
        } catch(err) {
            console.log('caught exception', err);
            await sendCallbackResponse(
                    message_body['callback_url'],
                    message_body['callback_token'],
                    message_body['image_number'],
                    'error');
            context.done(null, 'FAILURE');
        }

    }
};

/**
 * Gets the original image from an Amazon S3 bucket.
 * @param {String} key - The key name corresponding to the image.
 * @return {Promise} - The original image or an error.
 */
let tileImage = async function(message_body) {
    const imagesLocation = message_body['aws_key']
    console.log('imagesLocation', imagesLocation)
    const uniq_key = imagesLocation.split('/').pop()
    console.log('uniq_key', uniq_key)
    const tmp_location = '/tmp/' + uniq_key
    console.log('tmp_location', tmp_location)

    const originalImage = await getOriginalImage(imagesLocation);
    const image = sharp(originalImage);
    console.log('split image into local tiles with sharp')

    const tiles = await image.png()
                            .tile({ layout: 'zoomify'})
                            .toFile(tmp_location + 'tiled.dz')

    return Promise.all(
        upload_recursive_dir(
            tmp_location + 'tiled/',
            imagesLocation + '/tiles/',
            []
        )
    ).then(function(errs, data) {
        if (errs.length) console.log('errors ', errs);// an error occurred
        console.log('successfully uploaded tiled images');
    }).catch(function(exception) {
        console.log('throwing exception to be caught above', exception);
        throw exception;
    }).finally(function() {
        deleteFolderRecursive(tmp_location + 'tiled/');
        console.log('successfully deleted tmp files');
    });
}


/**
 * Gets the original image from an Amazon S3 bucket.
 * @param {String} key - The key name corresponding to the image.
 * @return {Promise} - The original image or an error.
 */
let getOriginalImage = async function(imagesLocation) {
    let images = await getImageObjects(imagesLocation);
    let originalObject = images.find(isOriginal);
    console.log('found original', originalObject.Key);
    return downloadImage(originalObject.Key);
}

function isOriginal(fileObject) {
    return fileObject.Key.includes("/original-");
}

let getImageObjects = async function(location) {
    const request = s3.listObjects({
        Bucket: process.env.S3_BUCKET,
        Marker: location,
        MaxKeys: 10
    }).promise();
    try {
        const imageObjects = await request;
        return Promise.resolve(imageObjects.Contents);
    }
    catch(err) {
        console.log('failed to getImageObjects', err)
        return Promise.reject({
            status: 500,
            code: err.code,
            message: err.message
        })
    }
}

let downloadImage = async function(key){
    let imageLocation = { Bucket: process.env.S3_BUCKET, Key: key };
    const request = s3.getObject(imageLocation).promise();
    try {
        const originalImage = await request;
        return Promise.resolve(originalImage.Body);
    }
    catch(err) {
        console.log('failed to downloadImage', err)
        return Promise.reject({
            status: 500,
            code: err.code,
            message: err.message
        })
    }
}


let upload_recursive_dir = function(base_tmpdir, s3_key, promises) {

    let files = fs.readdirSync(base_tmpdir);
    // console.log('uploading files', files)
    files.forEach(function (filename) {
        let local_temp_path = base_tmpdir + filename;
        let destS3key = s3_key + filename;
        if (fs.lstatSync(local_temp_path).isDirectory()) {
            // console.log('adding dir', local_temp_path);
            // console.log('adding dir to', destS3key);
            promises = upload_recursive_dir(
                local_temp_path + '/',
                destS3key + '/',
                promises);
        } else if(filename.endsWith('.xml') || filename.endsWith('.png')) {
            fs.readFile(local_temp_path, function (err, file) {
              if (err) console.log('readFile err', err); // an error occurred // an error occurred
              let params = {
                Bucket: process.env.S3_BUCKET,
                Key: destS3key,
                Body: file
              }
              // console.log('bucket ' + process.env.S3_BUCKET + ' key: ', destS3key)
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
 * Sends a response to the API webhook
 */
let sendCallbackResponse = async function(callback_url, auth_token, image_number, result) {
    const callbackBody = JSON.stringify({
        number: image_number,
        image_status: result
    });

    const parsedUrl = new URL(callback_url);
    const options = {
        hostname: parsedUrl.hostname,
        port: 443,
        path: '/webhooks/tiled_images',
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': callbackBody.length,
            'X-Api-Token': auth_token
        }
    };

    let reqPost = https.request(options, function(res) {
        console.log("webhook statusCode: ", res.statusCode);

        res.on('data', function (chunk) {
            console.log('data chunk:', chunk);
        });

        res.on('end', function () {
           console.log("Result", body.toString());
        });

        res.on('error', function () {
          console.log("Result Error", body.toString());
        });

    });

    await reqPost.write(callbackBody);
    console.log('sent: ', callbackBody)
    reqPost.end();
};
