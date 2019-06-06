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

/**
 * @author Solution Builders
 */

'use strict';

let moment = require('moment');
let AWS = require('aws-sdk');
const fs = require('fs');

/**
 * Helper function to interact with AWS S3 for cfn custom resource.
 *
 * @class s3Helper
 */
class s3Helper {

    /**
     * @class s3Helper
     * @constructor
     */
    constructor() {
        this.creds = new AWS.EnvironmentCredentials('AWS'); // Lambda provided credentials
        this.downloadLocation = '/tmp/manifest.json';
    }

    /**
     * validateBuckets
     * Cross-checks provided bucket names against existing bucket names in the account for
     * validation. 
     * @param {String} strBuckets - String of bucket names from the template params.
     */
    async validateBuckets(strBuckets) {
        const formatted = strBuckets.replace(/\s/g,'');
        console.log(`Attempting to check if the following buckets exist: ${formatted}`);
        const buckets = formatted.split(',');
        const errorBuckets = [];
        for (let i = 0; i < buckets.length; i++) {
            const s3 = new AWS.S3({ signatureVersion: 'v4' });
            const params = { Bucket: buckets[i] };
            try {
                await s3.headBucket(params).promise();
                console.log(`Found bucket: ${buckets[i]}`);
            } catch (err) {
                console.log(`Could not find bucket: ${buckets[i]}`);
                console.log(err);
                errorBuckets.push(buckets[i]);
            }
        }
        if (errorBuckets.length === 0)      return Promise.resolve();
        else                                return Promise.reject(errorBuckets);
    }

    /**
     * putConfigFile
     * Saves a JSON config file to S3 location.
     * @param {JSON} content -  JSON object.
     * @param {JSON} destS3Bucket -  S3 destination bucket.
     * @param {JSON} destS3key -  S3 destination key.
     */
    putConfigFile(content, destS3Bucket, destS3key) {
        console.log(`Attempting to save content blob destination location: ${destS3Bucket}/${destS3key}`);
        console.log(JSON.stringify(content));

        let _self = this;
        return new Promise((resolve, reject) => {
            let _content = `'use strict';\n\nconst appVariables = {\n`;

            let i = 0;
            for (let key in content) {
                if (i > 0) {
                    _content += ', \n';
                }
                _content += `${key}: '${content[key]}'`;
                i++;
            }
            _content += '\n};';

            let params = {
                Bucket: destS3Bucket,
                Key: destS3key,
                Body: _content
            };

            let s3 = new AWS.S3({
                signatureVersion: 'v4'
            });
            s3.putObject(params, function(err, data) {
                if (err) {
                    console.log(err);
                    reject(`Error creating ${destS3Bucket}/${destS3key} content \n${err}`);
                } else {
                    console.log(data);
                    resolve(data);
                }
            });
        });
    }

    copyAssets(manifestKey, sourceS3Bucket, sourceS3prefix, destS3Bucket) {
        console.log(`source bucket: ${sourceS3Bucket}`);
        console.log(`source prefix: ${sourceS3prefix}`);
        console.log(`destination bucket: ${destS3Bucket}`);

        let _self = this;
        return new Promise((resolve, reject) => {

            this._downloadManifest(sourceS3Bucket, manifestKey).then((data) => {

                fs.readFile(_self.downloadLocation, 'utf8', function(err, data) {
                    if (err) {
                        console.log(err);
                        reject(err);
                    }

                    let _manifest = _self._validateJSON(data);

                    if (!_manifest) {
                        reject('Unable to validate downloaded manifest file JSON');
                    } else {
                        _self._uploadFile(_manifest.files, 0, destS3Bucket, `${sourceS3Bucket}/${sourceS3prefix}`).then((resp) => {
                            console.log(resp);
                            resolve(resp)
                        }).catch((err) => {
                            console.log(err);
                            reject(err);
                        });
                    }

                });
            }).catch((err) => {
                console.log(err);
                reject(err);
            });

        });
    };

    /**
     * Helper function to validate the JSON structure of contents of an import manifest file.
     * @param {string} body -  JSON object stringify-ed.
     * @returns {JSON} - The JSON parsed string or null if string parsing failed
     */
    _validateJSON(body) {
        try {
            let data = JSON.parse(body);
            console.log(data);
            return data;
        } catch (e) {
            // failed to parse
            console.log('Manifest file contains invalid JSON.');
            return null;
        }
    };

    _uploadFile(filelist, index, destS3Bucket, sourceS3prefix) {
        let _self = this;
        return new Promise((resolve, reject) => {

            if (filelist.length > index) {
                let params = {
                    Bucket: destS3Bucket,
                    Key: filelist[index],
                    CopySource: [sourceS3prefix, filelist[index]].join('/'),
                    MetadataDirective: 'REPLACE'
                };

                params.ContentType = this._setContentType(filelist[index]);
                params.Metadata = {
                    'Content-Type': params.ContentType
                };
                console.log(params);
                let s3 = new AWS.S3({
                    signatureVersion: 'v4'
                });
                s3.copyObject(params, function(err, data) {
                    if (err) {
                        console.log(err);
                        reject(`error copying ${sourceS3prefix}/${filelist[index]}\n${err}`);
                    } else {
                        console.log(`${sourceS3prefix}/${filelist[index]} uploaded successfully`);
                        let _next = index + 1;
                        _self._uploadFile(filelist, _next, destS3Bucket, sourceS3prefix).then((resp) => {
                            resolve(resp);
                        }).catch((err2) => {
                            reject(err2);
                        });
                    }
                });
            } else {
                resolve(`${index} files copied`);
            }

        });

    }

    /**
     * Helper function to download a manifest to local storage for processing.
     * @param {string} s3Bucket -  Amazon S3 bucket of the manifest to download.
     * @param {string} s3Key - Amazon S3 key of the manifest to download.
     * @param {string} downloadLocation - Local storage location to download the Amazon S3 object.
     */
    _downloadManifest(s3Bucket, s3Key) {
        let _self = this;
        return new Promise((resolve, reject) => {

            let params = {
                Bucket: s3Bucket,
                Key: s3Key
            };

            console.log(`Attempting to download manifest: ${JSON.stringify(params)}`);

            // check to see if the manifest file exists
            let s3 = new AWS.S3({
                signatureVersion: 'v4'
            });
            s3.headObject(params, function(err, metadata) {
                if (err) {
                    console.log(err);
                }

                if (err && err.code === 'NotFound') {
                    // Handle no object on cloud here
                    console.log('manifest file doesn\'t exist');
                    reject('Manifest file was not found.');
                } else {
                    console.log('manifest file exists');
                    console.log(metadata);
                    let file = require('fs').createWriteStream(_self.downloadLocation);

                    s3.getObject(params).
                    on('httpData', function(chunk) {
                        file.write(chunk);
                    }).
                    on('httpDone', function() {
                        file.end();
                        console.log('manifest downloaded for processing...');
                        resolve('success');
                    }).
                    send();
                }
            });
        });
    }

    _setContentType(file) {
        let _contentType = 'binary/octet-stream';
        if (file.endsWith('.html')) {
            _contentType = 'text/html';
        } else if (file.endsWith('.css')) {
            _contentType = 'text/css';
        } else if (file.endsWith('.png')) {
            _contentType = 'image/png';
        } else if (file.endsWith('.svg')) {
            _contentType = 'image/svg+xml';
        } else if (file.endsWith('.jpg')) {
            _contentType = 'image/jpeg';
        } else if (file.endsWith('.js')) {
            _contentType = 'application/javascript';
        }

        return _contentType;
    }


}

module.exports = s3Helper;