// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import fs from "fs";
import {GetObjectCommand, S3, S3Client} from "@aws-sdk/client-s3";
import {ImageHandler} from "../src/image-handler";
import sharp from "sharp";
import { beforeEach, describe, it } from 'vitest'
import {mockClient} from "aws-sdk-client-mock";
import {Readable} from "stream";
import {sdkStreamMixin} from "@aws-sdk/util-stream-node";

const {expect} = require("expect");
(globalThis as any).expect = expect;
require("aws-sdk-client-mock-jest");

function generateStream(data: string) {
  const stream = Readable.from(Buffer.from(data, "base64"))
  return sdkStreamMixin(stream)
}

const s3_mock = mockClient(S3Client);
const s3 = new S3();

beforeEach(() => {
    s3_mock.reset();
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
      const imageHandler = new ImageHandler(s3);
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
      s3_mock.on(GetObjectCommand).resolves({ Body: generateStream('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==') })
      // Act
      const imageHandler = new ImageHandler(s3);
      const result = await imageHandler.applyEdits(image, edits);
      // Assert
      expect(s3_mock).toHaveReceivedCommandWith(GetObjectCommand, {Bucket: 'aaa', Key: 'bbb'});
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
     s3_mock.on(GetObjectCommand).resolves({ Body: generateStream('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==') })
      // Act
      const imageHandler = new ImageHandler(s3);
      const result = await imageHandler.applyEdits(image, edits);
      // Assert
      expect(s3_mock).toHaveReceivedCommandWith(GetObjectCommand, {Bucket: 'aaa', Key: 'bbb'});
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
     s3_mock.on(GetObjectCommand).resolves({ Body: generateStream('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==') })
      // Act
      const imageHandler = new ImageHandler(s3);
      const result = await imageHandler.applyEdits(image, edits);
      // Assert
      expect(s3_mock).toHaveReceivedCommandWith(GetObjectCommand, {Bucket: 'aaa', Key: 'bbb'});
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
     s3_mock.on(GetObjectCommand).resolves({ Body: generateStream('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==') })
      // Act
      const imageHandler = new ImageHandler(s3);
      const result = await imageHandler.applyEdits(image, edits);
      // Assert
      expect(s3_mock).toHaveReceivedCommandWith(GetObjectCommand, {Bucket: 'aaa', Key: 'bbb'});
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
     s3_mock.on(GetObjectCommand).resolves({ Body: generateStream('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==') })
      // Act
      const imageHandler = new ImageHandler(s3);
      const result = await imageHandler.applyEdits(image, edits);
      // Assert
      expect(s3_mock).toHaveReceivedCommandWith(GetObjectCommand, {Bucket: 'aaa', Key: 'bbb'});
      expect(result.options.input.buffer).toEqual(originalImage);
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
      const imageHandler = new ImageHandler(s3);
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
      const metadata = await image.metadata();

      const edits = {
        roundCrop: true
      };

      // Act
      const imageHandler = new ImageHandler(s3);
      const result = await imageHandler.applyEdits(image, edits);

      // Assert
      const expectedResult = {width: metadata.width! / 2, height: metadata.height! / 2};
      expect(result.options.input).not.toEqual(expectedResult);
    });
  });
  describe('013/roundCrop/withOptions', () => {
    it('Should pass if roundCrop keyName is passed with additional options', async () => {
      // Arrange
      const originalImage = Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAAEAAQDAREAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACv/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AfwD/2Q==', 'base64');
      const image = sharp(originalImage, {failOnError: false}).withMetadata();
      const metadata = await image.metadata();

      const edits = {
        roundCrop: {
          top: 100,
          left: 100,
          rx: 100,
          ry: 100
        }

      };
      // Act
      const imageHandler = new ImageHandler(s3);
      const result = await imageHandler.applyEdits(image, edits);

      // Assert
      const expectedResult = {width: metadata.width! / 2, height: metadata.height! / 2};
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
     s3_mock.on(GetObjectCommand).resolves({ Body: generateStream('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==') })
      // Act
      const imageHandler = new ImageHandler(s3);
      const metadata = await sharp(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')).metadata();
      const result = await imageHandler.getOverlayImage('validBucket', 'validKey', '100', '100', '20', metadata);
      // Assert
      expect(s3_mock).toHaveReceivedCommandWith(GetObjectCommand, {Bucket: 'validBucket', Key: 'validKey'});
      expect(result).toEqual(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACXBIWXMAAAsTAAALEwEAmpwYAAAADUlEQVR4nGP4z8CQCgAEZgFltQhIfQAAAABJRU5ErkJggg==', 'base64'));
    });
  });
  describe('002/imageDoesNotExist', () => {
    it('Should throw an error if an invalid bucket or key name is provided, simulating a non-existant overlay image', async () => {
      // Mock
      s3_mock.on(GetObjectCommand).callsFake(() => Promise.reject({
        code: 'InternalServerError',
        message: 'SimulatedInvalidParameterException'
      }))
      // Act
      const imageHandler = new ImageHandler(s3);
      const metadata = await sharp(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')).metadata();
      await imageHandler.getOverlayImage('invalidBucket', 'invalidKey', '100', '100', '20', metadata).catch(err => {
          expect(s3_mock).toHaveReceivedCommandWith(GetObjectCommand, {Bucket: 'invalidBucket', Key: 'invalidKey'});

          expect(err).toEqual({status: 500, code: 'InternalServerError', message: 'SimulatedInvalidParameterException'})})

    });
  });
});
