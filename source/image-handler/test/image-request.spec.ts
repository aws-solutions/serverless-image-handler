// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { mockAwsS3, mockAwsSecretManager, mockAxios } from './mock';

import fs from 'fs';
import path from 'path';
import SecretsManager from 'aws-sdk/clients/secretsmanager';
import S3 from 'aws-sdk/clients/s3';

import { ImageRequest } from '../image-request';
import { ImageHandlerError, RequestTypes, StatusCodes } from '../lib';
import { SecretProvider } from '../secret-provider';

describe('parseImageEdits()', () => {
  const s3Client = new S3();
  const secretsManager = new SecretsManager();
  const secretProvider = new SecretProvider(secretsManager);
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env = { ...OLD_ENV };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  describe('001/defaultRequestType', () => {
    it('Should pass if the proper result is returned for a sample base64-encoded image request', () => {
      // Arrange
      const event = { path: '/eyJlZGl0cyI6eyJncmF5c2NhbGUiOiJ0cnVlIiwicm90YXRlIjo5MCwiZmxpcCI6InRydWUifX0=' };

      // Act
      const imageRequest = new ImageRequest(s3Client, secretProvider);
      const result = imageRequest.parseImageEdits(event, RequestTypes.DEFAULT);

      // Assert
      const expectedResult = {
        grayscale: 'true',
        rotate: 90,
        flip: 'true'
      };
      expect(result).toEqual(expectedResult);
    });
  });

  describe('002/thumborRequestType', () => {
    it('Should pass if the proper result is returned for a sample thumbor-type image request', () => {
      // Arrange
      const event = { path: '/filters:rotate(90)/filters:grayscale()/thumbor-image.jpg' };

      // Act
      const imageRequest = new ImageRequest(s3Client, secretProvider);
      const result = imageRequest.parseImageEdits(event, RequestTypes.THUMBOR);

      // Assert
      const expectedResult = {
        rotate: 90,
        grayscale: true
      };
      expect(result).toEqual(expectedResult);
    });
  });

  describe('003/customRequestType', () => {
    it('Should pass if the proper result is returned for a sample custom-type image request', () => {
      // Arrange
      const event = { path: '/filters-rotate(90)/filters-grayscale()/thumbor-image.jpg' };

      process.env = {
        REWRITE_MATCH_PATTERN: '/(filters-)/gm',
        REWRITE_SUBSTITUTION: 'filters:'
      };

      // Act
      const imageRequest = new ImageRequest(s3Client, secretProvider);
      const result = imageRequest.parseImageEdits(event, RequestTypes.CUSTOM);

      // Assert
      const expectedResult = {
        rotate: 90,
        grayscale: true
      };
      expect(result).toEqual(expectedResult);
    });
  });

  describe('004/customRequestType', () => {
    it('Should throw an error if a requestType is not specified and/or the image edits cannot be parsed', () => {
      // Arrange
      const event = { path: '/filters:rotate(90)/filters:grayscale()/other-image.jpg' };

      // Act
      const imageRequest = new ImageRequest(s3Client, secretProvider);

      // Assert
      try {
        imageRequest.parseImageEdits(event, undefined);
      } catch (error) {
        expect(error).toMatchObject({
          status: StatusCodes.BAD_REQUEST,
          code: 'ImageEdits::CannotParseEdits',
          message: 'The edits you provided could not be parsed. Please check the syntax of your request and refer to the documentation for additional guidance.'
        });
      }
    });
  });
});

describe('parseImageKey()', () => {
  const s3Client = new S3();
  const secretsManager = new SecretsManager();
  const secretProvider = new SecretProvider(secretsManager);
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env = { ...OLD_ENV };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  describe('001/defaultRequestType', () => {
    it('Should pass if an image key value is provided in the default request format', () => {
      // Arrange
      const event = { path: '/eyJidWNrZXQiOiJteS1zYW1wbGUtYnVja2V0Iiwia2V5Ijoic2FtcGxlLWltYWdlLTAwMS5qcGcifQ==' };

      // Act
      const imageRequest = new ImageRequest(s3Client, secretProvider);
      const result = imageRequest.parseImageKey(event, RequestTypes.DEFAULT);

      // Assert
      const expectedResult = 'sample-image-001.jpg';
      expect(result).toEqual(expectedResult);
    });
  });

  describe('002/defaultRequestType/withSlashRequest', () => {
    it('should read image requests with base64 encoding having slash', () => {
      const event = {
        path: '/eyJidWNrZXQiOiJlbGFzdGljYmVhbnN0YWxrLXVzLWVhc3QtMi0wNjY3ODQ4ODU1MTgiLCJrZXkiOiJlbnYtcHJvZC9nY2MvbGFuZGluZ3BhZ2UvMV81N19TbGltTl9MaWZ0LUNvcnNldC1Gb3ItTWVuLVNOQVAvYXR0YWNobWVudHMvZmZjMWYxNjAtYmQzOC00MWU4LThiYWQtZTNhMTljYzYxZGQzX1/Ys9mE2YrZhSDZhNmK2YHYqiAoMikuanBnIiwiZWRpdHMiOnsicmVzaXplIjp7IndpZHRoIjo0ODAsImZpdCI6ImNvdmVyIn19fQ=='
      };

      // Act
      const imageRequest = new ImageRequest(s3Client, secretProvider);
      const result = imageRequest.parseImageKey(event, RequestTypes.DEFAULT);

      // Assert
      const expectedResult = 'env-prod/gcc/landingpage/1_57_SlimN_Lift-Corset-For-Men-SNAP/attachments/ffc1f160-bd38-41e8-8bad-e3a19cc61dd3__سليم ليفت (2).jpg';
      expect(result).toEqual(expectedResult);
    });
  });

  describe('003/thumborRequestType', () => {
    it('Should pass if an image key value is provided in the thumbor request format', () => {
      // Arrange
      const event = { path: '/filters:rotate(90)/filters:grayscale()/thumbor-image.jpg' };

      // Act
      const imageRequest = new ImageRequest(s3Client, secretProvider);
      const result = imageRequest.parseImageKey(event, RequestTypes.THUMBOR);

      // Assert
      const expectedResult = 'thumbor-image.jpg';
      expect(result).toEqual(expectedResult);
    });
  });

  describe('004/thumborRequestType/withParenthesesRequest', () => {
    it('Should pass if an image key value is provided in the thumbor request format having open, close parentheses', () => {
      // Arrange
      const event = { path: '/filters:rotate(90)/filters:grayscale()/thumbor-image (1).jpg' };

      // Act
      const imageRequest = new ImageRequest(s3Client, secretProvider);
      const result = imageRequest.parseImageKey(event, RequestTypes.THUMBOR);

      // Assert
      const expectedResult = 'thumbor-image (1).jpg';
      expect(result).toEqual(expectedResult);
    });

    it('Should pass if an image key value is provided in the thumbor request format having open parentheses', () => {
      // Arrange
      const event = { path: '/filters:rotate(90)/filters:grayscale()/thumbor-image (1.jpg' };

      // Act
      const imageRequest = new ImageRequest(s3Client, secretProvider);
      const result = imageRequest.parseImageKey(event, RequestTypes.THUMBOR);

      // Assert
      const expectedResult = 'thumbor-image (1.jpg';
      expect(result).toEqual(expectedResult);
    });

    it('Should pass if an image key value is provided in the thumbor request format having close parentheses', () => {
      // Arrange
      const event = { path: '/filters:rotate(90)/filters:grayscale()/thumbor-image 1).jpg' };

      // Act
      const imageRequest = new ImageRequest(s3Client, secretProvider);
      const result = imageRequest.parseImageKey(event, RequestTypes.THUMBOR);

      // Assert
      const expectedResult = 'thumbor-image 1).jpg';
      expect(result).toEqual(expectedResult);
    });

    it('Should pass if an image key value is provided in the thumbor request format having close parentheses in the middle of the name', () => {
      // Arrange
      const event = { path: '/filters:rotate(90)/filters:grayscale()/thumbor-image (1) suffix.jpg' };

      // Act
      const imageRequest = new ImageRequest(s3Client, secretProvider);
      const result = imageRequest.parseImageKey(event, RequestTypes.THUMBOR);

      // Assert
      const expectedResult = 'thumbor-image (1) suffix.jpg';
      expect(result).toEqual(expectedResult);
    });

    it('Should pass if an image key value is provided in the thumbor request and the path has crop filter', () => {
      // Arrange
      const event = { path: '/10x10:100x100/filters:rotate(90)/filters:grayscale()/thumbor-image (1) suffix.jpg' };

      // Act
      const imageRequest = new ImageRequest(s3Client, secretProvider);
      const result = imageRequest.parseImageKey(event, RequestTypes.THUMBOR);

      // Assert
      const expectedResult = 'thumbor-image (1) suffix.jpg';
      expect(result).toEqual(expectedResult);
    });

    it('Should pass if an image key value is provided in the thumbor request and the path has resize filter', () => {
      // Arrange
      const event = { path: '/10x10/filters:rotate(90)/filters:grayscale()/thumbor-image (1) suffix.jpg' };

      // Act
      const imageRequest = new ImageRequest(s3Client, secretProvider);
      const result = imageRequest.parseImageKey(event, RequestTypes.THUMBOR);

      // Assert
      const expectedResult = 'thumbor-image (1) suffix.jpg';
      expect(result).toEqual(expectedResult);
    });

    it('Should pass if an image key value is provided in the thumbor request and the path has crop and resize filters', () => {
      // Arrange
      const event = { path: '/10x20:100x200/10x10/filters:rotate(90)/filters:grayscale()/thumbor-image (1) suffix.jpg' };

      // Act
      const imageRequest = new ImageRequest(s3Client, secretProvider);
      const result = imageRequest.parseImageKey(event, RequestTypes.THUMBOR);

      // Assert
      const expectedResult = 'thumbor-image (1) suffix.jpg';
      expect(result).toEqual(expectedResult);
    });

    it('Should pass if an image key value is provided in the thumbor request and the key string has substring "fit-in"', () => {
      // Arrange
      const event = { path: '/fit-in/400x0/filters:fill(ffffff)/fit-in-thumbor-image (1) suffix.jpg' };

      // Act
      const imageRequest = new ImageRequest(s3Client, secretProvider);
      const result = imageRequest.parseImageKey(event, RequestTypes.THUMBOR);

      // Assert
      const expectedResult = 'fit-in-thumbor-image (1) suffix.jpg';
      expect(result).toEqual(expectedResult);
    });

    it('Should pass if the image in the sub-directory', () => {
      // Arrange
      const event = { path: '/100x100/test-100x100/test/beach-100x100.jpg' };

      // Act
      const imageRequest = new ImageRequest(s3Client, secretProvider);
      const result = imageRequest.parseImageKey(event, RequestTypes.THUMBOR);

      // Assert
      const expectedResult = 'test-100x100/test/beach-100x100.jpg';
      expect(result).toEqual(expectedResult);
    });
  });

  describe('005/customRequestType', () => {
    it('Should pass if an image key value is provided in the custom request format', () => {
      // Arrange
      const event = { path: '/filters-rotate(90)/filters-grayscale()/custom-image.jpg' };

      process.env = {
        REWRITE_MATCH_PATTERN: '/(filters-)/gm',
        REWRITE_SUBSTITUTION: 'filters:'
      };

      // Act
      const imageRequest = new ImageRequest(s3Client, secretProvider);
      const result = imageRequest.parseImageKey(event, RequestTypes.CUSTOM);

      // Assert
      const expectedResult = 'custom-image.jpg';
      expect(result).toEqual(expectedResult);
    });
  });

  describe('006/customRequestStringType', () => {
    it('Should pass if an image key value is provided in the custom request format', () => {
      // Arrange
      const event = { path: '/filters-rotate(90)/filters-grayscale()/custom-image.jpg' };

      process.env = {
        REWRITE_MATCH_PATTERN: '/(filters-)/gm',
        REWRITE_SUBSTITUTION: 'filters:'
      };

      // Act
      const imageRequest = new ImageRequest(s3Client, secretProvider);
      const result = imageRequest.parseImageKey(event, RequestTypes.CUSTOM);

      // Assert
      const expectedResult = 'custom-image.jpg';
      expect(result).toEqual(expectedResult);
    });
  });

  describe('007/elseCondition', () => {
    it('Should throw an error if an unrecognized requestType is passed into the function as a parameter', () => {
      // Arrange
      const event = { path: '/filters:rotate(90)/filters:grayscale()/other-image.jpg' };

      // Act
      const imageRequest = new ImageRequest(s3Client, secretProvider);

      // Assert
      try {
        imageRequest.parseImageKey(event, undefined);
      } catch (error) {
        expect(error).toMatchObject({
          status: StatusCodes.NOT_FOUND,
          code: 'ImageEdits::CannotFindImage',
          message: 'The image you specified could not be found. Please check your request syntax as well as the bucket you specified to ensure it exists.'
        });
      }
    });
  });
});

describe('parseRequestType()', () => {
  const s3Client = new S3();
  const secretsManager = new SecretsManager();
  const secretProvider = new SecretProvider(secretsManager);
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env = { ...OLD_ENV };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  describe('001/defaultRequestType', () => {
    it('Should pass if the method detects a default request', () => {
      // Arrange
      const event = { path: '/eyJidWNrZXQiOiJteS1zYW1wbGUtYnVja2V0Iiwia2V5IjoibXktc2FtcGxlLWtleSIsImVkaXRzIjp7ImdyYXlzY2FsZSI6dHJ1ZX19' };
      process.env = {};

      // Act
      const imageRequest = new ImageRequest(s3Client, secretProvider);
      const result = imageRequest.parseRequestType(event);

      // Assert
      const expectedResult = RequestTypes.DEFAULT;
      expect(result).toEqual(expectedResult);
    });
  });

  describe('002/thumborRequestType', () => {
    it('Should pass if the method detects a thumbor request', () => {
      // Arrange
      const event = {
        path: '/unsafe/filters:brightness(10):contrast(30)/https://upload.wikimedia.org/wikipedia/commons/thumb/7/79/Coffee_berries_1.jpg/1200px-Coffee_berries_1.jpg'
      };
      process.env = {};

      // Act
      const imageRequest = new ImageRequest(s3Client, secretProvider);
      const result = imageRequest.parseRequestType(event);

      // Assert
      const expectedResult = RequestTypes.THUMBOR;
      expect(result).toEqual(expectedResult);
    });
  });

  describe('003/customRequestType', () => {
    it('Should pass if the method detects a custom request', () => {
      // Arrange
      const event = { path: '/additionalImageRequestParameters/image.jpg' };
      process.env = {
        REWRITE_MATCH_PATTERN: 'matchPattern',
        REWRITE_SUBSTITUTION: 'substitutionString'
      };

      // Act
      const imageRequest = new ImageRequest(s3Client, secretProvider);
      const result = imageRequest.parseRequestType(event);

      // Assert
      const expectedResult = RequestTypes.CUSTOM;
      expect(result).toEqual(expectedResult);
    });
  });

  describe('004/elseCondition', () => {
    it('Should throw an error if the method cannot determine the request type based on the three groups given', () => {
      // Arrange
      const event = { path: '12x12e24d234r2ewxsad123d34r.bmp' };

      process.env = {};

      // Act
      const imageRequest = new ImageRequest(s3Client, secretProvider);

      // Assert
      try {
        imageRequest.parseRequestType(event);
      } catch (error) {
        expect(error).toMatchObject({
          status: StatusCodes.BAD_REQUEST,
          code: 'RequestTypeError',
          message:
            'The type of request you are making could not be processed. Please ensure that your original image is of a supported file type (jpg, png, tiff, webp, svg) and that your image request is provided in the correct syntax. Refer to the documentation for additional guidance on forming image requests.'
        });
      }
    });
  });
});

describe('parseImageHeaders()', () => {
  const s3Client = new S3();
  const secretsManager = new SecretsManager();
  const secretProvider = new SecretProvider(secretsManager);

  it('001/Should return headers if headers are provided for a sample base64-encoded image request', () => {
    // Arrange
    const event = {
      path: '/eyJidWNrZXQiOiJ2YWxpZEJ1Y2tldCIsImtleSI6InZhbGlkS2V5IiwiaGVhZGVycyI6eyJDYWNoZS1Db250cm9sIjoibWF4LWFnZT0zMTUzNjAwMCxwdWJsaWMifSwib3V0cHV0Rm9ybWF0IjoianBlZyJ9'
    };

    // Act
    const imageRequest = new ImageRequest(s3Client, secretProvider);
    const result = imageRequest.parseImageHeaders(event, RequestTypes.DEFAULT);

    // Assert
    const expectedResult = {
      'Cache-Control': 'max-age=31536000,public'
    };
    expect(result).toEqual(expectedResult);
  });

  it('001/Should return undefined if headers are not provided for a base64-encoded image request', () => {
    // Arrange
    const event = { path: '/eyJidWNrZXQiOiJ2YWxpZEJ1Y2tldCIsImtleSI6InZhbGlkS2V5In0=' };

    // Act
    const imageRequest = new ImageRequest(s3Client, secretProvider);
    const result = imageRequest.parseImageHeaders(event, RequestTypes.DEFAULT);

    // Assert
    expect(result).toEqual(undefined);
  });

  it('001/Should return undefined for Thumbor or Custom requests', () => {
    // Arrange
    const event = { path: '/test.jpg' };

    // Act
    const imageRequest = new ImageRequest(s3Client, secretProvider);
    const result = imageRequest.parseImageHeaders(event, RequestTypes.THUMBOR);

    // Assert
    expect(result).toEqual(undefined);
  });
});

describe('decodeRequest()', () => {
  const s3Client = new S3();
  const secretsManager = new SecretsManager();
  const secretProvider = new SecretProvider(secretsManager);

  describe('001/validRequestPathSpecified', () => {
    it('Should pass if a valid base64-encoded path has been specified', () => {
      // Arrange
      const event = { path: '/eyJidWNrZXQiOiJidWNrZXQtbmFtZS1oZXJlIiwia2V5Ijoia2V5LW5hbWUtaGVyZSJ9' };

      // Act
      const imageRequest = new ImageRequest(s3Client, secretProvider);
      const result = imageRequest.decodeRequest(event);

      // Assert
      const expectedResult = {
        bucket: 'bucket-name-here',
        key: 'key-name-here'
      };
      expect(result).toEqual(expectedResult);
    });
  });

  describe('002/invalidRequestPathSpecified', () => {
    it('Should throw an error if a valid base64-encoded path has not been specified', () => {
      // Arrange
      const event = { path: '/someNonBase64EncodedContentHere' };

      // Act
      const imageRequest = new ImageRequest(s3Client, secretProvider);

      // Assert
      try {
        imageRequest.decodeRequest(event);
      } catch (error) {
        expect(error).toMatchObject({
          status: StatusCodes.BAD_REQUEST,
          code: 'DecodeRequest::CannotDecodeRequest',
          message:
            'The image request you provided could not be decoded. Please check that your request is base64 encoded properly and refer to the documentation for additional guidance.'
        });
      }
    });
  });

  describe('003/noPathSpecified', () => {
    it('Should throw an error if no path is specified at all', () => {
      // Arrange
      const event = {};

      // Act
      const imageRequest = new ImageRequest(s3Client, secretProvider);

      // Assert
      try {
        imageRequest.decodeRequest(event);
      } catch (error) {
        expect(error).toMatchObject({
          status: StatusCodes.BAD_REQUEST,
          code: 'DecodeRequest::CannotReadPath',
          message: 'The URL path you provided could not be read. Please ensure that it is properly formed according to the solution documentation.'
        });
      }
    });
  });
});

describe('getOutputFormat()', () => {
  const s3Client = new S3();
  const secretsManager = new SecretsManager();
  const secretProvider = new SecretProvider(secretsManager);
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env = { ...OLD_ENV };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  describe('001/AcceptsHeaderIncludesWebP', () => {
    it('Should pass if it returns "webp" for an accepts header which includes webp', () => {
      // Arrange
      const event = {
        headers: {
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3'
        }
      };
      process.env.AUTO_WEBP = 'Yes';

      // Act
      const imageRequest = new ImageRequest(s3Client, secretProvider);
      const result = imageRequest.getOutputFormat(event);

      // Assert
      expect(result).toEqual('webp');
    });
  });

  describe('002/AcceptsHeaderDoesNotIncludeWebP', () => {
    it('Should pass if it returns null for an accepts header which does not include webp', () => {
      // Arrange
      const event = {
        headers: {
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/apng,*/*;q=0.8,application/signed-exchange;v=b3'
        }
      };
      process.env.AUTO_WEBP = 'Yes';

      // Act
      const imageRequest = new ImageRequest(s3Client, secretProvider);
      const result = imageRequest.getOutputFormat(event);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('003/AutoWebPDisabled', () => {
    it('Should pass if it returns null when AUTO_WEBP is disabled with accepts header including webp', () => {
      // Arrange
      const event = {
        headers: {
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3'
        }
      };
      process.env.AUTO_WEBP = 'No';

      // Act
      const imageRequest = new ImageRequest(s3Client, secretProvider);
      const result = imageRequest.getOutputFormat(event);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('004/AutoWebPUnset', () => {
    it('Should pass if it returns null when AUTO_WEBP is not set with accepts header including webp', () => {
      // Arrange
      const event = {
        headers: {
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3'
        }
      };

      // Act
      const imageRequest = new ImageRequest(s3Client, secretProvider);
      const result = imageRequest.getOutputFormat(event);

      // Assert
      expect(result).toBeNull();
    });
  });
});

describe('inferImageType()', () => {
  const s3Client = new S3();
  const secretsManager = new SecretsManager();
  const secretProvider = new SecretProvider(secretsManager);

  describe('001/shouldInferImageType', () => {
    it('Should pass if it returns "image/jpeg"', () => {
      // Arrange
      const imageBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xee, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);

      // Act
      const imageRequest = new ImageRequest(s3Client, secretProvider);
      const result = imageRequest.inferImageType(imageBuffer);

      // Assert
      expect(result).toEqual('image/jpeg');
    });
  });

  describe('002/shouldNotInferImageType', () => {
    it('Should pass throw an exception', () => {
      // Arrange
      const imageBuffer = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);

      try {
        // Act
        const imageRequest = new ImageRequest(s3Client, secretProvider);
        imageRequest.inferImageType(imageBuffer);
      } catch (error) {
        // Assert
        expect(error.status).toEqual(500);
        expect(error.code).toEqual('RequestTypeError');
        expect(error.message).toEqual(
          'The file does not have an extension and the file type could not be inferred. Please ensure that your original image is of a supported file type (jpg, png, tiff, webp, svg). Refer to the documentation for additional guidance on forming image requests.'
        );
      }
    });
  });
});
