// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

const fs = require('fs');

const mockAws = {
    getObject: jest.fn(),
    detectFaces: jest.fn(),
    detectModerationLabels: jest.fn()
};
jest.mock('aws-sdk', () => {
    return {
        S3: jest.fn(() => ({
            getObject: mockAws.getObject
        })),
        Rekognition: jest.fn(() => ({
            detectFaces: mockAws.detectFaces,
            detectModerationLabels: mockAws.detectModerationLabels
        }))
    };
});

const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const rekognition = new AWS.Rekognition();
const ImageHandler = require('../image-handler');
const sharp = require('sharp');

// ----------------------------------------------------------------------------
// [async] process()
// ----------------------------------------------------------------------------
describe('process()', function() {
    describe('001/default', function() {
        it('Should pass if the output image is different from the input image with edits applied', async function() {
            // Arrange
            const request = {
                requestType: "default",
                bucket: "sample-bucket",
                key: "sample-image-001.jpg",
                edits: {
                    grayscale: true,
                    flip: true
                },
                originalImage: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')
            }
            // Act
            const imageHandler = new ImageHandler(s3, rekognition);
            const result = await imageHandler.process(request);
            // Assert
            expect(result).not.toEqual(request.originalImage);
        });
    });
    describe('002/withToFormat', function() {
        it('Should pass if the output image is in a different format than the original image', async function() {
            // Arrange
            const request = {
                requestType: "default",
                bucket: "sample-bucket",
                key: "sample-image-001.jpg",
                outputFormat: "png",
                edits: {
                    grayscale: true,
                    flip: true
                },
                originalImage: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')
            }
            // Act
            const imageHandler = new ImageHandler(s3, rekognition);
            const result = await imageHandler.process(request);
            // Assert
            expect(result).not.toEqual(request.originalImage);
        });
    });
    describe('003/noEditsSpecified', function() {
        it('Should pass if no edits are specified and the original image is returned', async function() {
            // Arrange
            const request = {
                requestType: "default",
                bucket: "sample-bucket",
                key: "sample-image-001.jpg",
                originalImage: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')
            }
            // Act
            const imageHandler = new ImageHandler(s3, rekognition);
            const result = await imageHandler.process(request);
            // Assert
            expect(result).toEqual(request.originalImage.toString('base64'));
        });
    });
    describe('004/ExceedsLambdaPayloadLimit', function() {
        it('Should fail the return payload is larger than 6MB', async function() {
            // Arrange
            const request = {
                requestType: "default",
                bucket: "sample-bucket",
                key: "sample-image-001.jpg",
                originalImage: Buffer.alloc(6 * 1024 * 1024)
            };
            // Act
            const imageHandler = new ImageHandler(s3, rekognition);
            try {
                await imageHandler.process(request);
            } catch (error) {
                // Assert
                expect(error).toEqual({
                    status: '413',
                    code: 'TooLargeImageException',
                    message: 'The converted image is too large to return.'
                });
            }
        });
    });
    describe('005/RotateNull', function() {
        it('Should pass if rotate is null and return image without EXIF and ICC', async function() {
            // Arrange
            const originalImage = fs.readFileSync('./test/image/test.jpg');
            const request = {
                requestType: "default",
                bucket: "sample-bucket",
                key: "test.jpg",
                edits: {
                    rotate: null
                },
                originalImage: originalImage
            };
            // Act
            const imageHandler = new ImageHandler(s3, rekognition);
            const result = await imageHandler.process(request);
            // Assert
            const metadata = await sharp(Buffer.from(result, 'base64')).metadata();
            expect(metadata).not.toHaveProperty('exif');
            expect(metadata).not.toHaveProperty('icc');
            expect(metadata).not.toHaveProperty('orientation');
        });
    });
    describe('006/ImageOrientation', function() {
        it('Should pass if the original image has orientation', async function() {
            // Arrange
            const originalImage = fs.readFileSync('./test/image/test.jpg');
            const request = {
                requestType: "default",
                bucket: "sample-bucket",
                key: "test.jpg",
                edits: {
                    resize: {
                        width: 100,
                        height: 100
                    }
                },
                originalImage: originalImage
            };
            // Act
            const imageHandler = new ImageHandler(s3, rekognition);
            const result = await imageHandler.process(request);
            // Assert
            const metadata = await sharp(Buffer.from(result, 'base64')).metadata();
            expect(metadata).toHaveProperty('icc');
            expect(metadata).toHaveProperty('exif');
            expect(metadata.orientation).toEqual(3);
        });
    });
    describe('007/ImageWithoutOrientation', function() {
        it('Should pass if the original image does not have orientation', async function() {
            // Arrange
            const request = {
                requestType: "default",
                bucket: "sample-bucket",
                key: "test.jpg",
                edits: {
                    resize: {
                        width: 100,
                        height: 100
                    }
                },
                originalImage: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')
            };
            // Act
            const imageHandler = new ImageHandler(s3, rekognition);
            const result = await imageHandler.process(request);
            // Assert
            const metadata = await sharp(Buffer.from(result, 'base64')).metadata();
            expect(metadata).not.toHaveProperty('orientation');
        });
    });
});

// ----------------------------------------------------------------------------
// [async] applyEdits()
// ----------------------------------------------------------------------------
describe('applyEdits()', function() {
    describe('001/standardEdits', function() {
        it('Should pass if a series of standard edits are provided to the function', async function() {
            // Arrange
            const originalImage = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
            const image = sharp(originalImage, { failOnError: false }).withMetadata();
            const edits = {
                grayscale: true,
                flip: true
            }
            // Act
            const imageHandler = new ImageHandler(s3, rekognition);
            const result = await imageHandler.applyEdits(image, edits);
            // Assert
            const expectedResult1 = result.options.greyscale;
            const expectedResult2 = result.options.flip;
            const combinedResults = expectedResult1 && expectedResult2;
            expect(combinedResults).toEqual(true);
        });
    });
    describe('002/overlay', function() {
        it('Should pass if an edit with the overlayWith keyname is passed to the function', async function() {
            // Arrange
            const originalImage = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
            const image = sharp(originalImage, { failOnError: false }).withMetadata();
            const edits = {
                overlayWith: {
                    bucket: 'aaa',
                    key: 'bbb'
                }
            }
            // Mock
            mockAws.getObject.mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve({ Body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64') });
                    }
                };
            });
            // Act
            const imageHandler = new ImageHandler(s3, rekognition);
            const result = await imageHandler.applyEdits(image, edits);
            // Assert
            expect(mockAws.getObject).toHaveBeenCalledWith({ Bucket: 'aaa', Key: 'bbb' });
            expect(result.options.input.buffer).toEqual(originalImage);
        });
    });
    describe('003/overlay/options/smallerThanZero', function() {
        it('Should pass if an edit with the overlayWith keyname is passed to the function', async function() {
            // Arrange
            const originalImage = Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAAEAAQDAREAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACv/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AfwD/2Q==', 'base64');
            const image = sharp(originalImage, { failOnError: false }).withMetadata();
            const edits = {
                overlayWith: {
                    bucket: 'aaa',
                    key: 'bbb',
                    options: {
                        left: '-1',
                        top: '-1'
                    }
                }
            }
            // Mock
            mockAws.getObject.mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve({ Body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64') });
                    }
                };
            });
            // Act
            const imageHandler = new ImageHandler(s3, rekognition);
            const result = await imageHandler.applyEdits(image, edits);
            // Assert
            expect(mockAws.getObject).toHaveBeenCalledWith({ Bucket: 'aaa', Key: 'bbb' });
            expect(result.options.input.buffer).toEqual(originalImage);
        });
    });
    describe('004/overlay/options/greaterThanZero', function() {
        it('Should pass if an edit with the overlayWith keyname is passed to the function', async function() {
            // Arrange
            const originalImage = Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAAEAAQDAREAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACv/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AfwD/2Q==', 'base64');
            const image = sharp(originalImage, { failOnError: false }).withMetadata();
            const edits = {
                overlayWith: {
                    bucket: 'aaa',
                    key: 'bbb',
                    options: {
                        left: '1',
                        top: '1'
                    }
                }
            }
            // Mock
            mockAws.getObject.mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve({ Body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64') });
                    }
                };
            });
            // Act
            const imageHandler = new ImageHandler(s3, rekognition);
            const result = await imageHandler.applyEdits(image, edits);
            // Assert
            expect(mockAws.getObject).toHaveBeenCalledWith({ Bucket: 'aaa', Key: 'bbb' });
            expect(result.options.input.buffer).toEqual(originalImage);
        });
    });
    describe('005/overlay/options/percentage/greaterThanZero', function() {
        it('Should pass if an edit with the overlayWith keyname is passed to the function', async function() {
            // Arrange
            const originalImage = Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAAEAAQDAREAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACv/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AfwD/2Q==', 'base64');
            const image = sharp(originalImage, { failOnError: false }).withMetadata();
            const edits = {
                overlayWith: {
                    bucket: 'aaa',
                    key: 'bbb',
                    options: {
                        left: '50p',
                        top: '50p'
                    }
                }
            }
            // Mock
            mockAws.getObject.mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve({ Body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64') });
                    }
                };
            });
            // Act
            const imageHandler = new ImageHandler(s3, rekognition);
            const result = await imageHandler.applyEdits(image, edits);
            // Assert
            expect(mockAws.getObject).toHaveBeenCalledWith({ Bucket: 'aaa', Key: 'bbb' });
            expect(result.options.input.buffer).toEqual(originalImage);
        });
    });
    describe('006/overlay/options/percentage/smallerThanZero', function() {
        it('Should pass if an edit with the overlayWith keyname is passed to the function', async function() {
            // Arrange
            const originalImage = Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAAEAAQDAREAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACv/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AfwD/2Q==', 'base64');
            const image = sharp(originalImage, { failOnError: false }).withMetadata();
            const edits = {
                overlayWith: {
                    bucket: 'aaa',
                    key: 'bbb',
                    options: {
                        left: '-50p',
                        top: '-50p'
                    }
                }
            }
            // Mock
            mockAws.getObject.mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve({ Body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64') });
                    }
                };
            });
            // Act
            const imageHandler = new ImageHandler(s3, rekognition);
            const result = await imageHandler.applyEdits(image, edits);
            // Assert
            expect(mockAws.getObject).toHaveBeenCalledWith({ Bucket: 'aaa', Key: 'bbb' });
            expect(result.options.input.buffer).toEqual(originalImage);
        });
    });
    describe('007/smartCrop', function() {
        it('Should pass if an edit with the smartCrop keyname is passed to the function', async function() {
            // Arrange
            const originalImage = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
            const image = sharp(originalImage, { failOnError: false }).withMetadata();
            const buffer = await image.toBuffer();
            const edits = {
                smartCrop: {
                    faceIndex: 0,
                    padding: 0
                }
            }
            // Mock
            mockAws.detectFaces.mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve({
                            FaceDetails: [{
                                BoundingBox: {
                                    Height: 0.18,
                                    Left: 0.55,
                                    Top: 0.33,
                                    Width: 0.23
                                }
                            }]
                        });
                    }
                };
            });
            // Act
            const imageHandler = new ImageHandler(s3, rekognition);
            const result = await imageHandler.applyEdits(image, edits);
            // Assert
            expect(mockAws.detectFaces).toHaveBeenCalledWith({ Image: { Bytes: buffer }});
            expect(result.options.input).not.toEqual(originalImage);
        });
    });
    describe('008/smartCrop/paddingOutOfBoundsError', function() {
        it('Should pass if an excessive padding value is passed to the smartCrop filter', async function() {
            // Arrange
            const originalImage = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
            const image = sharp(originalImage, { failOnError: false }).withMetadata();
            const buffer = await image.toBuffer();
            const edits = {
                smartCrop: {
                    faceIndex: 0,
                    padding: 80
                }
            }
            // Mock
            mockAws.detectFaces.mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve({
                            FaceDetails: [{
                                BoundingBox: {
                                    Height: 0.18,
                                    Left: 0.55,
                                    Top: 0.33,
                                    Width: 0.23
                                }
                            }]
                        });
                    }
                };
            });
            // Act
            try {
                const imageHandler = new ImageHandler(s3, rekognition);
                await imageHandler.applyEdits(image, edits);
            } catch (error) {
                // Assert
                expect(mockAws.detectFaces).toHaveBeenCalledWith({ Image: { Bytes: buffer }});
                expect(error).toEqual({
                    status: 400,
                    code: 'SmartCrop::PaddingOutOfBounds',
                    message: 'The padding value you provided exceeds the boundaries of the original image. Please try choosing a smaller value or applying padding via Sharp for greater specificity.'
                });
            }
        });
    });
    describe('009/smartCrop/boundingBoxError', function() {
        it('Should pass if an excessive faceIndex value is passed to the smartCrop filter', async function() {
            // Arrange
            const originalImage = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
            const image = sharp(originalImage, { failOnError: false }).withMetadata();
            const buffer = await image.toBuffer();
            const edits = {
                smartCrop: {
                    faceIndex: 10,
                    padding: 0
                }
            }
            // Mock
            mockAws.detectFaces.mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve({
                            FaceDetails: [{
                                BoundingBox: {
                                    Height: 0.18,
                                    Left: 0.55,
                                    Top: 0.33,
                                    Width: 0.23
                                }
                            }]
                        });
                    }
                };
            });
            // Act
            try {
                const imageHandler = new ImageHandler(s3, rekognition);
                await imageHandler.applyEdits(image, edits);
            } catch (error) {
                // Assert
                expect(mockAws.detectFaces).toHaveBeenCalledWith({ Image: { Bytes: buffer }});
                expect(error).toEqual({
                    status: 400,
                    code: 'SmartCrop::FaceIndexOutOfRange',
                    message: 'You have provided a FaceIndex value that exceeds the length of the zero-based detectedFaces array. Please specify a value that is in-range.'
                });
            }
        });
    });
    describe('010/smartCrop/faceIndexUndefined', function() {
        it('Should pass if a faceIndex value of undefined is passed to the smartCrop filter', async function() {
            // Arrange
            const originalImage = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
            const image = sharp(originalImage, { failOnError: false }).withMetadata();
            const buffer = await image.toBuffer();
            const edits = {
                smartCrop: true
            }
            // Mock
            mockAws.detectFaces.mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve({
                            FaceDetails: [{
                                BoundingBox: {
                                    Height: 0.18,
                                    Left: 0.55,
                                    Top: 0.33,
                                    Width: 0.23
                                }
                            }]
                        });
                    }
                };
            });
            // Act
            const imageHandler = new ImageHandler(s3, rekognition);
            const result = await imageHandler.applyEdits(image, edits);
            // Assert
            expect(mockAws.detectFaces).toHaveBeenCalledWith({ Image: { Bytes: buffer }});
            expect(result.options.input).not.toEqual(originalImage);
        });
    });
    describe('011/resizeStringTypeNumber', function() {
        it('Should pass if resize width and height are provided as string number to the function', async function() {
            // Arrange
            const originalImage = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
            const image = sharp(originalImage, { failOnError: false }).withMetadata();
            const edits = {
                resize: {
                    width: '99.1',
                    height: '99.9'
                }
            }
            // Act
            const imageHandler = new ImageHandler(s3, rekognition);
            const result = await imageHandler.applyEdits(image, edits);
            // Assert
            const resultBuffer = await result.toBuffer();
            const convertedImage = await sharp(originalImage, { failOnError: false }).withMetadata().resize({ width: 99, height: 100 }).toBuffer();
            expect(resultBuffer).toEqual(convertedImage);
        });
    });
    describe('012/roundCrop/noOptions', function() {
        it('Should pass if roundCrop keyName is passed with no additional options', async function() {
            // Arrange
            const originalImage = Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAAEAAQDAREAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACv/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AfwD/2Q==', 'base64');
            const image = sharp(originalImage, { failOnError: false }).withMetadata();
            const metadata = image.metadata();
            
            const edits = {
                roundCrop: true,
                
            }

            // Act
            const imageHandler = new ImageHandler(s3, rekognition);
            const result = await imageHandler.applyEdits(image, edits);

            // Assert
            const expectedResult = {width: metadata.width / 2, height: metadata.height / 2}
            expect(mockAws.getObject).toHaveBeenCalledWith({ Bucket: 'aaa', Key: 'bbb' });
            expect(result.options.input).not.toEqual(expectedResult);
        });
    });
    describe('013/roundCrop/withOptions', function() {
        it('Should pass if roundCrop keyName is passed with additional options', async function() {
            // Arrange
            const originalImage = Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAAEAAQDAREAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACv/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AfwD/2Q==', 'base64');
            const image = sharp(originalImage, { failOnError: false }).withMetadata();
            const metadata = image.metadata();
            
            const edits = {
                roundCrop: {
                    top: 100,
                    left: 100,
                    rx: 100,
                    ry: 100,
                },
                
            }

            // Act
            const imageHandler = new ImageHandler(s3, rekognition);
            const result = await imageHandler.applyEdits(image, edits);

            // Assert
            const expectedResult = {width: metadata.width / 2, height: metadata.height / 2}
            expect(mockAws.getObject).toHaveBeenCalledWith({ Bucket: 'aaa', Key: 'bbb' });
            expect(result.options.input).not.toEqual(expectedResult);
        });
    });
    describe('014/contentModeration', function() {
        it('Should pass and blur image with minConfidence provided', async function() {
            // Arrange
            const originalImage = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
            const image = sharp(originalImage, { failOnError: false }).withMetadata();
            const buffer = await image.toBuffer();
            const edits = {
                contentModeration: {
                    minConfidence: 75
                }
            }
            // Mock
            mockAws.detectModerationLabels.mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve({
                            ModerationLabels: [
                              {
                                Confidence: 99.76720428466,
                                Name: 'Smoking',
                                ParentName: 'Tobacco'
                              },
                              { Confidence: 99.76720428466, Name: 'Tobacco', ParentName: '' }
                            ],
                            ModerationModelVersion: '4.0'
                          });
                    }
                };
            });
            // Act
            const imageHandler = new ImageHandler(s3, rekognition);
            const result = await imageHandler.applyEdits(image, edits);
            const expected = image.blur(50);
            // Assert
            expect(mockAws.detectFaces).toHaveBeenCalledWith({ Image: { Bytes: buffer }});
            expect(result.options.input).not.toEqual(originalImage);
            expect(result).toEqual(expected);
        });
        it("should pass and blur to specified amount if blur option is provided", async function() {
            // Arrange
            const originalImage = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
            const image = sharp(originalImage, { failOnError: false }).withMetadata();
            const buffer = await image.toBuffer();
            const edits = {
                contentModeration: {
                    minConfidence: 75,
                    blur: 100
                }
            }
            // Mock
            mockAws.detectModerationLabels.mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve({
                            ModerationLabels: [
                              {
                                Confidence: 99.76720428466,
                                Name: 'Smoking',
                                ParentName: 'Tobacco'
                              },
                              { Confidence: 99.76720428466, Name: 'Tobacco', ParentName: '' }
                            ],
                            ModerationModelVersion: '4.0'
                          });
                    }
                };
            });
            // Act
            const imageHandler = new ImageHandler(s3, rekognition);
            const result = await imageHandler.applyEdits(image, edits);
            const expected = image.blur(100);
            // Assert
            expect(mockAws.detectFaces).toHaveBeenCalledWith({ Image: { Bytes: buffer }});
            expect(result.options.input).not.toEqual(originalImage);
            expect(result).toEqual(expected);
        });
        it("should pass and blur if content moderation label matches specied moderartion label", async function() {
            // Arrange
            const originalImage = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
            const image = sharp(originalImage, { failOnError: false }).withMetadata();
            const buffer = await image.toBuffer();
            const edits = {
                contentModeration: {
                    moderationLabels: ["Smoking"]
                }
            }
            // Mock
            mockAws.detectModerationLabels.mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve({
                            ModerationLabels: [
                              {
                                Confidence: 99.76720428466,
                                Name: 'Smoking',
                                ParentName: 'Tobacco'
                              },
                              { Confidence: 99.76720428466, Name: 'Tobacco', ParentName: '' }
                            ],
                            ModerationModelVersion: '4.0'
                          });
                    }
                };
            });
            // Act
            const imageHandler = new ImageHandler(s3, rekognition);
            const result = await imageHandler.applyEdits(image, edits);
            const expected = image.blur(50);
            // Assert
            expect(mockAws.detectFaces).toHaveBeenCalledWith({ Image: { Bytes: buffer }});
            expect(result.options.input).not.toEqual(originalImage);
            expect(result).toEqual(expected);
        });
        it("should not blur if provided moderationLabels not found", async function() {
            // Arrange
            const originalImage = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
            const image = sharp(originalImage, { failOnError: false }).withMetadata();
            const buffer = await image.toBuffer();
            const edits = {
                contentModeration: {
                    minConfidence: 75,
                    blur: 100,
                    moderationLabels: ['Alcohol']
                }
            }
            // Mock
            mockAws.detectModerationLabels.mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve({
                            ModerationLabels: [
                              {
                                Confidence: 99.76720428466,
                                Name: 'Smoking',
                                ParentName: 'Tobacco'
                              },
                              { Confidence: 99.76720428466, Name: 'Tobacco', ParentName: '' }
                            ],
                            ModerationModelVersion: '4.0'
                          });
                    }
                };
            });
            // Act
            const imageHandler = new ImageHandler(s3, rekognition);
            const result = await imageHandler.applyEdits(image, edits);
            // Assert
            expect(mockAws.detectFaces).toHaveBeenCalledWith({ Image: { Bytes: buffer }});
            expect(result).toEqual(image);
        });
        it("should fail if rekognition returns an error", async function() {
            // Arrange
            const originalImage = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
            const image = sharp(originalImage, { failOnError: false }).withMetadata();
            const buffer = await image.toBuffer();
            const edits = {
                contentModeration: {
                    minConfidence: 75,
                    blur: 100
                }
            }
            // Mock
            mockAws.detectModerationLabels.mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.reject({
                            status: 500,
                            code: 'InternalServerError',
                            message: 'Amazon Rekognition experienced a service issue. Try your call again.'
                          });
                    }
                };
            });
            // Act
            const imageHandler = new ImageHandler(s3, rekognition);
            try {
                const result = await imageHandler.applyEdits(image, edits);
            } catch(error) {
            // Assert
                expect(mockAws.detectFaces).toHaveBeenCalledWith({ Image: { Bytes: buffer }});
                expect(error).toEqual({
                    status: 500,
                    code: 'InternalServerError',
                    message: 'Amazon Rekognition experienced a service issue. Try your call again.'
                  });
            }
        });
    });
});

// ----------------------------------------------------------------------------
// [async] getOverlayImage()
// ----------------------------------------------------------------------------
describe('getOverlayImage()', function() {
    describe('001/validParameters', function() {
        it('Should pass if the proper bucket name and key are supplied, simulating an image file that can be retrieved', async function() {
            // Mock
            mockAws.getObject.mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve({ Body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64') });
                    }
                };
            });
            // Act
            const imageHandler = new ImageHandler(s3, rekognition);
            const metadata = await sharp(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')).metadata();
            const result = await imageHandler.getOverlayImage('validBucket', 'validKey', '100', '100', '20', metadata);
            // Assert
            expect(mockAws.getObject).toHaveBeenCalledWith({ Bucket: 'validBucket', Key: 'validKey' });
            expect(result).toEqual(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACXBIWXMAAAsTAAALEwEAmpwYAAAADUlEQVQI12P4z8CQCgAEZgFlTg0nBwAAAABJRU5ErkJggg==', 'base64'));
        });
    });
    describe('002/imageDoesNotExist', function() {
        it('Should throw an error if an invalid bucket or key name is provided, simulating a non-existant overlay image', async function() {
            // Mock
            mockAws.getObject.mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.reject({
                            code: 'InternalServerError',
                            message: 'SimulatedInvalidParameterException'
                        });
                    }
                };
            });
            // Act
            const imageHandler = new ImageHandler(s3, rekognition);
            const metadata = await sharp(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')).metadata();
            try {
                await imageHandler.getOverlayImage('invalidBucket', 'invalidKey', '100', '100', '20', metadata);
            } catch (error) {
                // Assert
                expect(mockAws.getObject).toHaveBeenCalledWith({ Bucket: 'invalidBucket', Key: 'invalidKey' });
                expect(error).toEqual({
                    status: 500,
                    code: 'InternalServerError',
                    message: 'SimulatedInvalidParameterException'
                });
            }
        });
    });
});

// ----------------------------------------------------------------------------
// [async] getCropArea()
// ----------------------------------------------------------------------------
describe('getCropArea()', function() {
    describe('001/validParameters', function() {
        it('Should pass if the crop area can be calculated using a series of valid inputs/parameters', function() {
            // Arrange
            const boundingBox = {
                Height: 0.18,
                Left: 0.55,
                Top: 0.33,
                Width: 0.23
            };
            const options = { padding: 20 };
            const metadata = {
                width: 200,
                height: 400
            };
            // Act
            const imageHandler = new ImageHandler(s3, rekognition);
            const result = imageHandler.getCropArea(boundingBox, options, metadata);
            // Assert
            const expectedResult = {
                left: 90,
                top: 112,
                width: 86,
                height: 112
            };
            expect(result).toEqual(expectedResult);
        });
    });
});


// ----------------------------------------------------------------------------
// [async] getBoundingBox()
// ----------------------------------------------------------------------------
describe('getBoundingBox()', function() {
    describe('001/validParameters', function() {
        it('Should pass if the proper parameters are passed to the function', async function() {
            // Arrange
            const currentImage = Buffer.from('TestImageData');
            const faceIndex = 0;
            // Mock
            mockAws.detectFaces.mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve({
                            FaceDetails: [{
                                BoundingBox: {
                                    Height: 0.18,
                                    Left: 0.55,
                                    Top: 0.33,
                                    Width: 0.23
                                }
                            }]
                        });
                    }
                };
            });
            // Act
            const imageHandler = new ImageHandler(s3, rekognition);
            const result = await imageHandler.getBoundingBox(currentImage, faceIndex);
            // Assert
            const expectedResult = {
                Height: 0.18,
                Left: 0.55,
                Top: 0.33,
                Width: 0.23
            };
            expect(mockAws.detectFaces).toHaveBeenCalledWith({ Image: { Bytes: currentImage }});
            expect(result).toEqual(expectedResult);
        });
    });
    describe('002/errorHandling', function() {
        it('Should simulate an error condition returned by Rekognition', async function() {
            // Arrange
            const currentImage = Buffer.from('NotTestImageData');
            const faceIndex = 0;
            // Mock
            mockAws.detectFaces.mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.reject({
                            code: 'InternalServerError',
                            message: 'SimulatedError'
                        });
                    }
                };
            });
            // Act
            const imageHandler = new ImageHandler(s3, rekognition);
            try {
                await imageHandler.getBoundingBox(currentImage, faceIndex);
            } catch (error) {
                // Assert
                expect(mockAws.detectFaces).toHaveBeenCalledWith({ Image: { Bytes: currentImage }});
                expect(error).toEqual({
                    status: 500,
                    code: 'InternalServerError',
                    message: 'SimulatedError'
                });
            }
        });
    });
    describe('003/noDetectedFaces', function () {
        it('Should pass if no faces are detected', async function () {
            //Arrange
            const currentImage = Buffer.from('TestImageData');
            const faceIndex = 0;
        
            // Mock
            mockAws.detectFaces.mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve({
                            FaceDetails: []
                        });
                    }
                };
            });

            //Act
            const imageHandler = new ImageHandler(s3, rekognition);
            const result = await imageHandler.getBoundingBox(currentImage, faceIndex);
            
            // Assert
            const expectedResult = {
                Height: 1,
                Left: 0,
                Top: 0,
                Width: 1
            };
            expect(mockAws.detectFaces).toHaveBeenCalledWith({ Image: { Bytes: currentImage }});
            expect(result).toEqual(expectedResult);  
        });     
    });
    describe('004/boundsGreaterThanImageDimensions', function () {
        it('Should pass if bounds detected go beyond the image dimensions', async function () {
            //Arrange
            const currentImage = Buffer.from('TestImageData');
            const faceIndex = 0;
        
            // Mock
            mockAws.detectFaces.mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve({
                            FaceDetails: [{
                                BoundingBox: {
                                    Height: 1,
                                    Left: 0.50,
                                    Top: 0.30,
                                    Width: 0.65
                                }
                            }]
                        });
                    }
                };
            });

            //Act
            const imageHandler = new ImageHandler(s3, rekognition);
            const result = await imageHandler.getBoundingBox(currentImage, faceIndex);
            
            // Assert
            const expectedResult = {
                Height: 0.70,
                Left: 0.50,
                Top: 0.30,
                Width: 0.50
            };
            expect(mockAws.detectFaces).toHaveBeenCalledWith({ Image: { Bytes: currentImage }});
            expect(result).toEqual(expectedResult);  
        });     
    });
});