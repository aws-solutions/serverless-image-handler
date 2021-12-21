// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { mockAwsS3, mockAwsSecretManager } from './mock';

import SecretsManager from 'aws-sdk/clients/secretsmanager';
import S3 from 'aws-sdk/clients/s3';

import { ImageRequest } from '../image-request';
import { ImageHandlerError, RequestTypes, StatusCodes } from '../lib';
import { SecretProvider } from '../secret-provider';

describe('setup()', () => {
  const s3Client = new S3();
  const secretsManager = new SecretsManager();
  let secretProvider = new SecretProvider(secretsManager);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
    secretProvider = new SecretProvider(secretsManager); // need to re-create the provider to make sure the secret is not cached
  });

  describe('001/defaultImageRequest', () => {
    const OLD_ENV = process.env;

    beforeEach(() => {
      jest.resetAllMocks();
      process.env = { ...OLD_ENV };
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    afterAll(() => {
      process.env = OLD_ENV;
    });

    it('Should pass when a default image request is provided and populate the ImageRequest object with the proper values', async () => {
      // Arrange
      const event = {
        path: '/eyJidWNrZXQiOiJ2YWxpZEJ1Y2tldCIsImtleSI6InZhbGlkS2V5IiwiZWRpdHMiOnsiZ3JheXNjYWxlIjp0cnVlfSwib3V0cHV0Rm9ybWF0IjoianBlZyJ9'
      };
      process.env.SOURCE_BUCKETS = 'validBucket, validBucket2';

      // Mock
      mockAwsS3.getObject.mockImplementationOnce(() => ({
        promise() {
          return Promise.resolve({ Body: Buffer.from('SampleImageContent\n') });
        }
      }));

      // Act
      const imageRequest = new ImageRequest(s3Client, secretProvider);
      const imageRequestInfo = await imageRequest.setup(event);
      const expectedResult = {
        requestType: 'Default',
        bucket: 'validBucket',
        key: 'validKey',
        edits: { grayscale: true },
        outputFormat: 'jpeg',
        originalImage: Buffer.from('SampleImageContent\n'),
        cacheControl: 'max-age=31536000,public',
        contentType: 'image/jpeg'
      };

      // Assert
      expect(mockAwsS3.getObject).toHaveBeenCalledWith({ Bucket: 'validBucket', Key: 'validKey' });
      expect(imageRequestInfo).toEqual(expectedResult);
    });
  });

  describe('002/defaultImageRequest/toFormat', () => {
    const OLD_ENV = process.env;

    beforeEach(() => {
      jest.resetAllMocks();
      process.env = { ...OLD_ENV };
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    afterAll(() => {
      process.env = OLD_ENV;
    });

    it('Should pass when a default image request is provided and populate the ImageRequest object with the proper values', async () => {
      // Arrange
      const event = {
        path: '/eyJidWNrZXQiOiJ2YWxpZEJ1Y2tldCIsImtleSI6InZhbGlkS2V5IiwiZWRpdHMiOnsidG9Gb3JtYXQiOiJwbmcifX0='
      };
      process.env.SOURCE_BUCKETS = 'validBucket, validBucket2';

      // Mock
      mockAwsS3.getObject.mockImplementationOnce(() => ({
        promise() {
          return Promise.resolve({ Body: Buffer.from('SampleImageContent\n') });
        }
      }));

      // Act
      const imageRequest = new ImageRequest(s3Client, secretProvider);
      const imageRequestInfo = await imageRequest.setup(event);
      const expectedResult = {
        requestType: 'Default',
        bucket: 'validBucket',
        key: 'validKey',
        edits: { toFormat: 'png' },
        outputFormat: 'png',
        originalImage: Buffer.from('SampleImageContent\n'),
        cacheControl: 'max-age=31536000,public',
        contentType: 'image/png'
      };
      // Assert
      expect(mockAwsS3.getObject).toHaveBeenCalledWith({ Bucket: 'validBucket', Key: 'validKey' });
      expect(imageRequestInfo).toEqual(expectedResult);
    });
  });

  describe('003/thumborImageRequest', () => {
    const OLD_ENV = process.env;

    beforeEach(() => {
      jest.resetAllMocks();
      process.env = { ...OLD_ENV };
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    afterAll(() => {
      process.env = OLD_ENV;
    });

    it('Should pass when a thumbor image request is provided and populate the ImageRequest object with the proper values', async () => {
      // Arrange
      const event = { path: '/filters:grayscale()/test-image-001.jpg' };
      process.env.SOURCE_BUCKETS = 'allowedBucket001, allowedBucket002';

      // Mock
      mockAwsS3.getObject.mockImplementationOnce(() => ({
        promise() {
          return Promise.resolve({ Body: Buffer.from('SampleImageContent\n') });
        }
      }));

      // Act
      const imageRequest = new ImageRequest(s3Client, secretProvider);
      const imageRequestInfo = await imageRequest.setup(event);
      const expectedResult = {
        requestType: 'Thumbor',
        bucket: 'allowedBucket001',
        key: 'test-image-001.jpg',
        edits: { grayscale: true },
        originalImage: Buffer.from('SampleImageContent\n'),
        cacheControl: 'max-age=31536000,public',
        contentType: 'image'
      };

      // Assert
      expect(mockAwsS3.getObject).toHaveBeenCalledWith({ Bucket: 'allowedBucket001', Key: 'test-image-001.jpg' });
      expect(imageRequestInfo).toEqual(expectedResult);
    });
  });

  describe('004/thumborImageRequest/quality', () => {
    const OLD_ENV = process.env;

    beforeEach(() => {
      jest.resetAllMocks();
      process.env = { ...OLD_ENV };
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    afterAll(() => {
      process.env = OLD_ENV;
    });

    it('Should pass when a thumbor image request is provided and populate the ImageRequest object with the proper values', async () => {
      // Arrange
      const event = { path: '/filters:format(png)/filters:quality(50)/test-image-001.jpg' };
      process.env.SOURCE_BUCKETS = 'allowedBucket001, allowedBucket002';

      // Mock
      mockAwsS3.getObject.mockImplementationOnce(() => ({
        promise() {
          return Promise.resolve({ Body: Buffer.from('SampleImageContent\n') });
        }
      }));

      // Act
      const imageRequest = new ImageRequest(s3Client, secretProvider);
      const imageRequestInfo = await imageRequest.setup(event);
      const expectedResult = {
        requestType: 'Thumbor',
        bucket: 'allowedBucket001',
        key: 'test-image-001.jpg',
        edits: {
          toFormat: 'png',
          png: { quality: 50 }
        },
        originalImage: Buffer.from('SampleImageContent\n'),
        cacheControl: 'max-age=31536000,public',
        outputFormat: 'png',
        contentType: 'image/png'
      };

      // Assert
      expect(mockAwsS3.getObject).toHaveBeenCalledWith({ Bucket: 'allowedBucket001', Key: 'test-image-001.jpg' });
      expect(imageRequestInfo).toEqual(expectedResult);
    });
  });

  describe('005/customImageRequest', () => {
    const OLD_ENV = process.env;

    beforeEach(() => {
      jest.resetAllMocks();
      process.env = { ...OLD_ENV };
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    afterAll(() => {
      process.env = OLD_ENV;
    });

    it('Should pass when a custom image request is provided and populate the ImageRequest object with the proper values', async () => {
      // Arrange
      const event = {
        path: '/filters-rotate(90)/filters-grayscale()/custom-image.jpg'
      };
      process.env = {
        SOURCE_BUCKETS: 'allowedBucket001, allowedBucket002',
        REWRITE_MATCH_PATTERN: '/(filters-)/gm',
        REWRITE_SUBSTITUTION: 'filters:'
      };

      // Mock
      mockAwsS3.getObject.mockImplementationOnce(() => ({
        promise() {
          return Promise.resolve({
            CacheControl: 'max-age=300,public',
            ContentType: 'custom-type',
            Expires: 'Tue, 24 Dec 2019 13:46:28 GMT',
            LastModified: 'Sat, 19 Dec 2009 16:30:47 GMT',
            Body: Buffer.from('SampleImageContent\n')
          });
        }
      }));

      // Act
      const imageRequest = new ImageRequest(s3Client, secretProvider);
      const imageRequestInfo = await imageRequest.setup(event);
      const expectedResult = {
        requestType: RequestTypes.CUSTOM,
        bucket: 'allowedBucket001',
        key: 'custom-image.jpg',
        edits: {
          grayscale: true,
          rotate: 90
        },
        originalImage: Buffer.from('SampleImageContent\n'),
        cacheControl: 'max-age=300,public',
        contentType: 'custom-type',
        expires: 'Tue, 24 Dec 2019 13:46:28 GMT',
        lastModified: 'Sat, 19 Dec 2009 16:30:47 GMT'
      };

      // Assert
      expect(mockAwsS3.getObject).toHaveBeenCalledWith({ Bucket: 'allowedBucket001', Key: 'custom-image.jpg' });
      expect(imageRequestInfo).toEqual(expectedResult);
    });

    it('Should pass when a custom image request is provided and populate the ImageRequest object with the proper values and no file extension', async () => {
      // Arrange
      const event = {
        path: '/filters-rotate(90)/filters-grayscale()/custom-image'
      };
      process.env = {
        SOURCE_BUCKETS: 'allowedBucket001, allowedBucket002',
        REWRITE_MATCH_PATTERN: '/(filters-)/gm',
        REWRITE_SUBSTITUTION: 'filters:'
      };

      // Mock
      mockAwsS3.getObject.mockImplementationOnce(() => ({
        promise() {
          return Promise.resolve({
            CacheControl: 'max-age=300,public',
            ContentType: 'custom-type',
            Expires: 'Tue, 24 Dec 2019 13:46:28 GMT',
            LastModified: 'Sat, 19 Dec 2009 16:30:47 GMT',
            Body: Buffer.from('SampleImageContent\n')
          });
        }
      }));

      // Act
      const imageRequest = new ImageRequest(s3Client, secretProvider);
      const imageRequestInfo = await imageRequest.setup(event);
      const expectedResult = {
        requestType: RequestTypes.CUSTOM,
        bucket: 'allowedBucket001',
        key: 'custom-image',
        edits: {
          grayscale: true,
          rotate: 90
        },
        originalImage: Buffer.from('SampleImageContent\n'),
        cacheControl: 'max-age=300,public',
        contentType: 'custom-type',
        expires: 'Tue, 24 Dec 2019 13:46:28 GMT',
        lastModified: 'Sat, 19 Dec 2009 16:30:47 GMT'
      };

      // Assert
      expect(mockAwsS3.getObject).toHaveBeenCalledWith({ Bucket: 'allowedBucket001', Key: 'custom-image' });
      expect(imageRequestInfo).toEqual(expectedResult);
    });
  });

  describe('006/errorCase', () => {
    const OLD_ENV = process.env;

    beforeEach(() => {
      jest.resetAllMocks();
      process.env = { ...OLD_ENV };
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    afterAll(() => {
      process.env = OLD_ENV;
    });

    it('Should pass when an error is caught', async () => {
      // Arrange
      const event = {
        path: '/eyJidWNrZXQiOiJ2YWxpZEJ1Y2tldCIsImtleSI6InZhbGlkS2V5IiwiZWRpdHMiOnsiZ3JheXNjYWxlIjp0cnVlfX0='
      };
      process.env.SOURCE_BUCKETS = 'allowedBucket001, allowedBucket002';

      // Act
      const imageRequest = new ImageRequest(s3Client, secretProvider);

      // Assert
      try {
        await imageRequest.setup(event);
      } catch (error) {
        expect(error.code).toEqual('ImageBucket::CannotAccessBucket');
      }
    });
  });

  describe('007/enableSignature', () => {
    const OLD_ENV = process.env;

    beforeAll(() => {
      process.env.ENABLE_SIGNATURE = 'Yes';
      process.env.SECRETS_MANAGER = 'serverless-image-handler';
      process.env.SECRET_KEY = 'signatureKey';
      process.env.SOURCE_BUCKETS = 'validBucket';
    });

    beforeEach(() => {
      jest.resetAllMocks();
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    afterAll(() => {
      process.env = OLD_ENV;
    });

    it('Should pass when the image signature is correct', async () => {
      // Arrange
      const event = {
        path: '/eyJidWNrZXQiOiJ2YWxpZEJ1Y2tldCIsImtleSI6InZhbGlkS2V5IiwiZWRpdHMiOnsidG9Gb3JtYXQiOiJwbmcifX0=',
        queryStringParameters: {
          signature: '4d41311006641a56de7bca8abdbda91af254506107a2c7b338a13ca2fa95eac3'
        }
      };

      // Mock
      mockAwsS3.getObject.mockImplementationOnce(() => ({
        promise() {
          return Promise.resolve({ Body: Buffer.from('SampleImageContent\n') });
        }
      }));
      mockAwsSecretManager.getSecretValue.mockImplementationOnce(() => ({
        promise() {
          return Promise.resolve({
            SecretString: JSON.stringify({
              [process.env.SECRET_KEY]: 'secret'
            })
          });
        }
      }));

      // Act
      const imageRequest = new ImageRequest(s3Client, secretProvider);
      const imageRequestInfo = await imageRequest.setup(event);
      const expectedResult = {
        requestType: 'Default',
        bucket: 'validBucket',
        key: 'validKey',
        edits: { toFormat: 'png' },
        outputFormat: 'png',
        originalImage: Buffer.from('SampleImageContent\n'),
        cacheControl: 'max-age=31536000,public',
        contentType: 'image/png'
      };

      // Assert
      expect(mockAwsS3.getObject).toHaveBeenCalledWith({ Bucket: 'validBucket', Key: 'validKey' });
      expect(mockAwsSecretManager.getSecretValue).toHaveBeenCalledWith({ SecretId: process.env.SECRETS_MANAGER });
      expect(imageRequestInfo).toEqual(expectedResult);
    });

    it('Should throw an error when queryStringParameters are missing', async () => {
      // Arrange
      const event = {
        path: '/eyJidWNrZXQiOiJ2YWxpZEJ1Y2tldCIsImtleSI6InZhbGlkS2V5IiwiZWRpdHMiOnsidG9Gb3JtYXQiOiJwbmcifX0='
      };

      // Act
      const imageRequest = new ImageRequest(s3Client, secretProvider);
      try {
        await imageRequest.setup(event);
      } catch (error) {
        // Assert
        expect(error).toMatchObject({
          status: StatusCodes.BAD_REQUEST,
          code: 'AuthorizationQueryParametersError',
          message: 'Query-string requires the signature parameter.'
        });
      }
    });

    it('Should throw an error when the image signature query parameter is missing', async () => {
      // Arrange
      const event = {
        path: '/eyJidWNrZXQiOiJ2YWxpZEJ1Y2tldCIsImtleSI6InZhbGlkS2V5IiwiZWRpdHMiOnsidG9Gb3JtYXQiOiJwbmcifX0=',
        queryStringParameters: null
      };

      // Act
      const imageRequest = new ImageRequest(s3Client, secretProvider);
      try {
        await imageRequest.setup(event);
      } catch (error) {
        // Assert
        expect(error).toMatchObject({
          status: StatusCodes.BAD_REQUEST,
          message: 'Query-string requires the signature parameter.',
          code: 'AuthorizationQueryParametersError'
        });
      }
    });

    it('Should throw an error when signature does not match', async () => {
      // Arrange
      const event = {
        path: '/eyJidWNrZXQiOiJ2YWxpZEJ1Y2tldCIsImtleSI6InZhbGlkS2V5IiwiZWRpdHMiOnsidG9Gb3JtYXQiOiJwbmcifX0=',
        queryStringParameters: {
          signature: 'invalid'
        }
      };

      // Mock
      mockAwsSecretManager.getSecretValue.mockImplementationOnce(() => ({
        promise() {
          return Promise.resolve({
            SecretString: JSON.stringify({
              [process.env.SECRET_KEY]: 'secret'
            })
          });
        }
      }));

      // Act
      const imageRequest = new ImageRequest(s3Client, secretProvider);
      try {
        await imageRequest.setup(event);
      } catch (error) {
        // Assert
        expect(mockAwsSecretManager.getSecretValue).toHaveBeenCalledWith({ SecretId: process.env.SECRETS_MANAGER });
        expect(error).toMatchObject({
          status: 403,
          message: 'Signature does not match.',
          code: 'SignatureDoesNotMatch'
        });
      }
    });

    it('Should throw an error when any other error occurs', async () => {
      // Arrange
      const event = {
        path: '/eyJidWNrZXQiOiJ2YWxpZEJ1Y2tldCIsImtleSI6InZhbGlkS2V5IiwiZWRpdHMiOnsidG9Gb3JtYXQiOiJwbmcifX0=',
        queryStringParameters: {
          signature: '4d41311006641a56de7bca8abdbda91af254506107a2c7b338a13ca2fa95eac3'
        }
      };

      // Mock
      mockAwsSecretManager.getSecretValue.mockImplementationOnce(() => ({
        promise() {
          return Promise.reject(new ImageHandlerError(StatusCodes.INTERNAL_SERVER_ERROR, 'InternalServerError', 'SimulatedError'));
        }
      }));

      // Act
      const imageRequest = new ImageRequest(s3Client, secretProvider);
      try {
        await imageRequest.setup(event);
      } catch (error) {
        // Assert
        expect(mockAwsSecretManager.getSecretValue).toHaveBeenCalledWith({ SecretId: process.env.SECRETS_MANAGER });
        expect(error).toMatchObject({
          status: StatusCodes.INTERNAL_SERVER_ERROR,
          message: 'Signature validation failed.',
          code: 'SignatureValidationFailure'
        });
      }
    });
  });

  describe('008/SVGSupport', () => {
    const OLD_ENV = process.env;

    beforeAll(() => {
      process.env.ENABLE_SIGNATURE = 'No';
      process.env.SOURCE_BUCKETS = 'validBucket';
    });

    beforeEach(() => {
      jest.resetAllMocks();
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    afterAll(() => {
      process.env = OLD_ENV;
    });

    it('Should return SVG image when no edit is provided for the SVG image', async () => {
      // Arrange
      const event = {
        path: '/image.svg'
      };

      // Mock
      mockAwsS3.getObject.mockImplementationOnce(() => ({
        promise() {
          return Promise.resolve({
            ContentType: 'image/svg+xml',
            Body: Buffer.from('SampleImageContent\n')
          });
        }
      }));

      // Act
      const imageRequest = new ImageRequest(s3Client, secretProvider);
      const imageRequestInfo = await imageRequest.setup(event);
      const expectedResult = {
        requestType: 'Thumbor',
        bucket: 'validBucket',
        key: 'image.svg',
        edits: {},
        originalImage: Buffer.from('SampleImageContent\n'),
        cacheControl: 'max-age=31536000,public',
        contentType: 'image/svg+xml'
      };

      // Assert
      expect(mockAwsS3.getObject).toHaveBeenCalledWith({ Bucket: 'validBucket', Key: 'image.svg' });
      expect(imageRequestInfo).toEqual(expectedResult);
    });

    it('Should return WebP image when there are any edits and no output is specified for the SVG image', async () => {
      // Arrange
      const event = {
        path: '/100x100/image.svg'
      };

      // Mock
      mockAwsS3.getObject.mockImplementationOnce(() => ({
        promise() {
          return Promise.resolve({
            ContentType: 'image/svg+xml',
            Body: Buffer.from('SampleImageContent\n')
          });
        }
      }));

      // Act
      const imageRequest = new ImageRequest(s3Client, secretProvider);
      const imageRequestInfo = await imageRequest.setup(event);
      const expectedResult = {
        requestType: 'Thumbor',
        bucket: 'validBucket',
        key: 'image.svg',
        edits: { resize: { width: 100, height: 100 } },
        outputFormat: 'png',
        originalImage: Buffer.from('SampleImageContent\n'),
        cacheControl: 'max-age=31536000,public',
        contentType: 'image/png'
      };

      // Assert
      expect(mockAwsS3.getObject).toHaveBeenCalledWith({ Bucket: 'validBucket', Key: 'image.svg' });
      expect(imageRequestInfo).toEqual(expectedResult);
    });

    it('Should return JPG image when output is specified to JPG for the SVG image', async () => {
      // Arrange
      const event = {
        path: '/filters:format(jpg)/image.svg'
      };

      // Mock
      mockAwsS3.getObject.mockImplementationOnce(() => ({
        promise() {
          return Promise.resolve({
            ContentType: 'image/svg+xml',
            Body: Buffer.from('SampleImageContent\n')
          });
        }
      }));

      // Act
      const imageRequest = new ImageRequest(s3Client, secretProvider);
      const imageRequestInfo = await imageRequest.setup(event);
      const expectedResult = {
        requestType: 'Thumbor',
        bucket: 'validBucket',
        key: 'image.svg',
        edits: { toFormat: 'jpeg' },
        outputFormat: 'jpeg',
        originalImage: Buffer.from('SampleImageContent\n'),
        cacheControl: 'max-age=31536000,public',
        contentType: 'image/jpeg'
      };

      // Assert
      expect(mockAwsS3.getObject).toHaveBeenCalledWith({ Bucket: 'validBucket', Key: 'image.svg' });
      expect(imageRequestInfo).toEqual(expectedResult);
    });
  });

  describe('009/customHeaders', () => {
    const OLD_ENV = process.env;

    beforeEach(() => {
      jest.resetAllMocks();
      process.env = { ...OLD_ENV };
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    afterAll(() => {
      process.env = OLD_ENV;
    });

    it('Should pass and return the customer headers if custom headers are provided', async () => {
      // Arrange
      const event = {
        path: '/eyJidWNrZXQiOiJ2YWxpZEJ1Y2tldCIsImtleSI6InZhbGlkS2V5IiwiaGVhZGVycyI6eyJDYWNoZS1Db250cm9sIjoibWF4LWFnZT0zMTUzNjAwMCxwdWJsaWMifSwib3V0cHV0Rm9ybWF0IjoianBlZyJ9'
      };
      process.env.SOURCE_BUCKETS = 'validBucket, validBucket2';

      // Mock
      mockAwsS3.getObject.mockImplementationOnce(() => ({
        promise() {
          return Promise.resolve({ Body: Buffer.from('SampleImageContent\n') });
        }
      }));

      // Act
      const imageRequest = new ImageRequest(s3Client, secretProvider);
      const imageRequestInfo = await imageRequest.setup(event);
      const expectedResult = {
        requestType: 'Default',
        bucket: 'validBucket',
        key: 'validKey',
        headers: { 'Cache-Control': 'max-age=31536000,public' },
        outputFormat: 'jpeg',
        originalImage: Buffer.from('SampleImageContent\n'),
        cacheControl: 'max-age=31536000,public',
        contentType: 'image/jpeg'
      };

      // Assert
      expect(mockAwsS3.getObject).toHaveBeenCalledWith({ Bucket: 'validBucket', Key: 'validKey' });
      expect(imageRequestInfo).toEqual(expectedResult);
    });
  });

  describe('010/reductionEffort', () => {
    it('Should pass when valid reduction effort is provided and output is webp', async () => {
      const event = {
        path: '/eyJidWNrZXQiOiJ0ZXN0Iiwia2V5IjoidGVzdC5wbmciLCJvdXRwdXRGb3JtYXQiOiJ3ZWJwIiwicmVkdWN0aW9uRWZmb3J0IjozfQ=='
      };
      process.env.SOURCE_BUCKETS = 'test, validBucket, validBucket2';

      // Mock
      mockAwsS3.getObject.mockImplementationOnce(() => ({
        promise() {
          return Promise.resolve({ Body: Buffer.from('SampleImageContent\n') });
        }
      }));

      // Act
      const imageRequest = new ImageRequest(s3Client, secretProvider);
      const imageRequestInfo = await imageRequest.setup(event);
      const expectedResult = {
        requestType: 'Default',
        bucket: 'test',
        key: 'test.png',
        edits: undefined,
        headers: undefined,
        outputFormat: 'webp',
        originalImage: Buffer.from('SampleImageContent\n'),
        cacheControl: 'max-age=31536000,public',
        contentType: 'image/webp',
        reductionEffort: 3
      };

      // Assert
      expect(mockAwsS3.getObject).toHaveBeenCalledWith({ Bucket: 'test', Key: 'test.png' });
      expect(imageRequestInfo).toEqual(expectedResult);
    });

    it('Should pass and use default reduction effort if it is invalid type and output is webp', async () => {
      const event = {
        path: '/eyJidWNrZXQiOiJ0ZXN0Iiwia2V5IjoidGVzdC5wbmciLCJvdXRwdXRGb3JtYXQiOiJ3ZWJwIiwicmVkdWN0aW9uRWZmb3J0IjoidGVzdCJ9'
      };
      process.env.SOURCE_BUCKETS = 'test, validBucket, validBucket2';

      // Mock
      mockAwsS3.getObject.mockImplementationOnce(() => ({
        promise() {
          return Promise.resolve({ Body: Buffer.from('SampleImageContent\n') });
        }
      }));

      // Act
      const imageRequest = new ImageRequest(s3Client, secretProvider);
      const imageRequestInfo = await imageRequest.setup(event);
      const expectedResult = {
        requestType: 'Default',
        bucket: 'test',
        key: 'test.png',
        edits: undefined,
        headers: undefined,
        outputFormat: 'webp',
        originalImage: Buffer.from('SampleImageContent\n'),
        cacheControl: 'max-age=31536000,public',
        contentType: 'image/webp',
        reductionEffort: 4
      };

      // Assert
      expect(mockAwsS3.getObject).toHaveBeenCalledWith({ Bucket: 'test', Key: 'test.png' });
      expect(imageRequestInfo).toEqual(expectedResult);
    });

    it('Should pass and use default reduction effort if it is out of range and output is webp', async () => {
      const event = {
        path: '/eyJidWNrZXQiOiJ0ZXN0Iiwia2V5IjoidGVzdC5wbmciLCJvdXRwdXRGb3JtYXQiOiJ3ZWJwIiwicmVkdWN0aW9uRWZmb3J0IjoxMH0='
      };
      process.env.SOURCE_BUCKETS = 'test, validBucket, validBucket2';

      // Mock
      mockAwsS3.getObject.mockImplementationOnce(() => ({
        promise() {
          return Promise.resolve({ Body: Buffer.from('SampleImageContent\n') });
        }
      }));

      // Act
      const imageRequest = new ImageRequest(s3Client, secretProvider);
      const imageRequestInfo = await imageRequest.setup(event);
      const expectedResult = {
        requestType: 'Default',
        bucket: 'test',
        key: 'test.png',
        edits: undefined,
        headers: undefined,
        outputFormat: 'webp',
        originalImage: Buffer.from('SampleImageContent\n'),
        cacheControl: 'max-age=31536000,public',
        contentType: 'image/webp',
        reductionEffort: 4
      };

      // Assert
      expect(mockAwsS3.getObject).toHaveBeenCalledWith({ Bucket: 'test', Key: 'test.png' });
      expect(imageRequestInfo).toEqual(expectedResult);
    });

    it('Should pass and not use reductionEffort if it is not provided and output is webp', async () => {
      const event = {
        path: '/eyJidWNrZXQiOiJ0ZXN0Iiwia2V5IjoidGVzdC5wbmciLCJvdXRwdXRGb3JtYXQiOiJ3ZWJwIn0='
      };
      process.env.SOURCE_BUCKETS = 'test, validBucket, validBucket2';

      // Mock
      mockAwsS3.getObject.mockImplementationOnce(() => ({
        promise() {
          return Promise.resolve({ Body: Buffer.from('SampleImageContent\n') });
        }
      }));

      // Act
      const imageRequest = new ImageRequest(s3Client, secretProvider);
      const imageRequestInfo = await imageRequest.setup(event);
      const expectedResult = {
        requestType: 'Default',
        bucket: 'test',
        key: 'test.png',
        edits: undefined,
        headers: undefined,
        outputFormat: 'webp',
        originalImage: Buffer.from('SampleImageContent\n'),
        cacheControl: 'max-age=31536000,public',
        contentType: 'image/webp'
      };

      // Assert
      expect(mockAwsS3.getObject).toHaveBeenCalledWith({ Bucket: 'test', Key: 'test.png' });
      expect(imageRequestInfo).toEqual(expectedResult);
    });
  });
});

describe('getOriginalImage()', () => {
  const s3Client = new S3();
  const secretsManager = new SecretsManager();
  const secretProvider = new SecretProvider(secretsManager);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('001/imageExists', () => {
    it('Should pass if the proper bucket name and key are supplied, simulating an image file that can be retrieved', async () => {
      // Mock
      mockAwsS3.getObject.mockImplementationOnce(() => ({
        promise() {
          return Promise.resolve({ Body: Buffer.from('SampleImageContent\n') });
        }
      }));

      // Act
      const imageRequest = new ImageRequest(s3Client, secretProvider);
      const result = await imageRequest.getOriginalImage('validBucket', 'validKey');

      // Assert
      expect(mockAwsS3.getObject).toHaveBeenCalledWith({ Bucket: 'validBucket', Key: 'validKey' });
      expect(result.originalImage).toEqual(Buffer.from('SampleImageContent\n'));
    });
  });

  describe('002/imageDoesNotExist', () => {
    it('Should throw an error if an invalid bucket or key name is provided, simulating a non-existent original image', async () => {
      // Mock
      mockAwsS3.getObject.mockImplementationOnce(() => ({
        promise() {
          return Promise.reject(new ImageHandlerError(StatusCodes.NOT_FOUND, 'NoSuchKey', 'SimulatedException'));
        }
      }));

      // Act
      const imageRequest = new ImageRequest(s3Client, secretProvider);

      // Assert
      try {
        await imageRequest.getOriginalImage('invalidBucket', 'invalidKey');
      } catch (error) {
        expect(mockAwsS3.getObject).toHaveBeenCalledWith({ Bucket: 'invalidBucket', Key: 'invalidKey' });
        expect(error.status).toEqual(StatusCodes.NOT_FOUND);
      }
    });
  });

  describe('003/unknownError', () => {
    it('Should throw an error if an unknown problem happens when getting an object', async () => {
      // Mock
      mockAwsS3.getObject.mockImplementationOnce(() => ({
        promise() {
          return Promise.reject(new ImageHandlerError(StatusCodes.INTERNAL_SERVER_ERROR, 'InternalServerError', 'SimulatedException'));
        }
      }));

      // Act
      const imageRequest = new ImageRequest(s3Client, secretProvider);

      // Assert
      try {
        await imageRequest.getOriginalImage('invalidBucket', 'invalidKey');
      } catch (error) {
        expect(mockAwsS3.getObject).toHaveBeenCalledWith({ Bucket: 'invalidBucket', Key: 'invalidKey' });
        expect(error.status).toEqual(StatusCodes.INTERNAL_SERVER_ERROR);
      }
    });
  });

  describe('004/noExtension', () => {
    const testFiles = [
      [0x89, 0x50, 0x4e, 0x47],
      [0xff, 0xd8, 0xff, 0xdb],
      [0xff, 0xd8, 0xff, 0xe0],
      [0xff, 0xd8, 0xff, 0xee],
      [0xff, 0xd8, 0xff, 0xe1],
      [0x52, 0x49, 0x46, 0x46],
      [0x49, 0x49, 0x2a, 0x00],
      [0x4d, 0x4d, 0x00, 0x2a]
    ];
    const expectFileType = ['image/png', 'image/jpeg', 'image/jpeg', 'image/jpeg', 'image/jpeg', 'image/webp', 'image/tiff', 'image/tiff'];

    testFiles.forEach((test, index) => {
      it('Should pass and infer content type if there is no extension, had default s3 content type and it has a valid key and a valid bucket', async () => {
        // Mock
        mockAwsS3.getObject.mockImplementationOnce(() => ({
          promise() {
            return Promise.resolve({
              ContentType: 'binary/octet-stream',
              Body: Buffer.from(new Uint8Array(test))
            });
          }
        }));

        // Act
        const imageRequest = new ImageRequest(s3Client, secretProvider);
        const result = await imageRequest.getOriginalImage('validBucket', 'validKey');

        // Assert
        expect(mockAwsS3.getObject).toHaveBeenCalledWith({ Bucket: 'validBucket', Key: 'validKey' });
        expect(result.originalImage).toEqual(Buffer.from(new Uint8Array(test)));
        expect(result.contentType).toEqual(expectFileType[index]);
      });

      it('Should pass and infer content type if there is no extension, had default s3 content type and it has a valid key and a valid bucket and content type is application/octet-stream', async () => {
        // Mock
        mockAwsS3.getObject.mockImplementationOnce(() => ({
          promise() {
            return Promise.resolve({
              ContentType: 'application/octet-stream',
              Body: Buffer.from(new Uint8Array(test))
            });
          }
        }));

        // Act
        const imageRequest = new ImageRequest(s3Client, secretProvider);
        const result = await imageRequest.getOriginalImage('validBucket', 'validKey');

        // Assert
        expect(mockAwsS3.getObject).toHaveBeenCalledWith({ Bucket: 'validBucket', Key: 'validKey' });
        expect(result.originalImage).toEqual(Buffer.from(new Uint8Array(test)));
        expect(result.contentType).toEqual(expectFileType[index]);
      });

      it('Should fail to infer content type if there is no extension and file header is not recognized', async () => {
        // Mock
        mockAwsS3.getObject.mockImplementationOnce(() => ({
          promise() {
            return Promise.resolve({
              ContentType: 'binary/octet-stream',
              Body: Buffer.from(new Uint8Array(test))
            });
          }
        }));

        // Act
        const imageRequest = new ImageRequest(s3Client, secretProvider);
        try {
          await imageRequest.getOriginalImage('validBucket', 'validKey');
        } catch (error) {
          // Assert
          expect(mockAwsS3.getObject).toHaveBeenCalledWith({ Bucket: 'validBucket', Key: 'validKey' });
          expect(error.status).toEqual(500);
        }
      });
    });
  });
});

describe('parseImageBucket()', () => {
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

  describe('001/defaultRequestType/bucketSpecifiedInRequest/allowed', () => {
    it('Should pass if the bucket name is provided in the image request and has been allowed in SOURCE_BUCKETS', () => {
      // Arrange
      const event = { path: '/eyJidWNrZXQiOiJhbGxvd2VkQnVja2V0MDAxIiwia2V5Ijoic2FtcGxlSW1hZ2VLZXkwMDEuanBnIiwiZWRpdHMiOnsiZ3JheXNjYWxlIjoidHJ1ZSJ9fQ==' };
      process.env.SOURCE_BUCKETS = 'allowedBucket001, allowedBucket002';

      // Act
      const imageRequest = new ImageRequest(s3Client, secretProvider);
      const result = imageRequest.parseImageBucket(event, RequestTypes.DEFAULT);

      // Assert
      const expectedResult = 'allowedBucket001';
      expect(result).toEqual(expectedResult);
    });
  });

  describe('002/defaultRequestType/bucketSpecifiedInRequest/notAllowed', () => {
    it('Should throw an error if the bucket name is provided in the image request but has not been allowed in SOURCE_BUCKETS', () => {
      // Arrange
      const event = { path: '/eyJidWNrZXQiOiJhbGxvd2VkQnVja2V0MDAxIiwia2V5Ijoic2FtcGxlSW1hZ2VLZXkwMDEuanBnIiwiZWRpdHMiOnsiZ3JheXNjYWxlIjoidHJ1ZSJ9fQ==' };
      process.env.SOURCE_BUCKETS = 'allowedBucket003, allowedBucket004';

      // Act
      const imageRequest = new ImageRequest(s3Client, secretProvider);

      // Assert
      try {
        imageRequest.parseImageBucket(event, RequestTypes.DEFAULT);
      } catch (error) {
        expect(error).toMatchObject({
          status: StatusCodes.FORBIDDEN,
          code: 'ImageBucket::CannotAccessBucket',
          message: 'The bucket you specified could not be accessed. Please check that the bucket is specified in your SOURCE_BUCKETS.'
        });
      }
    });
  });

  describe('003/defaultRequestType/bucketNotSpecifiedInRequest', () => {
    it('Should pass if the image request does not contain a source bucket but SOURCE_BUCKETS contains at least one bucket that can be used as a default', () => {
      // Arrange
      const event = { path: '/eyJrZXkiOiJzYW1wbGVJbWFnZUtleTAwMS5qcGciLCJlZGl0cyI6eyJncmF5c2NhbGUiOiJ0cnVlIn19==' };
      process.env.SOURCE_BUCKETS = 'allowedBucket001, allowedBucket002';

      // Act
      const imageRequest = new ImageRequest(s3Client, secretProvider);
      const result = imageRequest.parseImageBucket(event, RequestTypes.DEFAULT);

      // Assert
      const expectedResult = 'allowedBucket001';
      expect(result).toEqual(expectedResult);
    });
  });

  describe('004/thumborRequestType', () => {
    it('Should pass if there is at least one SOURCE_BUCKET specified that can be used as the default for Thumbor requests', () => {
      // Arrange
      const event = { path: '/filters:grayscale()/test-image-001.jpg' };
      process.env.SOURCE_BUCKETS = 'allowedBucket001, allowedBucket002';

      // Act
      const imageRequest = new ImageRequest(s3Client, secretProvider);
      const result = imageRequest.parseImageBucket(event, RequestTypes.THUMBOR);

      // Assert
      const expectedResult = 'allowedBucket001';
      expect(result).toEqual(expectedResult);
    });
  });

  describe('005/customRequestType', () => {
    it('Should pass if there is at least one SOURCE_BUCKET specified that can be used as the default for Custom requests', () => {
      // Arrange
      const event = { path: '/filters:grayscale()/test-image-001.jpg' };

      process.env.SOURCE_BUCKETS = 'allowedBucket001, allowedBucket002';

      // Act
      const imageRequest = new ImageRequest(s3Client, secretProvider);
      const result = imageRequest.parseImageBucket(event, RequestTypes.CUSTOM);

      // Assert
      const expectedResult = 'allowedBucket001';
      expect(result).toEqual(expectedResult);
    });
  });

  describe('006/invalidRequestType', () => {
    it('Should pass if there is at least one SOURCE_BUCKET specified that can be used as the default for Custom requests', () => {
      // Arrange
      const event = {
        path: '/filters:grayscale()/test-image-001.jpg'
      };
      process.env.SOURCE_BUCKETS = 'allowedBucket001, allowedBucket002';

      // Act
      const imageRequest = new ImageRequest(s3Client, secretProvider);

      // Assert
      try {
        imageRequest.parseImageBucket(event, undefined);
      } catch (error) {
        expect(error).toMatchObject({
          status: StatusCodes.NOT_FOUND,
          code: 'ImageBucket::CannotFindBucket',
          message: 'The bucket you specified could not be found. Please check the spelling of the bucket name in your request.'
        });
      }
    });
  });
});

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

describe('getAllowedSourceBuckets()', () => {
  const s3Client = new S3();
  const secretsManager = new SecretsManager();
  const secretProvider = new SecretProvider(secretsManager);

  describe('001/sourceBucketsSpecified', () => {
    it('Should pass if the SOURCE_BUCKETS environment variable is not empty and contains valid inputs', () => {
      // Arrange
      process.env.SOURCE_BUCKETS = 'allowedBucket001, allowedBucket002';

      // Act
      const imageRequest = new ImageRequest(s3Client, secretProvider);
      const result = imageRequest.getAllowedSourceBuckets();

      // Assert
      const expectedResult = ['allowedBucket001', 'allowedBucket002'];
      expect(result).toEqual(expectedResult);
    });
  });

  describe('002/noSourceBucketsSpecified', () => {
    it('Should throw an error if the SOURCE_BUCKETS environment variable is empty or does not contain valid values', () => {
      // Arrange
      process.env = {};

      // Act
      const imageRequest = new ImageRequest(s3Client, secretProvider);

      // Assert
      try {
        imageRequest.getAllowedSourceBuckets();
      } catch (error) {
        expect(error).toMatchObject({
          status: StatusCodes.BAD_REQUEST,
          code: 'GetAllowedSourceBuckets::NoSourceBuckets',
          message:
            'The SOURCE_BUCKETS variable could not be read. Please check that it is not empty and contains at least one source bucket, or multiple buckets separated by commas. Spaces can be provided between commas and bucket names, these will be automatically parsed out when decoding.'
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
