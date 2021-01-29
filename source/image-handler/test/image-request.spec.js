// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

const mockAws = {
    getObject: jest.fn(),
    getSecretValue: jest.fn()
};
jest.mock('aws-sdk', () => {
    return {
        S3: jest.fn(() => ({
            getObject: mockAws.getObject
        })),
        SecretsManager: jest.fn(() => ({
            getSecretValue: mockAws.getSecretValue
        }))
    };
});

const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const secretsManager = new AWS.SecretsManager();
const ImageRequest = require('../image-request');

// ----------------------------------------------------------------------------
// [async] setup()
// ----------------------------------------------------------------------------
describe('setup()', function() {
    beforeEach(() => {
        mockAws.getObject.mockReset();
    });

    describe('001/defaultImageRequest', function() {
        it('Should pass when a default image request is provided and populate the ImageRequest object with the proper values', async function() {
            // Arrange
            const event = {
                path : '/eyJidWNrZXQiOiJ2YWxpZEJ1Y2tldCIsImtleSI6InZhbGlkS2V5IiwiZWRpdHMiOnsiZ3JheXNjYWxlIjp0cnVlfSwib3V0cHV0Rm9ybWF0IjoianBlZyJ9'
            }
            process.env = {
                SOURCE_BUCKETS : "validBucket, validBucket2"
            }
            // Mock
            mockAws.getObject.mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve({ Body: Buffer.from('SampleImageContent\n') });
                    }
                };
            });
            // Act
            const imageRequest = new ImageRequest(s3, secretsManager);
            await imageRequest.setup(event);
            const expectedResult = {
                requestType: 'Default',
                bucket: 'validBucket',
                key: 'validKey',
                edits: { grayscale: true },
                outputFormat: 'jpeg',
                originalImage: Buffer.from('SampleImageContent\n'),
                CacheControl: 'max-age=31536000,public',
                ContentType: 'image/jpeg'
            };
            // Assert
            expect(mockAws.getObject).toHaveBeenCalledWith({ Bucket: 'validBucket', Key: 'validKey' });
            expect(imageRequest).toEqual(expectedResult);
        });
    });
    describe('002/defaultImageRequest/toFormat', function() {
        it('Should pass when a default image request is provided and populate the ImageRequest object with the proper values', async function() {
            // Arrange
            const event = {
                path : '/eyJidWNrZXQiOiJ2YWxpZEJ1Y2tldCIsImtleSI6InZhbGlkS2V5IiwiZWRpdHMiOnsidG9Gb3JtYXQiOiJwbmcifX0=',
            }
            process.env = {
                SOURCE_BUCKETS : "validBucket, validBucket2"
            }
            // Mock
            mockAws.getObject.mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve({ Body: Buffer.from('SampleImageContent\n') });
                    }
                };
            });
            // Act
            const imageRequest = new ImageRequest(s3, secretsManager);
            await imageRequest.setup(event);
            const expectedResult = {
                requestType: 'Default',
                bucket: 'validBucket',
                key: 'validKey',
                edits: { toFormat: 'png' },
                outputFormat: 'png',
                originalImage: Buffer.from('SampleImageContent\n'),
                CacheControl: 'max-age=31536000,public',
                ContentType: 'image/png'
            }
            // Assert
            expect(mockAws.getObject).toHaveBeenCalledWith({ Bucket: 'validBucket', Key: 'validKey' });
            expect(imageRequest).toEqual(expectedResult);
        });
    });
    describe('003/thumborImageRequest', function() {
        it('Should pass when a thumbor image request is provided and populate the ImageRequest object with the proper values', async function() {
            // Arrange
            const event = {
                path : "/filters:grayscale()/test-image-001.jpg"
            }
            process.env = {
                SOURCE_BUCKETS : "allowedBucket001, allowedBucket002"
            }
            // Mock
            mockAws.getObject.mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve({ Body: Buffer.from('SampleImageContent\n') });
                    }
                };
            });
            // Act
            const imageRequest = new ImageRequest(s3, secretsManager);
            await imageRequest.setup(event);
            const expectedResult = {
                requestType: 'Thumbor',
                bucket: 'allowedBucket001',
                key: 'test-image-001.jpg',
                edits: { grayscale: true },
                originalImage: Buffer.from('SampleImageContent\n'),
                CacheControl: 'max-age=31536000,public',
                ContentType: 'image'
            }
            // Assert
            expect(mockAws.getObject).toHaveBeenCalledWith({ Bucket: 'allowedBucket001', Key: 'test-image-001.jpg' });
            expect(imageRequest).toEqual(expectedResult);
        });
    });
    describe('004/thumborImageRequest/quality', function() {
        it('Should pass when a thumbor image request is provided and populate the ImageRequest object with the proper values', async function() {
            // Arrange
            const event = {
                path : "/filters:format(png)/filters:quality(50)/test-image-001.jpg"
            }
            process.env = {
                SOURCE_BUCKETS : "allowedBucket001, allowedBucket002"
            }
            // Mock
            mockAws.getObject.mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve({ Body: Buffer.from('SampleImageContent\n') });
                    }
                };
            });
            // Act
            const imageRequest = new ImageRequest(s3, secretsManager);
            await imageRequest.setup(event);
            const expectedResult = {
                requestType: 'Thumbor',
                bucket: 'allowedBucket001',
                key: 'test-image-001.jpg',
                edits: {
                    toFormat: 'png',
                    png: { quality: 50 }
                },
                originalImage: Buffer.from('SampleImageContent\n'),
                CacheControl: 'max-age=31536000,public',
                outputFormat: 'png',
                ContentType: 'image/png'
            }
            // Assert
            expect(mockAws.getObject).toHaveBeenCalledWith({ Bucket: 'allowedBucket001', Key: 'test-image-001.jpg' });
            expect(imageRequest).toEqual(expectedResult);
        });
    });
    describe('005/customImageRequest', function() {
        it('Should pass when a custom image request is provided and populate the ImageRequest object with the proper values', async function() {
            // Arrange
            const event = {
                path : '/filters-rotate(90)/filters-grayscale()/custom-image.jpg'
            }
            process.env = {
                SOURCE_BUCKETS : "allowedBucket001, allowedBucket002",
                REWRITE_MATCH_PATTERN: /(filters-)/gm,
                REWRITE_SUBSTITUTION: 'filters:'
            }
            // Mock
            mockAws.getObject.mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve({
                            CacheControl: 'max-age=300,public',
                            ContentType: 'custom-type',
                            Expires: 'Tue, 24 Dec 2019 13:46:28 GMT',
                            LastModified: 'Sat, 19 Dec 2009 16:30:47 GMT',
                            Body: Buffer.from('SampleImageContent\n')
                        });
                    }
                };
            });
            // Act
            const imageRequest = new ImageRequest(s3, secretsManager);
            await imageRequest.setup(event);
            const expectedResult = {
                requestType: 'Custom',
                bucket: 'allowedBucket001',
                key: 'custom-image.jpg',
                edits: {
                    grayscale: true,
                    rotate: 90
                },
                originalImage: Buffer.from('SampleImageContent\n'),
                CacheControl: 'max-age=300,public',
                ContentType: 'custom-type',
                Expires: 'Tue, 24 Dec 2019 13:46:28 GMT',
                LastModified: 'Sat, 19 Dec 2009 16:30:47 GMT',
            }
            // Assert
            expect(mockAws.getObject).toHaveBeenCalledWith({ Bucket: 'allowedBucket001', Key: 'custom-image.jpg' });
            expect(imageRequest).toEqual(expectedResult);
        });
    });
    describe('006/errorCase', function() {
        it('Should pass when an error is caught', async function() {
            // Arrange
            const event = {
                path : '/eyJidWNrZXQiOiJ2YWxpZEJ1Y2tldCIsImtleSI6InZhbGlkS2V5IiwiZWRpdHMiOnsiZ3JheXNjYWxlIjp0cnVlfX0='
            }
            process.env = {
                SOURCE_BUCKETS : "allowedBucket001, allowedBucket002"
            }
            // Act
            const imageRequest = new ImageRequest(s3, secretsManager);
            // Assert
            try {
                await imageRequest.setup(event);
            } catch (error) {
                expect(error.code).toEqual('ImageBucket::CannotAccessBucket');
            }
        });
    });
    describe('007/enableSignature', function() {
        beforeAll(() => {
            process.env.ENABLE_SIGNATURE = 'Yes';
            process.env.SECRETS_MANAGER = 'serverless-image-hander';
            process.env.SECRET_KEY = 'signatureKey';
            process.env.SOURCE_BUCKETS = 'validBucket';
        });
        it('Should pass when the image signature is correct', async function() {
            // Arrange
            const event = {
                path : '/eyJidWNrZXQiOiJ2YWxpZEJ1Y2tldCIsImtleSI6InZhbGlkS2V5IiwiZWRpdHMiOnsidG9Gb3JtYXQiOiJwbmcifX0=',
                queryStringParameters: {
                    signature: '4d41311006641a56de7bca8abdbda91af254506107a2c7b338a13ca2fa95eac3'
                }
            };
            // Mock
            mockAws.getObject.mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve({ Body: Buffer.from('SampleImageContent\n') });
                    }
                };
            });
            mockAws.getSecretValue.mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve({
                            SecretString: JSON.stringify({
                                [process.env.SECRET_KEY]: 'secret'
                            })
                        });
                    }
                };
            });
            // Act
            const imageRequest = new ImageRequest(s3, secretsManager);
            await imageRequest.setup(event);
            const expectedResult = {
                requestType: 'Default',
                bucket: 'validBucket',
                key: 'validKey',
                edits: { toFormat: 'png' },
                outputFormat: 'png',
                originalImage: Buffer.from('SampleImageContent\n'),
                CacheControl: 'max-age=31536000,public',
                ContentType: 'image/png'
            }
            // Assert
            expect(mockAws.getObject).toHaveBeenCalledWith({ Bucket: 'validBucket', Key: 'validKey' });
            expect(mockAws.getSecretValue).toHaveBeenCalledWith({ SecretId: process.env.SECRETS_MANAGER });
            expect(imageRequest).toEqual(expectedResult);
        });
        it('Should throw an error when queryStringParameters are missing', async function() {
            // Arrange
            const event = {
                path : '/eyJidWNrZXQiOiJ2YWxpZEJ1Y2tldCIsImtleSI6InZhbGlkS2V5IiwiZWRpdHMiOnsidG9Gb3JtYXQiOiJwbmcifX0=',
            };
            // Act
            const imageRequest = new ImageRequest(s3, secretsManager);
            try {
                await imageRequest.setup(event);
            } catch (error) {
                // Assert
                expect(error).toEqual({
                    status: 400,
                    message: 'Query-string requires the signature parameter.',
                    code: 'AuthorizationQueryParametersError'
                });
            }
        });
        it('Should throw an error when the image signature query parameter is missing', async function() {
            // Arrange
            const event = {
                path : '/eyJidWNrZXQiOiJ2YWxpZEJ1Y2tldCIsImtleSI6InZhbGlkS2V5IiwiZWRpdHMiOnsidG9Gb3JtYXQiOiJwbmcifX0=',
                queryStringParameters: {
                    sign: '4d41311006641a56de7bca8abdbda91af254506107a2c7b338a13ca2fa95eac3'
                }
            };
            // Act
            const imageRequest = new ImageRequest(s3, secretsManager);
            try {
                await imageRequest.setup(event);
            } catch (error) {
                // Assert
                expect(error).toEqual({
                    status: 400,
                    message: 'Query-string requires the signature parameter.',
                    code: 'AuthorizationQueryParametersError'
                });
            }
        });
        it('Should throw an error when signature does not match', async function() {
            // Arrange
            const event = {
                path : '/eyJidWNrZXQiOiJ2YWxpZEJ1Y2tldCIsImtleSI6InZhbGlkS2V5IiwiZWRpdHMiOnsidG9Gb3JtYXQiOiJwbmcifX0=',
                queryStringParameters: {
                    signature: 'invalid'
                }
            };
            // Mock
            mockAws.getSecretValue.mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve({
                            SecretString: JSON.stringify({
                                [process.env.SECRET_KEY]: 'secret'
                            })
                        });
                    }
                };
            });
            // Act
            const imageRequest = new ImageRequest(s3, secretsManager);
            try {
                await imageRequest.setup(event);
            } catch (error) {
                // Assert
                expect(mockAws.getSecretValue).toHaveBeenCalledWith({ SecretId: process.env.SECRETS_MANAGER });
                expect(error).toEqual({
                    status: 403,
                    message: 'Signature does not match.',
                    code: 'SignatureDoesNotMatch'
                });
            }
        });
        it('Should throw an error when any other error occurs', async function() {
            // Arrange
            const event = {
                path : '/eyJidWNrZXQiOiJ2YWxpZEJ1Y2tldCIsImtleSI6InZhbGlkS2V5IiwiZWRpdHMiOnsidG9Gb3JtYXQiOiJwbmcifX0=',
                queryStringParameters: {
                    signature: '4d41311006641a56de7bca8abdbda91af254506107a2c7b338a13ca2fa95eac3'
                }
            };
            // Mock
            mockAws.getSecretValue.mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.reject({
                            message: 'SimulatedError',
                            code: 'InternalServerError'
                        });
                    }
                };
            });
            // Act
            const imageRequest = new ImageRequest(s3, secretsManager);
            try {
                await imageRequest.setup(event);
            } catch (error) {
                // Assert
                expect(mockAws.getSecretValue).toHaveBeenCalledWith({ SecretId: process.env.SECRETS_MANAGER });
                expect(error).toEqual({
                    status: 500,
                    message: 'Signature validation failed.',
                    code: 'SignatureValidationFailure'
                });
            }
        });
    });
    describe('008/SVGSupport', function() {
        beforeAll(() => {
            process.env.ENABLE_SIGNATURE = 'No';
            process.env.SOURCE_BUCKETS = 'validBucket';
        });
        it('Should return SVG image when no edit is provided for the SVG image', async function() {
            // Arrange
            const event = {
                path : '/image.svg'
            };
            // Mock
            mockAws.getObject.mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve({
                            ContentType: 'image/svg+xml',
                            Body: Buffer.from('SampleImageContent\n')
                        });
                    }
                };
            });
            // Act
            const imageRequest = new ImageRequest(s3, secretsManager);
            await imageRequest.setup(event);
            const expectedResult = {
                requestType: 'Thumbor',
                bucket: 'validBucket',
                key: 'image.svg',
                edits: {},
                originalImage: Buffer.from('SampleImageContent\n'),
                CacheControl: 'max-age=31536000,public',
                ContentType: 'image/svg+xml'
            };
            // Assert
            expect(mockAws.getObject).toHaveBeenCalledWith({ Bucket: 'validBucket', Key: 'image.svg' });
            expect(imageRequest).toEqual(expectedResult);
        });
        it('Should return WebP image when there are any edits and no output is specified for the SVG image', async function() {
            // Arrange
            const event = {
                path : '/100x100/image.svg',
            };
            // Mock
            mockAws.getObject.mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve({
                            ContentType: 'image/svg+xml',
                            Body: Buffer.from('SampleImageContent\n')
                        });
                    }
                };
            });
            // Act
            const imageRequest = new ImageRequest(s3, secretsManager);
            await imageRequest.setup(event);
            const expectedResult = {
                requestType: 'Thumbor',
                bucket: 'validBucket',
                key: 'image.svg',
                edits: { resize: { width: 100, height: 100 } },
                outputFormat: 'png',
                originalImage: Buffer.from('SampleImageContent\n'),
                CacheControl: 'max-age=31536000,public',
                ContentType: 'image/png'
            };
            // Assert
            expect(mockAws.getObject).toHaveBeenCalledWith({ Bucket: 'validBucket', Key: 'image.svg' });
            expect(imageRequest).toEqual(expectedResult);
        });
        it('Should return JPG image when output is specified to JPG for the SVG image', async function() {
            // Arrange
            const event = {
                path : '/filters:format(jpg)/image.svg',
            };
            // Mock
            mockAws.getObject.mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve({
                            ContentType: 'image/svg+xml',
                            Body: Buffer.from('SampleImageContent\n')
                        });
                    }
                };
            });
            // Act
            const imageRequest = new ImageRequest(s3, secretsManager);
            await imageRequest.setup(event);
            const expectedResult = {
                requestType: 'Thumbor',
                bucket: 'validBucket',
                key: 'image.svg',
                edits: { toFormat: 'jpeg' },
                outputFormat: 'jpeg',
                originalImage: Buffer.from('SampleImageContent\n'),
                CacheControl: 'max-age=31536000,public',
                ContentType: 'image/jpeg'
            };
            // Assert
            expect(mockAws.getObject).toHaveBeenCalledWith({ Bucket: 'validBucket', Key: 'image.svg' });
            expect(imageRequest).toEqual(expectedResult);
        });
    });
    describe('009/customHeaders', function() {
        it('Should pass and return the customer headers if custom headers are provided', async function() {
            // Arrange
            const event = {
                path : '/eyJidWNrZXQiOiJ2YWxpZEJ1Y2tldCIsImtleSI6InZhbGlkS2V5IiwiaGVhZGVycyI6eyJDYWNoZS1Db250cm9sIjoibWF4LWFnZT0zMTUzNjAwMCxwdWJsaWMifSwib3V0cHV0Rm9ybWF0IjoianBlZyJ9'
            }
            process.env.SOURCE_BUCKETS = 'validBucket, validBucket2';
            // Mock
            mockAws.getObject.mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve({ Body: Buffer.from('SampleImageContent\n') });
                    }
                };
            });
            // Act
            const imageRequest = new ImageRequest(s3, secretsManager);
            await imageRequest.setup(event);
            const expectedResult = {
                requestType: 'Default',
                bucket: 'validBucket',
                key: 'validKey',
                headers: { 'Cache-Control': 'max-age=31536000,public' },
                outputFormat: 'jpeg',
                originalImage: Buffer.from('SampleImageContent\n'),
                CacheControl: 'max-age=31536000,public',
                ContentType: 'image/jpeg'
            };
            // Assert
            expect(mockAws.getObject).toHaveBeenCalledWith({ Bucket: 'validBucket', Key: 'validKey' });
            expect(imageRequest).toEqual(expectedResult);
        });
    });
});
// ----------------------------------------------------------------------------
// getOriginalImage()
// ----------------------------------------------------------------------------
describe('getOriginalImage()', function() {
    beforeEach(() => {
        mockAws.getObject.mockReset();
    });

    describe('001/imageExists', function() {
        it('Should pass if the proper bucket name and key are supplied, simulating an image file that can be retrieved', async function() {
            // Mock
            mockAws.getObject.mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve({ Body: Buffer.from('SampleImageContent\n') });
                    }
                };
            });
            // Act
            const imageRequest = new ImageRequest(s3, secretsManager);
            const result = await imageRequest.getOriginalImage('validBucket', 'validKey');
            // Assert
            expect(mockAws.getObject).toHaveBeenCalledWith({ Bucket: 'validBucket', Key: 'validKey' });
            expect(result).toEqual(Buffer.from('SampleImageContent\n'));
        });
    });
    describe('002/imageDoesNotExist', function() {
        it('Should throw an error if an invalid bucket or key name is provided, simulating a non-existant original image', async function() {
            // Mock
            mockAws.getObject.mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.reject({
                            code: 'NoSuchKey',
                            message: 'SimulatedException'
                        });
                    }
                };
            });
            // Act
            const imageRequest = new ImageRequest(s3, secretsManager);
            // Assert
            try {
               await imageRequest.getOriginalImage('invalidBucket', 'invalidKey');
            } catch (error) {
                expect(mockAws.getObject).toHaveBeenCalledWith({ Bucket: 'invalidBucket', Key: 'invalidKey' });
                expect(error.status).toEqual(404);
            }
        });
    });
    describe('003/unknownError', function() {
        it('Should throw an error if an unkown problem happens when getting an object', async function() {
            // Mock
            mockAws.getObject.mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.reject({
                            code: 'InternalServerError',
                            message: 'SimulatedException'
                        });
                    }
                };
            });
            // Act
            const imageRequest = new ImageRequest(s3, secretsManager);
            // Assert
            try {
                await imageRequest.getOriginalImage('invalidBucket', 'invalidKey');
            } catch (error) {
                expect(mockAws.getObject).toHaveBeenCalledWith({ Bucket: 'invalidBucket', Key: 'invalidKey' });
                expect(error.status).toEqual(500);
            }
        });
    });
    describe('004/noExtension', function() {
        const testFiles = [[0x89,0x50,0x4E,0x47],[0xFF,0xD8,0xFF,0xDB],[0xFF,0xD8,0xFF,0xE0],[0xFF,0xD8,0xFF,0xEE],[0xFF,0xD8,0xFF,0xE1],[0x52,0x49,0x46,0x46],[0x49,0x49,0x2A,0x00],[0x4D,0x4D,0x00,0x2A]];
        const expectFileType = ["image/png", "image/jpeg", "image/jpeg", "image/jpeg", "image/jpeg", "image/webp", "image/tiff", "image/tiff"];
        testFiles.forEach(function (test, index) {it('Should pass and infer content type if there is no extension, had default s3 content type and it has a vlid key and a valid bucket', async function() {
            //Mock
            mockAws.getObject.mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve({
                            ContentType: 'binary/octet-stream',
                            Body: Buffer.from(new Uint8Array(test))
                       });
                    }
                };
            })

            // Act
            const imageRequest = new ImageRequest(s3, secretsManager);
            const result = await imageRequest.getOriginalImage('validBucket', 'validKey');
            // Assert
            expect(mockAws.getObject).toHaveBeenCalledWith({ Bucket: 'validBucket', Key: 'validKey' });
            expect(result).toEqual(Buffer.from(new Uint8Array(test)));
            expect(imageRequest.ContentType).toEqual(expectFileType[index]);
        });})
        it('Should fail to infer content type if there is no extension and file header is not recognized', async function() {
            //Mock
            mockAws.getObject.mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve({
                            ContentType: 'binary/octet-stream',
                            Body: Buffer.from(new Uint8Array(test))
                       });
                    }
                };
            })

            //Act
            const imageRequest = new ImageRequest(s3, secretsManager);
            try {
                const result = await imageRequest.getOriginalImage('validBucket', 'validKey');
            } catch(error){
                //Assert
                expect(mockAws.getObject).toHaveBeenCalledWith({ Bucket: 'validBucket', Key: 'validKey' });
                expect(error.status).toEqual(500);
            }
        });
    });
});

// ----------------------------------------------------------------------------
// parseImageBucket()
// ----------------------------------------------------------------------------
describe('parseImageBucket()', function() {
    describe('001/defaultRequestType/bucketSpecifiedInRequest/allowed', function() {
        it('Should pass if the bucket name is provided in the image request and has been whitelisted in SOURCE_BUCKETS', function() {
            // Arrange
            const event = {
                path : '/eyJidWNrZXQiOiJhbGxvd2VkQnVja2V0MDAxIiwia2V5Ijoic2FtcGxlSW1hZ2VLZXkwMDEuanBnIiwiZWRpdHMiOnsiZ3JheXNjYWxlIjoidHJ1ZSJ9fQ=='
            }
            process.env = {
                SOURCE_BUCKETS : "allowedBucket001, allowedBucket002"
            }
            // Act
            const imageRequest = new ImageRequest(s3, secretsManager);
            const result = imageRequest.parseImageBucket(event, 'Default');
            // Assert
            const expectedResult = 'allowedBucket001';
            expect(result).toEqual(expectedResult);
        });
    });
    describe('002/defaultRequestType/bucketSpecifiedInRequest/notAllowed', function() {
        it('Should throw an error if the bucket name is provided in the image request but has not been whitelisted in SOURCE_BUCKETS', function() {
            // Arrange
            const event = {
                path : '/eyJidWNrZXQiOiJhbGxvd2VkQnVja2V0MDAxIiwia2V5Ijoic2FtcGxlSW1hZ2VLZXkwMDEuanBnIiwiZWRpdHMiOnsiZ3JheXNjYWxlIjoidHJ1ZSJ9fQ=='
            }
            process.env = {
                SOURCE_BUCKETS : "allowedBucket003, allowedBucket004"
            }
            // Act
            const imageRequest = new ImageRequest(s3, secretsManager);
            // Assert
            try {
                imageRequest.parseImageBucket(event, 'Default');
            } catch (error) {
                expect(error).toEqual({
                    status: 403,
                    code: 'ImageBucket::CannotAccessBucket',
                    message: 'The bucket you specified could not be accessed. Please check that the bucket is specified in your SOURCE_BUCKETS.'
                });
            }
        });
    });
    describe('003/defaultRequestType/bucketNotSpecifiedInRequest', function() {
        it('Should pass if the image request does not contain a source bucket but SOURCE_BUCKETS contains at least one bucket that can be used as a default', function() {
            // Arrange
            const event = {
                path : '/eyJrZXkiOiJzYW1wbGVJbWFnZUtleTAwMS5qcGciLCJlZGl0cyI6eyJncmF5c2NhbGUiOiJ0cnVlIn19=='
            }
            process.env = {
                SOURCE_BUCKETS : "allowedBucket001, allowedBucket002"
            }
            // Act
            const imageRequest = new ImageRequest(s3, secretsManager);
            const result = imageRequest.parseImageBucket(event, 'Default');
            // Assert
            const expectedResult = 'allowedBucket001';
            expect(result).toEqual(expectedResult);
        });
    });
    describe('004/thumborRequestType', function() {
        it('Should pass if there is at least one SOURCE_BUCKET specified that can be used as the default for Thumbor requests', function() {
            // Arrange
            const event = {
                path : "/filters:grayscale()/test-image-001.jpg"
            }
            process.env = {
                SOURCE_BUCKETS : "allowedBucket001, allowedBucket002"
            }
            // Act
            const imageRequest = new ImageRequest(s3, secretsManager);
            const result = imageRequest.parseImageBucket(event, 'Thumbor');
            // Assert
            const expectedResult = 'allowedBucket001';
            expect(result).toEqual(expectedResult);
        });
    });
    describe('005/customRequestType', function() {
        it('Should pass if there is at least one SOURCE_BUCKET specified that can be used as the default for Custom requests', function() {
            // Arrange
            const event = {
                path : "/filters:grayscale()/test-image-001.jpg"
            }
            process.env = {
                SOURCE_BUCKETS : "allowedBucket001, allowedBucket002"
            }
            // Act
            const imageRequest = new ImageRequest(s3, secretsManager);
            const result = imageRequest.parseImageBucket(event, 'Custom');
            // Assert
            const expectedResult = 'allowedBucket001';
            expect(result).toEqual(expectedResult);
        });
    });
    describe('006/invalidRequestType', function() {
        it('Should pass if there is at least one SOURCE_BUCKET specified that can be used as the default for Custom requests', function() {
            // Arrange
            const event = {
                path : "/filters:grayscale()/test-image-001.jpg"
            }
            process.env = {
                SOURCE_BUCKETS : "allowedBucket001, allowedBucket002"
            }
            // Act
            const imageRequest = new ImageRequest(s3, secretsManager);
            // Assert
            try {
                imageRequest.parseImageBucket(event, undefined);
            } catch (error) {
                expect(error).toEqual({
                    status: 404,
                    code: 'ImageBucket::CannotFindBucket',
                    message: 'The bucket you specified could not be found. Please check the spelling of the bucket name in your request.'
                });
            }
        });
    });
});

// ----------------------------------------------------------------------------
// parseImageEdits()
// ----------------------------------------------------------------------------
describe('parseImageEdits()', function() {
    describe('001/defaultRequestType', function() {
        it('Should pass if the proper result is returned for a sample base64-encoded image request', function() {
            // Arrange
            const event = {
                path : '/eyJlZGl0cyI6eyJncmF5c2NhbGUiOiJ0cnVlIiwicm90YXRlIjo5MCwiZmxpcCI6InRydWUifX0='
            }
            // Act
            const imageRequest = new ImageRequest(s3, secretsManager);
            const result = imageRequest.parseImageEdits(event, 'Default');
            // Assert
            const expectedResult = {
                grayscale: 'true',
                rotate: 90,
                flip: 'true'
            }
            expect(result).toEqual(expectedResult);
        });
    });
    describe('002/thumborRequestType', function() {
        it('Should pass if the proper result is returned for a sample thumbor-type image request', function() {
            // Arrange
            const event = {
                path : '/filters:rotate(90)/filters:grayscale()/thumbor-image.jpg'
            }
            // Act
            const imageRequest = new ImageRequest(s3, secretsManager);
            const result = imageRequest.parseImageEdits(event, 'Thumbor');
            // Assert
            const expectedResult = {
                rotate: 90,
                grayscale: true
            }
            expect(result).toEqual(expectedResult);
        });
    });
    describe('003/customRequestType', function() {
        it('Should pass if the proper result is returned for a sample custom-type image request', function() {
            // Arrange
            const event = {
                path : '/filters-rotate(90)/filters-grayscale()/thumbor-image.jpg'
            }
            process.env.REWRITE_MATCH_PATTERN = /(filters-)/gm;
            process.env.REWRITE_SUBSTITUTION = 'filters:';
            // Act
            const imageRequest = new ImageRequest(s3, secretsManager);
            const result = imageRequest.parseImageEdits(event, 'Custom');
            // Assert
            const expectedResult = {
                rotate: 90,
                grayscale: true
            }
            expect(result).toEqual(expectedResult);
        });
    });
    describe('004/customRequestType', function() {
        it('Should throw an error if a requestType is not specified and/or the image edits cannot be parsed', function() {
            // Arrange
            const event = {
                path : '/filters:rotate(90)/filters:grayscale()/other-image.jpg'
            }
            // Act
            const imageRequest = new ImageRequest(s3, secretsManager);
            // Assert
            try {
                imageRequest.parseImageEdits(event, undefined);
            } catch (error) {
                expect(error).toEqual({
                    status: 400,
                    code: 'ImageEdits::CannotParseEdits',
                    message: 'The edits you provided could not be parsed. Please check the syntax of your request and refer to the documentation for additional guidance.'
                });
            }
        });
    });
});

// ----------------------------------------------------------------------------
// parseImageKey()
// ----------------------------------------------------------------------------
describe('parseImageKey()', function() {
    describe('001/defaultRequestType', function() {
        it('Should pass if an image key value is provided in the default request format', function() {
            // Arrange
            const event = {
                path : '/eyJidWNrZXQiOiJteS1zYW1wbGUtYnVja2V0Iiwia2V5Ijoic2FtcGxlLWltYWdlLTAwMS5qcGcifQ=='
            }
            // Act
            const imageRequest = new ImageRequest(s3, secretsManager);
            const result = imageRequest.parseImageKey(event, 'Default');
            // Assert
            const expectedResult = 'sample-image-001.jpg';
            expect(result).toEqual(expectedResult);
        });
    });
    describe('002/defaultRequestType/withSlashRequest', function () {
        it('should read image requests with base64 encoding having slash', function () {
            const event = {
                path : '/eyJidWNrZXQiOiJlbGFzdGljYmVhbnN0YWxrLXVzLWVhc3QtMi0wNjY3ODQ4ODU1MTgiLCJrZXkiOiJlbnYtcHJvZC9nY2MvbGFuZGluZ3BhZ2UvMV81N19TbGltTl9MaWZ0LUNvcnNldC1Gb3ItTWVuLVNOQVAvYXR0YWNobWVudHMvZmZjMWYxNjAtYmQzOC00MWU4LThiYWQtZTNhMTljYzYxZGQzX1/Ys9mE2YrZhSDZhNmK2YHYqiAoMikuanBnIiwiZWRpdHMiOnsicmVzaXplIjp7IndpZHRoIjo0ODAsImZpdCI6ImNvdmVyIn19fQ=='
            }
            // Act
            const imageRequest = new ImageRequest(s3, secretsManager);
            const result = imageRequest.parseImageKey(event, 'Default');
            // Assert
            const expectedResult = 'env-prod/gcc/landingpage/1_57_SlimN_Lift-Corset-For-Men-SNAP/attachments/ffc1f160-bd38-41e8-8bad-e3a19cc61dd3__سليم ليفت (2).jpg';
            expect(result).toEqual(expectedResult);

        })
    });
    describe('003/thumborRequestType', function() {
        it('Should pass if an image key value is provided in the thumbor request format', function() {
            // Arrange
            const event = {
                path : '/filters:rotate(90)/filters:grayscale()/thumbor-image.jpg'
            }
            // Act
            const imageRequest = new ImageRequest(s3, secretsManager);
            const result = imageRequest.parseImageKey(event, 'Thumbor');
            // Assert
            const expectedResult = 'thumbor-image.jpg';
            expect(result).toEqual(expectedResult);
        });
    });
    describe('004/customRequestType', function() {
        it('Should pass if an image key value is provided in the custom request format', function() {
            // Arrange
            const event = {
                path : '/filters-rotate(90)/filters-grayscale()/custom-image.jpg'
            };
            process.env.REWRITE_MATCH_PATTERN = /(filters-)/gm;
            process.env.REWRITE_SUBSTITUTION = 'filters:';
            // Act
            const imageRequest = new ImageRequest(s3, secretsManager);
            const result = imageRequest.parseImageKey(event, 'Custom');
            // Assert
            const expectedResult = 'custom-image.jpg';
            expect(result).toEqual(expectedResult);
        });
    });
    describe('005/customRequestStringType', function() {
        it('Should pass if an image key value is provided in the custom request format', function() {
            // Arrange
            const event = {
                path : '/filters-rotate(90)/filters-grayscale()/custom-image.jpg'
            };
            process.env.REWRITE_MATCH_PATTERN = '/(filters-)/gm';
            process.env.REWRITE_SUBSTITUTION = 'filters:';
            // Act
            const imageRequest = new ImageRequest(s3, secretsManager);
            const result = imageRequest.parseImageKey(event, 'Custom');
            // Assert
            const expectedResult = 'custom-image.jpg';
            expect(result).toEqual(expectedResult);
        });
    });
    describe('006/elseCondition', function() {
        it('Should throw an error if an unrecognized requestType is passed into the function as a parameter', function() {
            // Arrange
            const event = {
                path : '/filters:rotate(90)/filters:grayscale()/other-image.jpg'
            }
            // Act
            const imageRequest = new ImageRequest(s3, secretsManager);
            // Assert
            try {
                imageRequest.parseImageKey(event, undefined);
            } catch (error) {
                expect(error).toEqual({
                    status: 404,
                    code: 'ImageEdits::CannotFindImage',
                    message: 'The image you specified could not be found. Please check your request syntax as well as the bucket you specified to ensure it exists.'
                });
            }
        });
    });
});

// ----------------------------------------------------------------------------
// parseRequestType()
// ----------------------------------------------------------------------------
describe('parseRequestType()', function() {
    describe('001/defaultRequestType', function() {
        it('Should pass if the method detects a default request', function() {
            // Arrange
            const event = {
                path: '/eyJidWNrZXQiOiJteS1zYW1wbGUtYnVja2V0Iiwia2V5IjoibXktc2FtcGxlLWtleSIsImVkaXRzIjp7ImdyYXlzY2FsZSI6dHJ1ZX19'
            }
            process.env = {};
            // Act
            const imageRequest = new ImageRequest(s3, secretsManager);
            const result = imageRequest.parseRequestType(event);
            // Assert
            const expectedResult = 'Default';
            expect(result).toEqual(expectedResult);
        });
    });
    describe('002/thumborRequestType', function() {
        it('Should pass if the method detects a thumbor request', function() {
            // Arrange
            const event = {
                path: '/unsafe/filters:brightness(10):contrast(30)/https://upload.wikimedia.org/wikipedia/commons/thumb/7/79/Coffee_berries_1.jpg/1200px-Coffee_berries_1.jpg'
            }
            process.env = {};
            // Act
            const imageRequest = new ImageRequest(s3, secretsManager);
            const result = imageRequest.parseRequestType(event);
            // Assert
            const expectedResult = 'Thumbor';
            expect(result).toEqual(expectedResult);
        });
    });
    describe('003/customRequestType', function() {
        it('Should pass if the method detects a custom request', function() {
            // Arrange
            const event = {
                path: '/additionalImageRequestParameters/image.jpg'
            }
            process.env = {
                REWRITE_MATCH_PATTERN: 'matchPattern',
                REWRITE_SUBSTITUTION: 'substitutionString'
            }
            // Act
            const imageRequest = new ImageRequest(s3, secretsManager);
            const result = imageRequest.parseRequestType(event);
            // Assert
            const expectedResult = 'Custom';
            expect(result).toEqual(expectedResult);
        });
    });
    describe('004/elseCondition', function() {
        it('Should throw an error if the method cannot determine the request type based on the three groups given', function() {
            // Arrange
            const event = {
                path : '12x12e24d234r2ewxsad123d34r.bmp'
            }
            process.env = {};
            // Act
            const imageRequest = new ImageRequest(s3, secretsManager);
            // Assert
            try {
                imageRequest.parseRequestType(event);
            } catch (error) {
                expect(error).toEqual({
                    status: 400,
                    code: 'RequestTypeError',
                    message: 'The type of request you are making could not be processed. Please ensure that your original image is of a supported file type (jpg, png, tiff, webp, svg) and that your image request is provided in the correct syntax. Refer to the documentation for additional guidance on forming image requests.'
                });
            }
        });
    });
});

// ----------------------------------------------------------------------------
// parseImageHaders()
// ----------------------------------------------------------------------------
describe('parseImageHaders()', function() {
    it('001/Should return headers if headers are provided for a sample base64-encoded image request', function() {
        // Arrange
        const event = {
            path: '/eyJidWNrZXQiOiJ2YWxpZEJ1Y2tldCIsImtleSI6InZhbGlkS2V5IiwiaGVhZGVycyI6eyJDYWNoZS1Db250cm9sIjoibWF4LWFnZT0zMTUzNjAwMCxwdWJsaWMifSwib3V0cHV0Rm9ybWF0IjoianBlZyJ9'
        };
        // Act
        const imageRequest = new ImageRequest(s3, secretsManager);
        const result = imageRequest.parseImageHeaders(event, 'Default');
        // Assert
        const expectedResult = {
            'Cache-Control': 'max-age=31536000,public'
        };
        expect(result).toEqual(expectedResult);
    });
    it('001/Should retrun undefined if headers are not provided for a base64-encoded image request', function() {
        // Arrange
        const event = {
            path: '/eyJidWNrZXQiOiJ2YWxpZEJ1Y2tldCIsImtleSI6InZhbGlkS2V5In0='
        };
        // Act
        const imageRequest = new ImageRequest(s3, secretsManager);
        const result = imageRequest.parseImageHeaders(event, 'Default');
        // Assert
        expect(result).toEqual(undefined);
    });
    it('001/Should retrun undefined for Thumbor or Custom requests', function() {
        // Arrange
        const event = {
            path: '/test.jpg'
        };
        // Act
        const imageRequest = new ImageRequest(s3, secretsManager);
        const result = imageRequest.parseImageHeaders(event, 'Thumbor');
        // Assert
        expect(result).toEqual(undefined);
    });
});

// ----------------------------------------------------------------------------
// decodeRequest()
// ----------------------------------------------------------------------------
describe('decodeRequest()', function() {
    describe('001/validRequestPathSpecified', function() {
        it('Should pass if a valid base64-encoded path has been specified', function() {
            // Arrange
            const event = {
                path : '/eyJidWNrZXQiOiJidWNrZXQtbmFtZS1oZXJlIiwia2V5Ijoia2V5LW5hbWUtaGVyZSJ9'
            }
            // Act
            const imageRequest = new ImageRequest(s3, secretsManager);
            const result = imageRequest.decodeRequest(event);
            // Assert
            const expectedResult = {
                bucket: 'bucket-name-here',
                key: 'key-name-here'
            };
            expect(result).toEqual(expectedResult);
        });
    });
    describe('002/invalidRequestPathSpecified', function() {
        it('Should throw an error if a valid base64-encoded path has not been specified', function() {
            // Arrange
            const event = {
                path : '/someNonBase64EncodedContentHere'
            }
            // Act
            const imageRequest = new ImageRequest(s3, secretsManager);
            // Assert
            try {
                imageRequest.decodeRequest(event);
            } catch (error) {
                expect(error).toEqual({
                    status: 400,
                    code: 'DecodeRequest::CannotDecodeRequest',
                    message: 'The image request you provided could not be decoded. Please check that your request is base64 encoded properly and refer to the documentation for additional guidance.'
                });
            }
        });
    });
    describe('003/noPathSpecified', function() {
        it('Should throw an error if no path is specified at all',
            function() {
            // Arrange
            const event = {}
            // Act
            const imageRequest = new ImageRequest(s3, secretsManager);
            // Assert
            try {
                imageRequest.decodeRequest(event);
            } catch (error) {
                expect(error).toEqual({
                    status: 400,
                    code: 'DecodeRequest::CannotReadPath',
                    message: 'The URL path you provided could not be read. Please ensure that it is properly formed according to the solution documentation.'
                });
            }
        });
    });
});

// ----------------------------------------------------------------------------
// getAllowedSourceBuckets()
// ----------------------------------------------------------------------------
describe('getAllowedSourceBuckets()', function() {
    describe('001/sourceBucketsSpecified', function() {
        it('Should pass if the SOURCE_BUCKETS environment variable is not empty and contains valid inputs', function() {
            // Arrange
            process.env = {
                SOURCE_BUCKETS: 'allowedBucket001, allowedBucket002'
            }
            // Act
            const imageRequest = new ImageRequest(s3, secretsManager);
            const result = imageRequest.getAllowedSourceBuckets();
            // Assert
            const expectedResult = ['allowedBucket001', 'allowedBucket002'];
            expect(result).toEqual(expectedResult);
        });
    });
    describe('002/noSourceBucketsSpecified', function() {
        it('Should throw an error if the SOURCE_BUCKETS environment variable is empty or does not contain valid values', function() {
            // Arrange
            process.env = {};
            // Act
            const imageRequest = new ImageRequest(s3, secretsManager);
            // Assert
            try {
                imageRequest.getAllowedSourceBuckets();
            } catch (error) {
                expect(error).toEqual({
                    status: 400,
                    code: 'GetAllowedSourceBuckets::NoSourceBuckets',
                    message: 'The SOURCE_BUCKETS variable could not be read. Please check that it is not empty and contains at least one source bucket, or multiple buckets separated by commas. Spaces can be provided between commas and bucket names, these will be automatically parsed out when decoding.'
                });
            }
        });
    });
});

// ----------------------------------------------------------------------------
// getOutputFormat()
// ----------------------------------------------------------------------------
describe('getOutputFormat()', function () {
    describe('001/AcceptsHeaderIncludesWebP', function () {
        it('Should pass if it returns "webp" for an accepts header which includes webp', function () {
            // Arrange
            process.env = {
                AUTO_WEBP: 'Yes'
            };
            const event = {
                headers: {
                    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3"
                }
            };
            // Act
            const imageRequest = new ImageRequest(s3, secretsManager);
            const result = imageRequest.getOutputFormat(event);
            // Assert
            expect(result).toEqual('webp');
        });
    });
    describe('002/AcceptsHeaderDoesNotIncludeWebP', function () {
        it('Should pass if it returns null for an accepts header which does not include webp', function () {
            // Arrange
            process.env = {
                AUTO_WEBP: 'Yes'
            };
            const event = {
                headers: {
                    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/apng,*/*;q=0.8,application/signed-exchange;v=b3"
                }
            };
            // Act
            const imageRequest = new ImageRequest(s3, secretsManager);
            const result = imageRequest.getOutputFormat(event);
            // Assert
            expect(result).toEqual(null);
        });
    });
    describe('003/AutoWebPDisabled', function () {
        it('Should pass if it returns null when AUTO_WEBP is disabled with accepts header including webp', function () {
            // Arrange
            process.env = {
                AUTO_WEBP: 'No'
            };
            const event = {
                headers: {
                    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3"
                }
            };
            // Act
            const imageRequest = new ImageRequest(s3, secretsManager);
            const result = imageRequest.getOutputFormat(event);
            // Assert
            expect(result).toEqual(null);
        });
    });
    describe('004/AutoWebPUnset', function () {
        it('Should pass if it returns null when AUTO_WEBP is not set with accepts header including webp', function () {
            // Arrange
            const event = {
                headers: {
                    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3"
                }
            };
            // Act
            const imageRequest = new ImageRequest(s3, secretsManager);
            const result = imageRequest.getOutputFormat(event);
            // Assert
            expect(result).toEqual(null);
        });
    });
});
