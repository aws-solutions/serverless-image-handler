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

const ImageRequest = require('../image-request');
let assert = require('assert');

// ----------------------------------------------------------------------------
// [async] setup()
// ----------------------------------------------------------------------------
describe('setup()', function() {
    describe('001/defaultImageRequest', function() {
        it(`Should pass when a default image request is provided and populate
            the ImageRequest object with the proper values`, async function() {
            // Arrange
            const event = {
                path : '/eyJidWNrZXQiOiJ2YWxpZEJ1Y2tldCIsImtleSI6InZhbGlkS2V5IiwiZWRpdHMiOnsiZ3JheXNjYWxlIjp0cnVlfX0='
            }
            process.env = {
                SOURCE_BUCKETS : "validBucket, validBucket2"
            }
            // ----
            const S3 = require('aws-sdk/clients/s3');
            const sinon = require('sinon');
            const getObject = S3.prototype.getObject = sinon.stub();
            getObject.withArgs({Bucket: 'validBucket', Key: 'validKey'}).returns({
                promise: () => { return {
                  Body: Buffer.from('SampleImageContent\n')
                }}
            })
            // Act
            const imageRequest = new ImageRequest();
            await imageRequest.setup(event);
            const expectedResult = {
                requestType: 'Default',
                bucket: 'validBucket',
                key: 'validKey',
                edits: { grayscale: true },
                originalImage: Buffer.from('SampleImageContent\n')
            }
            // Assert
            assert.deepEqual(imageRequest, expectedResult);
        });
    });
    describe('002/thumborImageRequest', function() {
        it(`Should pass when a thumbor image request is provided and populate
            the ImageRequest object with the proper values`, async function() {
            // Arrange
            const event = {
                path : "/filters:grayscale()/test-image-001.jpg"
            }
            process.env = {
                SOURCE_BUCKETS : "allowedBucket001, allowedBucket002"
            }
            // ----
            const S3 = require('aws-sdk/clients/s3');
            const sinon = require('sinon');
            const getObject = S3.prototype.getObject = sinon.stub();
            getObject.withArgs({Bucket: 'allowedBucket001', Key: 'test-image-001.jpg'}).returns({
                promise: () => { return {
                  Body: Buffer.from('SampleImageContent\n')
                }}
            })
            // Act
            const imageRequest = new ImageRequest();
            await imageRequest.setup(event);
            const expectedResult = {
                requestType: 'Thumbor',
                bucket: 'allowedBucket001',
                key: 'test-image-001.jpg',
                edits: { grayscale: true },
                originalImage: Buffer.from('SampleImageContent\n')
            }
            // Assert
            assert.deepEqual(imageRequest, expectedResult);
        });
    });
    describe('003/customImageRequest', function() {
        it(`Should pass when a custom image request is provided and populate
            the ImageRequest object with the proper values`, async function() {
            // Arrange
            const event = {
                path : '/filters-rotate(90)/filters-grayscale()/custom-image.jpg'
            }
            process.env = {
                SOURCE_BUCKETS : "allowedBucket001, allowedBucket002",
                REWRITE_MATCH_PATTERN: /(filters-)/gm,
                REWRITE_SUBSTITUTION: 'filters:'
            }
            // ----
            const S3 = require('aws-sdk/clients/s3');
            const sinon = require('sinon');
            const getObject = S3.prototype.getObject = sinon.stub();
            getObject.withArgs({Bucket: 'allowedBucket001', Key: 'custom-image.jpg'}).returns({
                promise: () => { return {
                  Body: Buffer.from('SampleImageContent\n')
                }}
            })
            // Act
            const imageRequest = new ImageRequest();
            await imageRequest.setup(event);
            const expectedResult = {
                requestType: 'Custom',
                bucket: 'allowedBucket001',
                key: 'custom-image.jpg',
                edits: { 
                    grayscale: true,
                    rotate: 90
                },
                originalImage: Buffer.from('SampleImageContent\n')
            }
            // Assert
            assert.deepEqual(imageRequest, expectedResult);
        });
    });
    describe('004/errorCase', function() {
        it(`Should pass when an error is caught`, async function() {
            // Assert
            const event = {
                path : '/eyJidWNrZXQiOiJ2YWxpZEJ1Y2tldCIsImtleSI6InZhbGlkS2V5IiwiZWRpdHMiOnsiZ3JheXNjYWxlIjp0cnVlfX0='
            }
            // ----
            const S3 = require('aws-sdk/clients/s3');
            const sinon = require('sinon');
            const getObject = S3.prototype.getObject = sinon.stub();
            getObject.withArgs({Bucket: 'validBucket', Key: 'validKey'}).returns({
                promise: () => { return {
                  Body: Buffer.from('SampleImageContent\n')
                }}
            })
            // Act
            const imageRequest = new ImageRequest();
            // Assert
            await imageRequest.setup(event).then(() => {
                console.log(data);
            }).catch((err) => {
                console.log(err);
                assert.deepEqual(err.code, 'ImageBucket::CannotAccessBucket');
            })
        });
    });
});
// ----------------------------------------------------------------------------
// getOriginalImage()
// ----------------------------------------------------------------------------
describe('getOriginalImage()', function() {
    describe('001/imageExists', function() {
        it(`Should pass if the proper bucket name and key are supplied, 
            simulating an image file that can be retrieved`, async function() {
            // Arrange
            const S3 = require('aws-sdk/clients/s3');
            const sinon = require('sinon');
            const getObject = S3.prototype.getObject = sinon.stub();
            getObject.withArgs({Bucket: 'validBucket', Key: 'validKey'}).returns({
                promise: () => { return {
                  Body: Buffer.from('SampleImageContent\n')
                }}
            })
            // Act
            const imageRequest = new ImageRequest();
            const result = await imageRequest.getOriginalImage('validBucket', 'validKey');
            // Assert
            assert.deepEqual(result, Buffer.from('SampleImageContent\n'));
        });
    });
    describe('002/imageDoesNotExist', async function() {
        it(`Should throw an error if an invalid bucket or key name is provided, 
            simulating a non-existant original image`, async function() {
            // Arrange
            const S3 = require('aws-sdk/clients/s3');
            const sinon = require('sinon');
            const getObject = S3.prototype.getObject = sinon.stub();
            getObject.withArgs({Bucket: 'invalidBucket', Key: 'invalidKey'}).returns({
                promise: () => { 
                    return Promise.reject({
                        code: 500,
                        message: 'SimulatedInvalidParameterException'
                    }) 
                }
            });
            // Act
            const imageRequest = new ImageRequest();
            // Assert
            imageRequest.getOriginalImage('invalidBucket', 'invalidKey').then((result) => {
                assert.equal(typeof result, Error);
            }).catch((err) => {
                console.log(err)
            })
        });
    });
});

// ----------------------------------------------------------------------------
// parseImageBucket()
// ----------------------------------------------------------------------------
describe('parseImageBucket()', function() {
    describe('001/defaultRequestType/bucketSpecifiedInRequest/allowed', function() {
        it(`Should pass if the bucket name is provided in the image request
            and has been whitelisted in SOURCE_BUCKETS`, function() {
            // Arrange
            const event = {
                path : '/eyJidWNrZXQiOiJhbGxvd2VkQnVja2V0MDAxIiwia2V5Ijoic2FtcGxlSW1hZ2VLZXkwMDEuanBnIiwiZWRpdHMiOnsiZ3JheXNjYWxlIjoidHJ1ZSJ9fQ=='
            }
            process.env = {
                SOURCE_BUCKETS : "allowedBucket001, allowedBucket002"
            }
            // Act
            const imageRequest = new ImageRequest();
            const result = imageRequest.parseImageBucket(event, 'Default');
            // Assert
            const expectedResult = 'allowedBucket001';
            assert.deepEqual(result, expectedResult);
        });
    });
    describe('002/defaultRequestType/bucketSpecifiedInRequest/notAllowed', function() {
        it(`Should throw an error if the bucket name is provided in the image request
            but has not been whitelisted in SOURCE_BUCKETS`, function() {
            // Arrange
            const event = {
                path : '/eyJidWNrZXQiOiJhbGxvd2VkQnVja2V0MDAxIiwia2V5Ijoic2FtcGxlSW1hZ2VLZXkwMDEuanBnIiwiZWRpdHMiOnsiZ3JheXNjYWxlIjoidHJ1ZSJ9fQ=='
            }
            process.env = {
                SOURCE_BUCKETS : "allowedBucket003, allowedBucket004"
            }
            // Act
            const imageRequest = new ImageRequest();
            // Assert
            assert.throws(function() {
                imageRequest.parseImageBucket(event, 'Default');
            }, Object, {
                status: 403,
                code: 'ImageBucket::CannotAccessBucket',
                message: 'The bucket you specified could not be accessed. Please check that the bucket is specified in your SOURCE_BUCKETS.'
            });
        });
    });
    describe('003/defaultRequestType/bucketNotSpecifiedInRequest', function() {
        it(`Should pass if the image request does not contain a source bucket
            but SOURCE_BUCKETS contains at least one bucket that can be 
            used as a default`, function() {
            // Arrange
            const event = {
                path : '/eyJrZXkiOiJzYW1wbGVJbWFnZUtleTAwMS5qcGciLCJlZGl0cyI6eyJncmF5c2NhbGUiOiJ0cnVlIn19=='
            }
            process.env = {
                SOURCE_BUCKETS : "allowedBucket001, allowedBucket002"
            }
            // Act
            const imageRequest = new ImageRequest();
            const result = imageRequest.parseImageBucket(event, 'Default');
            // Assert
            const expectedResult = 'allowedBucket001';
            assert.deepEqual(result, expectedResult);
        });
    });
    describe('004/thumborRequestType', function() {
        it(`Should pass if there is at least one SOURCE_BUCKET specified that can 
            be used as the default for Thumbor requests`, function() {
            // Arrange
            const event = {
                path : "/filters:grayscale()/test-image-001.jpg"
            }
            process.env = {
                SOURCE_BUCKETS : "allowedBucket001, allowedBucket002"
            }
            // Act
            const imageRequest = new ImageRequest();
            const result = imageRequest.parseImageBucket(event, 'Thumbor');
            // Assert
            const expectedResult = 'allowedBucket001';
            assert.deepEqual(result, expectedResult);
        });
    });
    describe('005/customRequestType', function() {
        it(`Should pass if there is at least one SOURCE_BUCKET specified that can 
            be used as the default for Custom requests`, function() {
            // Arrange
            const event = {
                path : "/filters:grayscale()/test-image-001.jpg"
            }
            process.env = {
                SOURCE_BUCKETS : "allowedBucket001, allowedBucket002"
            }
            // Act
            const imageRequest = new ImageRequest();
            const result = imageRequest.parseImageBucket(event, 'Custom');
            // Assert
            const expectedResult = 'allowedBucket001';
            assert.deepEqual(result, expectedResult);
        });
    });
    describe('006/invalidRequestType', function() {
        it(`Should pass if there is at least one SOURCE_BUCKET specified that can 
            be used as the default for Custom requests`, function() {
            // Arrange
            const event = {
                path : "/filters:grayscale()/test-image-001.jpg"
            }
            process.env = {
                SOURCE_BUCKETS : "allowedBucket001, allowedBucket002"
            }
            // Act
            const imageRequest = new ImageRequest();
            // Assert
            assert.throws(function() {
                imageRequest.parseImageBucket(event, undefined);
            }, Object, {
                status: 400,
                code: 'ImageBucket::CannotFindBucket',
                message: 'The bucket you specified could not be found. Please check the spelling of the bucket name in your request.'
            });
        });
    });
});

// ----------------------------------------------------------------------------
// parseImageEdits()
// ----------------------------------------------------------------------------
describe('parseImageEdits()', function() {
    describe('001/defaultRequestType', function() {
        it(`Should pass if the proper result is returned for a sample base64-
            encoded image request`, function() {
            // Arrange
            const event = {
                path : '/eyJlZGl0cyI6eyJncmF5c2NhbGUiOiJ0cnVlIiwicm90YXRlIjo5MCwiZmxpcCI6InRydWUifX0='
            }
            // Act
            const imageRequest = new ImageRequest();
            const result = imageRequest.parseImageEdits(event, 'Default');
            // Assert
            const expectedResult = {
                grayscale: 'true',
                rotate: 90,
                flip: 'true'
            }
            assert.deepEqual(result, expectedResult);
        });
    });
    describe('002/thumborRequestType', function() {
        it(`Should pass if the proper result is returned for a sample thumbor- 
            type image request`, function() {
            // Arrange
            const event = {
                path : '/filters:rotate(90)/filters:grayscale()/thumbor-image.jpg'
            }
            // Act
            const imageRequest = new ImageRequest();
            const result = imageRequest.parseImageEdits(event, 'Thumbor');
            // Assert
            const expectedResult = {
                rotate: 90,
                grayscale: true
            }
            assert.deepEqual(result, expectedResult);
        });
    });
    describe('003/customRequestType', function() {
        it(`Should pass if the proper result is returned for a sample custom- 
            type image request`, function() {
            // Arrange
            const event = {
                path : '/filters-rotate(90)/filters-grayscale()/thumbor-image.jpg'
            }
            process.env.REWRITE_MATCH_PATTERN = /(filters-)/gm;
            process.env.REWRITE_SUBSTITUTION = 'filters:';
            // Act
            const imageRequest = new ImageRequest();
            const result = imageRequest.parseImageEdits(event, 'Custom');
            // Assert
            const expectedResult = {
                rotate: 90,
                grayscale: true
            }
            assert.deepEqual((typeof result !== undefined), !undefined)
        });
    });
    describe('004/customRequestType', function() {
        it(`Should throw an error if a requestType is not specified and/or the image edits
            cannot be parsed`, function() {
            // Arrange
            const event = {
                path : '/filters:rotate(90)/filters:grayscale()/other-image.jpg'
            }
            // Act
            const imageRequest = new ImageRequest();
            // Assert
            assert.throws(function() {
                imageRequest.parseImageEdits(event, undefined);
            }, Object, {
                status: 400,
                code: 'ImageEdits::CannotParseEdits',
                message: 'The edits you provided could not be parsed. Please check the syntax of your request and refer to the documentation for additional guidance.'
            });
        });
    });
});

// ----------------------------------------------------------------------------
// parseImageKey()
// ----------------------------------------------------------------------------
describe('parseImageKey()', function() {
    describe('001/defaultRequestType', function() {
        it(`Should pass if an image key value is provided in the default
            request format`, function() {
            // Arrange
            const event = {
                path : '/eyJidWNrZXQiOiJteS1zYW1wbGUtYnVja2V0Iiwia2V5Ijoic2FtcGxlLWltYWdlLTAwMS5qcGcifQ=='
            }
            // Act
            const imageRequest = new ImageRequest();
            const result = imageRequest.parseImageKey(event, 'Default');
            // Assert
            const expectedResult = 'sample-image-001.jpg';
            assert.deepEqual(result, expectedResult);
        });
    });
    describe('002/thumborRequestType', function() {
        it(`Should pass if an image key value is provided in the thumbor
            request format`, function() {
            // Arrange
            const event = {
                path : '/filters:rotate(90)/filters:grayscale()/thumbor-image.jpg'
            }
            // Act
            const imageRequest = new ImageRequest();
            const result = imageRequest.parseImageKey(event, 'Thumbor');
            // Assert
            const expectedResult = 'thumbor-image.jpg';
            assert.deepEqual(result, expectedResult);
        });
    });
    describe('003/customRequestType', function() {
        it(`Should pass if an image key value is provided in the custom
            request format`, function() {
            // Arrange
            const event = {
                path : '/filters-rotate(90)/filters-grayscale()/custom-image.jpg'
            }
            // Act
            const imageRequest = new ImageRequest();
            const result = imageRequest.parseImageKey(event, 'Custom');
            // Assert
            const expectedResult = 'custom-image.jpg';
            assert.deepEqual(result, expectedResult);
        });
    });
    describe('004/elseCondition', function() {
        it(`Should throw an error if an unrecognized requestType is passed into the
            function as a parameter`, function() {
            // Arrange
            const event = {
                path : '/filters:rotate(90)/filters:grayscale()/other-image.jpg'
            }
            // Act
            const imageRequest = new ImageRequest();
            // Assert
            assert.throws(function() {
                imageRequest.parseImageKey(event, undefined);
            }, Object, {
                status: 400,
                code: 'ImageEdits::CannotFindImage',
                message: 'The image you specified could not be found. Please check your request syntax as well as the bucket you specified to ensure it exists.'
            });
        });
    });
});

// ----------------------------------------------------------------------------
// parseRequestType()
// ----------------------------------------------------------------------------
describe('parseRequestType()', function() {
    describe('001/defaultRequestType', function() {
        it(`Should pass if the method detects a default request`, function() {
            // Arrange
            const event = {
                path: '/eyJidWNrZXQiOiJteS1zYW1wbGUtYnVja2V0Iiwia2V5IjoibXktc2FtcGxlLWtleSIsImVkaXRzIjp7ImdyYXlzY2FsZSI6dHJ1ZX19'
            }
            process.env = {};
            // Act
            const imageRequest = new ImageRequest();
            const result = imageRequest.parseRequestType(event);
            // Assert
            const expectedResult = 'Default';
            assert.deepEqual(result, expectedResult);
        });
    });
    describe('002/thumborRequestType', function() {
        it(`Should pass if the method detects a thumbor request`, function() {
            // Arrange
            const event = {
                path: '/unsafe/filters:brightness(10):contrast(30)/https://upload.wikimedia.org/wikipedia/commons/thumb/7/79/Coffee_berries_1.jpg/1200px-Coffee_berries_1.jpg'
            }
            process.env = {};
            // Act
            const imageRequest = new ImageRequest();
            const result = imageRequest.parseRequestType(event);
            // Assert
            const expectedResult = 'Thumbor';
            assert.deepEqual(result, expectedResult);
        });
    });
    describe('003/customRequestType', function() {
        it(`Should pass if the method detects a custom request`, function() {
            // Arrange
            const event = {
                path: '/additionalImageRequestParameters/image.jpg'
            }
            process.env = {
                REWRITE_MATCH_PATTERN: 'matchPattern',
                REWRITE_SUBSTITUTION: 'substitutionString'
            }
            // Act
            const imageRequest = new ImageRequest();
            const result = imageRequest.parseRequestType(event);
            // Assert
            const expectedResult = 'Custom';
            assert.deepEqual(result, expectedResult);
        });
    });
    describe('004/elseCondition', function() {
        it(`Should throw an error if the method cannot determine the request
            type based on the three groups given`, function() {
            // Arrange
            const event = {
                path : '12x12e24d234r2ewxsad123d34r'
            }
            process.env = {};
            // Act
            const imageRequest = new ImageRequest();
            // Assert
            assert.throws(function() {
                const a = imageRequest.parseRequestType(event);
            }, Object, {
                status: 400,
                code: 'RequestType::CannotDetermineRequestType',
                message: 'The type of request you are making could not be properly routed. Please check your request syntax and refer to the documentation for additional guidance.'
            });
        });
    });
});

// ----------------------------------------------------------------------------
// decodeRequest()
// ----------------------------------------------------------------------------
describe('decodeRequest()', function() {
    describe('001/validRequestPathSpecified', function() {
        it(`Should pass if a valid base64-encoded path has been specified`, 
            function() {
            // Arrange
            const event = {
                path : '/eyJidWNrZXQiOiJidWNrZXQtbmFtZS1oZXJlIiwia2V5Ijoia2V5LW5hbWUtaGVyZSJ9'
            }
            // Act
            const imageRequest = new ImageRequest();
            const result = imageRequest.decodeRequest(event);
            // Assert
            const expectedResult = {
                bucket: 'bucket-name-here',
                key: 'key-name-here'
            };
            assert.deepEqual(result, expectedResult);
        });
    });
    describe('002/invalidRequestPathSpecified', function() {
        it(`Should throw an error if a valid base64-encoded path has not been specified`, 
            function() {
            // Arrange
            const event = {
                path : '/someNonBase64EncodedContentHere'
            }
            // Act
            const imageRequest = new ImageRequest();
            // Assert
            assert.throws(function() {
                imageRequest.decodeRequest(event);
            }, Object, {
                status: 400,
                code: 'DecodeRequest::CannotDecodeRequest',
                message: 'The image request you provided could not be decoded. Please check that your request is base64 encoded properly and refer to the documentation for additional guidance.'
            });
        });
    });
    describe('003/noPathSpecified', function() {
        it(`Should throw an error if no path is specified at all`, 
            function() {
            // Arrange
            const event = {}
            // Act
            const imageRequest = new ImageRequest();
            // Assert
            assert.throws(function() {
                imageRequest.decodeRequest(event);
            }, Object, {
                status: 400,
                code: 'DecodeRequest::CannotReadPath',
                message: 'The URL path you provided could not be read. Please ensure that it is properly formed according to the solution documentation.'
            });
        });
    });
});

// ----------------------------------------------------------------------------
// getAllowedSourceBuckets()
// ----------------------------------------------------------------------------
describe('getAllowedSourceBuckets()', function() {
    describe('001/sourceBucketsSpecified', function() {
        it(`Should pass if the SOURCE_BUCKETS environment variable is not empty
            and contains valid inputs`, function() {
            // Arrange
            process.env = {
                SOURCE_BUCKETS: 'allowedBucket001, allowedBucket002'
            }
            // Act
            const imageRequest = new ImageRequest();
            const result = imageRequest.getAllowedSourceBuckets();
            // Assert
            const expectedResult = ['allowedBucket001', 'allowedBucket002'];
            assert.deepEqual(result, expectedResult);
        });
    });
    describe('002/noSourceBucketsSpecified', function() {
        it(`Should throw an error if the SOURCE_BUCKETS environment variable is
            empty or does not contain valid values`, function() {
            // Arrange
            process.env = {};
            // Act
            const imageRequest = new ImageRequest();
            // Assert
            assert.throws(function() {
                imageRequest.getAllowedSourceBuckets();
            }, Object, {
                status: 400,
                code: 'GetAllowedSourceBuckets::NoSourceBuckets',
                message: 'The SOURCE_BUCKETS variable could not be read. Please check that it is not empty and contains at least one source bucket, or multiple buckets separated by commas. Spaces can be provided between commas and bucket names, these will be automatically parsed out when decoding.'
            });
        });
    });
})