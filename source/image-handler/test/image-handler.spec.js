// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

const fs = require('fs');

const mockAws = {
  getObject: jest.fn(),
  detectFaces: jest.fn()
};
jest.mock('aws-sdk', () => {
  return {
    S3: jest.fn(() => ({
      getObject: mockAws.getObject
    })),
    Rekognition: jest.fn(() => ({
      detectFaces: mockAws.detectFaces
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
describe('process()', () => {
  describe('001/default', () => {
    it('Should pass if the output image is different from the input image with edits applied', async () => {
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
      };
      // Act
      const imageHandler = new ImageHandler(s3, rekognition);
      const result = await imageHandler.process(request);
      // Assert
      expect(result).not.toEqual(request.originalImage);
    });
  });
  describe('002/withToFormat', () => {
    it('Should pass if the output image is in a different format than the original image', async () => {
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
      };
      // Act
      const imageHandler = new ImageHandler(s3, rekognition);
      const result = await imageHandler.process(request);
      // Assert
      expect(result).not.toEqual(request.originalImage);
    });
  });
  describe('003/noEditsSpecified', () => {
    it('Should pass if no edits are specified and the original image is returned', async () => {
      // Arrange
      const request = {
        requestType: "default",
        bucket: "sample-bucket",
        key: "sample-image-001.jpg",
        originalImage: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')
      };
      // Act
      const imageHandler = new ImageHandler(s3, rekognition);
      const result = await imageHandler.process(request);
      // Assert
      expect(result).toEqual(request.originalImage.toString('base64'));
    });
  });
  describe('004/ExceedsLambdaPayloadLimit', () => {
    it('Should fail the return payload is larger than 6MB', async () => {
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
          status: 413,
          code: 'TooLargeImageException',
          message: 'The converted image is too large to return. Actual = 8388608 - max 6291456'
        });
      }
    });
  });
  describe('005/RotateNull', () => {
    it('Should pass if rotate is null and return image without EXIF and ICC', async () => {
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
  describe('006/ImageOrientation', () => {
    it('Should pass if the original image has orientation', async () => {
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
  describe('007/ImageWithoutOrientation', () => {
    it('Should pass if the original image does not have orientation', async () => {
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
  describe('008/CropOutOfBounds', () => {
    it('Should fail if crop outside image boundaries', async () => {
      // Arrange
      const request = {
        requestType: "default",
        bucket: "sample-bucket",
        key: "sample-image-001.jpg",
        // 1 by 1 sample image
        originalImage: fs.readFileSync('./test/image/test.jpg'),
        cropping: {
          left: 0,
          top: 0,
          width: 5,
          height: 5
        },
        edits: {}
      };
      // Act
      const imageHandler = new ImageHandler(s3, rekognition);
      try {
        await imageHandler.process(request);
      } catch (error) {
        // Assert
        expect(error).toEqual({
          status: 400,
          code: 'CropOutOfBounds',
          message: 'The cropping 0,0x5:5 is outside the image boundary of 1x1'
        });
      }
    });
  });
  describe('009/zeroCropping', function () {
    it('Should throw an error if crop with zero width/height is requested.', async function () {
      // Arrange
      const request = {
        requestType: "default",
        bucket: "sample-bucket",
        key: "sample-image-001.jpg",
        // 1 by 1 sample image
        originalImage: fs.readFileSync('./test/image/test.jpg'),
        cropping: {
          left: 0,
          top: 0,
          width: 0,
          height: 0
        },
        edits: {}
      };
      // Act
      const imageHandler = new ImageHandler(s3, rekognition);
      try {
        await imageHandler.process(request);
      } catch (error) {
        // Assert
        expect(error).toEqual({
          status: 400,
          code: 'CropHasZeroDimension',
          message: 'The cropping with dimension 0x0 is invalid'
        });
      }
    });
  });

});

// ----------------------------------------------------------------------------
// [async] applyEdits()
// ----------------------------------------------------------------------------
describe('applyEdits()', () => {
  describe('001/standardEdits', () => {
    it('Should pass if a series of standard edits are provided to the function', async () => {
      // Arrange
      const originalImage = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
      const image = sharp(originalImage, {failOnError: false}).withMetadata();
      const edits = {
        grayscale: true,
        flip: true
      };
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
  describe('002/overlay', () => {
    it('Should pass if an edit with the overlayWith keyname is passed to the function', async () => {
      // Arrange
      const originalImage = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
      const image = sharp(originalImage, {failOnError: false}).withMetadata();
      const edits = {
        overlayWith: {
          bucket: 'aaa',
          key: 'bbb'
        }
      };
      // Mock
      mockAws.getObject.mockImplementationOnce(() => {
        return {
          promise() {
            return Promise.resolve({Body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')});
          }
        };
      });
      // Act
      const imageHandler = new ImageHandler(s3, rekognition);
      const result = await imageHandler.applyEdits(image, edits);
      // Assert
      expect(mockAws.getObject).toHaveBeenCalledWith({Bucket: 'aaa', Key: 'bbb'});
      expect(result.options.input.buffer).toEqual(originalImage);
    });
  });
  describe('003/overlay/options/smallerThanZero', () => {
    it('Should pass if an edit with the overlayWith keyname is passed to the function', async () => {
      // Arrange
      const originalImage = Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAAEAAQDAREAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACv/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AfwD/2Q==', 'base64');
      const image = sharp(originalImage, {failOnError: false}).withMetadata();
      const edits = {
        overlayWith: {
          bucket: 'aaa',
          key: 'bbb',
          options: {
            left: '-1',
            top: '-1'
          }
        }
      };
      // Mock
      mockAws.getObject.mockImplementationOnce(() => {
        return {
          promise() {
            return Promise.resolve({Body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')});
          }
        };
      });
      // Act
      const imageHandler = new ImageHandler(s3, rekognition);
      const result = await imageHandler.applyEdits(image, edits);
      // Assert
      expect(mockAws.getObject).toHaveBeenCalledWith({Bucket: 'aaa', Key: 'bbb'});
      expect(result.options.input.buffer).toEqual(originalImage);
    });
  });
  describe('004/overlay/options/greaterThanZero', () => {
    it('Should pass if an edit with the overlayWith keyname is passed to the function', async () => {
      // Arrange
      const originalImage = Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAAEAAQDAREAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACv/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AfwD/2Q==', 'base64');
      const image = sharp(originalImage, {failOnError: false}).withMetadata();
      const edits = {
        overlayWith: {
          bucket: 'aaa',
          key: 'bbb',
          options: {
            left: '1',
            top: '1'
          }
        }
      };
      // Mock
      mockAws.getObject.mockImplementationOnce(() => {
        return {
          promise() {
            return Promise.resolve({Body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')});
          }
        };
      });
      // Act
      const imageHandler = new ImageHandler(s3, rekognition);
      const result = await imageHandler.applyEdits(image, edits);
      // Assert
      expect(mockAws.getObject).toHaveBeenCalledWith({Bucket: 'aaa', Key: 'bbb'});
      expect(result.options.input.buffer).toEqual(originalImage);
    });
  });
  describe('005/overlay/options/percentage/greaterThanZero', () => {
    it('Should pass if an edit with the overlayWith keyname is passed to the function', async () => {
      // Arrange
      const originalImage = Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAAEAAQDAREAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACv/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AfwD/2Q==', 'base64');
      const image = sharp(originalImage, {failOnError: false}).withMetadata();
      const edits = {
        overlayWith: {
          bucket: 'aaa',
          key: 'bbb',
          options: {
            left: '50p',
            top: '50p'
          }
        }
      };
      // Mock
      mockAws.getObject.mockImplementationOnce(() => {
        return {
          promise() {
            return Promise.resolve({Body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')});
          }
        };
      });
      // Act
      const imageHandler = new ImageHandler(s3, rekognition);
      const result = await imageHandler.applyEdits(image, edits);
      // Assert
      expect(mockAws.getObject).toHaveBeenCalledWith({Bucket: 'aaa', Key: 'bbb'});
      expect(result.options.input.buffer).toEqual(originalImage);
    });
  });
  describe('006/overlay/options/percentage/smallerThanZero', () => {
    it('Should pass if an edit with the overlayWith keyname is passed to the function', async () => {
      // Arrange
      const originalImage = Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAAEAAQDAREAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACv/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AfwD/2Q==', 'base64');
      const image = sharp(originalImage, {failOnError: false}).withMetadata();
      const edits = {
        overlayWith: {
          bucket: 'aaa',
          key: 'bbb',
          options: {
            left: '-50p',
            top: '-50p'
          }
        }
      };
      // Mock
      mockAws.getObject.mockImplementationOnce(() => {
        return {
          promise() {
            return Promise.resolve({Body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')});
          }
        };
      });
      // Act
      const imageHandler = new ImageHandler(s3, rekognition);
      const result = await imageHandler.applyEdits(image, edits);
      // Assert
      expect(mockAws.getObject).toHaveBeenCalledWith({Bucket: 'aaa', Key: 'bbb'});
      expect(result.options.input.buffer).toEqual(originalImage);
    });
  });
  describe('007/smartCrop', () => {
    it('Should pass if an edit with the smartCrop keyname is passed to the function', async () => {
      // Arrange
      const originalImage = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
      const image = sharp(originalImage, {failOnError: false}).withMetadata();
      const buffer = await image.toBuffer();
      const edits = {
        smartCrop: {
          faceIndex: 0,
          padding: 0
        }
      };
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
      expect(mockAws.detectFaces).toHaveBeenCalledWith({Image: {Bytes: buffer}});
      expect(result.options.input).not.toEqual(originalImage);
    });
  });
  describe('008/smartCrop/paddingOutOfBoundsError', () => {
    it('Should pass if an excessive padding value is passed to the smartCrop filter', async () => {
      // Arrange
      const originalImage = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
      const image = sharp(originalImage, {failOnError: false}).withMetadata();
      const buffer = await image.toBuffer();
      const edits = {
        smartCrop: {
          faceIndex: 0,
          padding: 80
        }
      };
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
        expect(mockAws.detectFaces).toHaveBeenCalledWith({Image: {Bytes: buffer}});
        expect(error).toEqual({
          status: 400,
          code: 'SmartCrop::PaddingOutOfBounds',
          message: 'The padding value you provided exceeds the boundaries of the original image. Please try choosing a smaller value or applying padding via Sharp for greater specificity.'
        });
      }
    });
  });
  describe('009/smartCrop/boundingBoxError', () => {
    it('Should pass if an excessive faceIndex value is passed to the smartCrop filter', async () => {
      // Arrange
      const originalImage = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
      const image = sharp(originalImage, {failOnError: false}).withMetadata();
      const buffer = await image.toBuffer();
      const edits = {
        smartCrop: {
          faceIndex: 10,
          padding: 0
        }
      };
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
        expect(mockAws.detectFaces).toHaveBeenCalledWith({Image: {Bytes: buffer}});
        expect(error).toEqual({
          status: 400,
          code: 'SmartCrop::FaceIndexOutOfRange',
          message: 'You have provided a FaceIndex value that exceeds the length of the zero-based detectedFaces array. Please specify a value that is in-range.'
        });
      }
    });
  });
  describe('010/smartCrop/faceIndexUndefined', () => {
    it('Should pass if a faceIndex value of undefined is passed to the smartCrop filter', async () => {
      // Arrange
      const originalImage = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
      const image = sharp(originalImage, {failOnError: false}).withMetadata();
      const buffer = await image.toBuffer();
      const edits = {
        smartCrop: true
      };
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
      expect(mockAws.detectFaces).toHaveBeenCalledWith({Image: {Bytes: buffer}});
      expect(result.options.input).not.toEqual(originalImage);
    });
  });
  describe('011/resizeStringTypeNumber', () => {
    it('Should pass if resize width and height are provided as string number to the function', async () => {
      // Arrange
      const originalImage = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
      const image = sharp(originalImage, {failOnError: false}).withMetadata();
      const edits = {
        resize: {
          width: '99.1',
          height: '99.9'
        }
      };
      // Act
      const imageHandler = new ImageHandler(s3, rekognition);
      const result = await imageHandler.applyEdits(image, edits);
      // Assert
      const resultBuffer = await result.toBuffer();
      const convertedImage = await sharp(originalImage, {failOnError: false}).withMetadata().resize({
        width: 99,
        height: 100
      }).toBuffer();
      expect(resultBuffer).toEqual(convertedImage);
    });
  });
  describe('012/roundCrop/noOptions', () => {
    it('Should pass if roundCrop keyName is passed with no additional options', async () => {
      // Arrange
      const originalImage = Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAAEAAQDAREAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACv/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AfwD/2Q==', 'base64');
      const image = sharp(originalImage, {failOnError: false}).withMetadata();
      const metadata = image.metadata();

      const edits = {
        roundCrop: true
      };

      // Act
      const imageHandler = new ImageHandler(s3, rekognition);
      const result = await imageHandler.applyEdits(image, edits);

      // Assert
      const expectedResult = {width: metadata.width / 2, height: metadata.height / 2};
      expect(mockAws.getObject).toHaveBeenCalledWith({Bucket: 'aaa', Key: 'bbb'});
      expect(result.options.input).not.toEqual(expectedResult);
    });
  });
  describe('013/roundCrop/withOptions', () => {
    it('Should pass if roundCrop keyName is passed with additional options', async () => {
      // Arrange
      const originalImage = Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAAEAAQDAREAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACv/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AfwD/2Q==', 'base64');
      const image = sharp(originalImage, {failOnError: false}).withMetadata();
      const metadata = image.metadata();

      const edits = {
        roundCrop: {
          top: 100,
          left: 100,
          rx: 100,
          ry: 100
        }

      };

      // Act
      const imageHandler = new ImageHandler(s3, rekognition);
      const result = await imageHandler.applyEdits(image, edits);

      // Assert
      const expectedResult = {width: metadata.width / 2, height: metadata.height / 2};
      expect(mockAws.getObject).toHaveBeenCalledWith({Bucket: 'aaa', Key: 'bbb'});
      expect(result.options.input).not.toEqual(expectedResult);
    });
  });
});

// ----------------------------------------------------------------------------
// [async] getOverlayImage()
// ----------------------------------------------------------------------------
describe('getOverlayImage()', () => {
  describe('001/validParameters', () => {
    it('Should pass if the proper bucket name and key are supplied, simulating an image file that can be retrieved', async () => {
      // Mock
      mockAws.getObject.mockImplementationOnce(() => {
        return {
          promise() {
            return Promise.resolve({Body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')});
          }
        };
      });
      // Act
      const imageHandler = new ImageHandler(s3, rekognition);
      const metadata = await sharp(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')).metadata();
      const result = await imageHandler.getOverlayImage('validBucket', 'validKey', '100', '100', '20', metadata);
      // Assert
      expect(mockAws.getObject).toHaveBeenCalledWith({Bucket: 'validBucket', Key: 'validKey'});
      expect(result).toEqual(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACXBIWXMAAAsTAAALEwEAmpwYAAAADUlEQVR4nGP4z8CQCgAEZgFltQhIfQAAAABJRU5ErkJggg==', 'base64'));
    });
  });
  describe('002/imageDoesNotExist', () => {
    it('Should throw an error if an invalid bucket or key name is provided, simulating a non-existant overlay image', async () => {
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
        expect(mockAws.getObject).toHaveBeenCalledWith({Bucket: 'invalidBucket', Key: 'invalidKey'});
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
describe('getCropArea()', () => {
  describe('001/validParameters', () => {
    it('Should pass if the crop area can be calculated using a series of valid inputs/parameters', () => {
      // Arrange
      const boundingBox = {
        Height: 0.18,
        Left: 0.55,
        Top: 0.33,
        Width: 0.23
      };
      const options = {padding: 20};
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
describe('getBoundingBox()', () => {
  describe('001/validParameters', () => {
    it('Should pass if the proper parameters are passed to the function', async () => {
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
      expect(mockAws.detectFaces).toHaveBeenCalledWith({Image: {Bytes: currentImage}});
      expect(result).toEqual(expectedResult);
    });
  });
  describe('002/errorHandling', () => {
    it('Should simulate an error condition returned by Rekognition', async () => {
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
        expect(mockAws.detectFaces).toHaveBeenCalledWith({Image: {Bytes: currentImage}});
        expect(error).toEqual({
          status: 500,
          code: 'InternalServerError',
          message: 'SimulatedError'
        });
      }
    });
  });
  describe('003/noDetectedFaces', () => {
    it('Should pass if no faces are detected', async () => {
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
      expect(mockAws.detectFaces).toHaveBeenCalledWith({Image: {Bytes: currentImage}});
      expect(result).toEqual(expectedResult);
    });
  });
  describe('004/boundsGreaterThanImageDimensions', () => {
    it('Should pass if bounds detected go beyond the image dimensions', async () => {
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
      expect(mockAws.detectFaces).toHaveBeenCalledWith({Image: {Bytes: currentImage}});
      expect(result).toEqual(expectedResult);
    });
  });
});