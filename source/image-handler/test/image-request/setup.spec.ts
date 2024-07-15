// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { GetObjectCommand, S3, S3Client } from '@aws-sdk/client-s3';
import { ImageRequest } from '../../src/image-request';
import { ImageRequestInfo, RequestTypes } from '../../src/lib';
import { sample_image, sdkStreamFromString } from '../mock';
import { build_event } from '../helpers';
import 'aws-sdk-client-mock-jest';
import { mockClient } from 'aws-sdk-client-mock';
import fs, { createReadStream } from 'fs';
import { sdkStreamMixin } from '@smithy/util-stream';

describe('setup', () => {
  const OLD_ENV = process.env;
  const mockS3Client = mockClient(S3Client);

  beforeEach(() => {
    mockS3Client.reset();
    process.env = { ...OLD_ENV };
  });

  afterEach(() => {
    jest.clearAllMocks();
    process.env = OLD_ENV;
  });

  it('Should pass when a thumbor image request is provided and populate the ImageRequest object with the proper values 1', async () => {
    // Arrange
    const event = build_event({ rawPath: '/filters:grayscale()/test-image-001.jpg' });
    process.env.SOURCE_BUCKETS = 'allowedBucket001, allowedBucket002';

    // Mock
    mockS3Client.on(GetObjectCommand).resolves({ Body: sdkStreamFromString('SampleImageContent\n') });

    // Act
    const imageRequest = new ImageRequest(new S3({}));
    const imageRequestInfo = await imageRequest.setup(event);
    const expectedResult = {
      requestType: 'Thumbor',
      bucket: 'allowedBucket001',
      key: 'test-image-001.jpg',
      edits: { grayscale: true },
      originalImage: Buffer.from('SampleImageContent\n'),
      cacheControl: 'max-age=31536000',
      contentType: 'image',
    };

    // Assert
    expect(mockS3Client).toHaveReceivedCommandWith(GetObjectCommand, {
      Bucket: 'allowedBucket001',
      Key: 'test-image-001.jpg',
    });
    expect(imageRequestInfo).toEqual(expectedResult);
  });

  it('Should pass when a thumbor image request is provided and populate the ImageRequest object with the proper values 2', async () => {
    // Arrange
    const event = build_event({
      rawPath: '/filters:format(png)/filters:quality(50)/test-image-001.jpg',
    });
    process.env.SOURCE_BUCKETS = 'allowedBucket001, allowedBucket002';

    // Mock
    mockS3Client.on(GetObjectCommand).resolves({ Body: sdkStreamFromString('SampleImageContent\n') });

    // Act
    const imageRequest = new ImageRequest(new S3({}));
    const imageRequestInfo = await imageRequest.setup(event);
    const expectedResult = {
      requestType: 'Thumbor',
      bucket: 'allowedBucket001',
      key: 'test-image-001.jpg',
      edits: {
        toFormat: 'png',
        png: { quality: 50 },
      },
      originalImage: Buffer.from('SampleImageContent\n'),
      cacheControl: 'max-age=31536000',
      outputFormat: 'png',
      contentType: 'image/png',
    };

    // Assert
    expect(mockS3Client).toHaveReceivedCommandWith(GetObjectCommand, {
      Bucket: 'allowedBucket001',
      Key: 'test-image-001.jpg',
    });
    expect(imageRequestInfo).toEqual(expectedResult);
  });

  it('Should pass when a custom image request is provided and populate the ImageRequest object with the proper values', async () => {
    // Arrange
    const event = build_event({
      rawPath: '/filters:rotate(90)/filters:grayscale()/custom-image.jpg',
    });
    process.env = {
      SOURCE_BUCKETS: 'allowedBucket001, allowedBucket002',
    };

    // Mock
    mockS3Client.on(GetObjectCommand).resolves({
      CacheControl: 'max-age=300',
      ContentType: 'custom-type',
      Expires: new Date('Tue, 24 Dec 2019 13:46:28 GMT'),
      LastModified: new Date('Sat, 19 Dec 2009 16:30:47 GMT'),
      Body: sdkStreamFromString('SampleImageContent\n'),
    });

    // Act
    const imageRequest = new ImageRequest(new S3({}));
    const imageRequestInfo = await imageRequest.setup(event);
    const expectedResult: ImageRequestInfo = {
      requestType: RequestTypes.THUMBOR,
      bucket: 'allowedBucket001',
      key: 'custom-image.jpg',
      edits: {
        grayscale: true,
        rotate: 90,
      },
      originalImage: Buffer.from('SampleImageContent\n'),
      cacheControl: 'max-age=300',
      contentType: 'custom-type',
      expires: new Date('Tue, 24 Dec 2019 13:46:28 GMT'),
      lastModified: new Date('Sat, 19 Dec 2009 16:30:47 GMT'),
    };

    // Assert
    expect(mockS3Client).toHaveReceivedCommandWith(GetObjectCommand, {
      Bucket: 'allowedBucket001',
      Key: 'custom-image.jpg',
    });
    expect(imageRequestInfo).toEqual(expectedResult);
  });

  it('Should pass when a custom image request is provided and populate the ImageRequest object with the proper values and no file extension', async () => {
    // Arrange
    const event = build_event({
      rawPath: '/filters:rotate(90)/filters:grayscale()/custom-image',
    });
    process.env = {
      SOURCE_BUCKETS: 'allowedBucket001, allowedBucket002',
    };

    // Mock
    mockS3Client.on(GetObjectCommand).resolves({
      CacheControl: 'max-age=300',
      ContentType: 'custom-type',
      Expires: new Date('Tue, 24 Dec 2019 13:46:28 GMT'),
      LastModified: new Date('Sat, 19 Dec 2009 16:30:47 GMT'),
      Body: sdkStreamFromString('SampleImageContent\n'),
    });

    // Act
    const imageRequest = new ImageRequest(new S3({}));
    const imageRequestInfo = await imageRequest.setup(event);
    const expectedResult = {
      requestType: RequestTypes.THUMBOR,
      bucket: 'allowedBucket001',
      key: 'custom-image',
      edits: {
        grayscale: true,
        rotate: 90,
      },
      originalImage: Buffer.from('SampleImageContent\n'),
      cacheControl: 'max-age=300',
      contentType: 'custom-type',
      expires: new Date('Tue, 24 Dec 2019 13:46:28 GMT'),
      lastModified: new Date('Sat, 19 Dec 2009 16:30:47 GMT'),
    };

    // Assert
    expect(mockS3Client).toHaveReceivedCommandWith(GetObjectCommand, {
      Bucket: 'allowedBucket001',
      Key: 'custom-image',
    });
    expect(imageRequestInfo).toEqual(expectedResult);
  });

  describe('SVGSupport', () => {
    beforeAll(() => {
      process.env.ENABLE_SIGNATURE = 'No';
      process.env.SOURCE_BUCKETS = 'validBucket';
    });

    it('Should return SVG image when no edit is provided for the SVG image', async () => {
      // Arrange
      const event = build_event({
        rawPath: '/image.svg',
      });

      // Mock
      mockS3Client.on(GetObjectCommand).resolves({
        ContentType: 'image/svg+xml',
        Body: sdkStreamFromString('SampleImageContent\n'),
      });

      // Act
      const imageRequest = new ImageRequest(new S3({}));
      const imageRequestInfo = await imageRequest.setup(event);
      const expectedResult = {
        requestType: 'Thumbor',
        bucket: 'validBucket',
        key: 'image.svg',
        edits: {},
        originalImage: Buffer.from('SampleImageContent\n'),
        cacheControl: 'max-age=31536000',
        contentType: 'image/svg+xml',
      };

      // Assert
      expect(mockS3Client).toHaveReceivedCommandWith(GetObjectCommand, {
        Bucket: 'validBucket',
        Key: 'image.svg',
      });
      expect(imageRequestInfo).toEqual(expectedResult);
    });

    it('Should return WebP image when there are any edits and no output is specified for the SVG image', async () => {
      // Arrange
      const event = build_event({
        rawPath: '/100x100/image.svg',
      });

      // Mock
      mockS3Client.on(GetObjectCommand).resolves({
        ContentType: 'image/svg+xml',
        Body: sdkStreamFromString('SampleImageContent\n'),
      });

      // Act
      const imageRequest = new ImageRequest(new S3({}));
      const imageRequestInfo = await imageRequest.setup(event);
      const expectedResult = {
        requestType: 'Thumbor',
        bucket: 'validBucket',
        key: 'image.svg',
        edits: { resize: { width: 100, height: 100 } },
        outputFormat: 'png',
        originalImage: Buffer.from('SampleImageContent\n'),
        cacheControl: 'max-age=31536000',
        contentType: 'image/png',
      };

      // Assert
      expect(mockS3Client).toHaveReceivedCommandWith(GetObjectCommand, {
        Bucket: 'validBucket',
        Key: 'image.svg',
      });
      expect(imageRequestInfo).toEqual(expectedResult);
    });

    it('Should return JPG image when output is specified to JPG for the SVG image', async () => {
      // Arrange
      const event = build_event({
        rawPath: '/filters:format(jpg)/image.svg',
      });

      // Mock
      mockS3Client.on(GetObjectCommand).resolves({
        ContentType: 'image/svg+xml',
        Body: sdkStreamFromString('SampleImageContent\n'),
      });

      // Act
      const imageRequest = new ImageRequest(new S3());
      const imageRequestInfo = await imageRequest.setup(event);
      const expectedResult = {
        requestType: 'Thumbor',
        bucket: 'validBucket',
        key: 'image.svg',
        edits: { toFormat: 'jpeg' },
        outputFormat: 'jpeg',
        originalImage: Buffer.from('SampleImageContent\n'),
        cacheControl: 'max-age=31536000',
        contentType: 'image/jpeg',
      };

      // Assert
      expect(mockS3Client).toHaveReceivedCommandWith(GetObjectCommand, {
        Bucket: 'validBucket',
        Key: 'image.svg',
      });
      expect(imageRequestInfo).toEqual(expectedResult);
    });
  });

  it('Should pass and return the customer headers if custom headers are provided', async () => {
    // Arrange
    const event = build_event({
      rawPath:
        '/eyJidWNrZXQiOiJ2YWxpZEJ1Y2tldCIsImtleSI6InZhbGlkS2V5IiwiaGVhZGVycyI6eyJDYWNoZS1Db250cm9sIjoibWF4LWFnZT0zMTUzNjAwMCJ9LCJvdXRwdXRGb3JtYXQiOiJqcGVnIn0=',
    });
    process.env.SOURCE_BUCKETS = 'validBucket, validBucket2';

    // Mock
    mockS3Client.on(GetObjectCommand).resolves({ Body: sdkStreamFromString('SampleImageContent\n') });

    // Act
    const imageRequest = new ImageRequest(new S3({}));
    const imageRequestInfo = await imageRequest.setup(event);
    const expectedResult = {
      requestType: 'Default',
      bucket: 'validBucket',
      key: 'validKey',
      headers: { 'Cache-Control': 'max-age=31536000' },
      outputFormat: 'jpeg',
      originalImage: Buffer.from('SampleImageContent\n'),
      cacheControl: 'max-age=31536000',
      contentType: 'image/jpeg',
    };

    // Assert
    expect(mockS3Client).toHaveReceivedCommandWith(GetObjectCommand, {
      Bucket: 'validBucket',
      Key: 'validKey',
    });
    expect(imageRequestInfo).toEqual(expectedResult);
  });

  it('Should pass when valid reduction effort is provided and output is webp', async () => {
    const event = build_event({
      rawPath:
        '/eyJidWNrZXQiOiJ0ZXN0Iiwia2V5IjoidGVzdC5wbmciLCJvdXRwdXRGb3JtYXQiOiJ3ZWJwIiwicmVkdWN0aW9uRWZmb3J0IjozfQ==',
    });
    process.env.SOURCE_BUCKETS = 'test, validBucket, validBucket2';

    // Mock
    mockS3Client.on(GetObjectCommand).resolves({ Body: sample_image });

    // Act
    const imageRequest = new ImageRequest(new S3({}));
    const imageRequestInfo = await imageRequest.setup(event);
    const expectedResult = {
      requestType: 'Default',
      bucket: 'test',
      key: 'test.png',
      edits: undefined,
      headers: undefined,
      outputFormat: 'webp',
      originalImage: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        'base64',
      ),
      cacheControl: 'max-age=31536000',
      contentType: 'image/webp',
    };

    // Assert
    expect(mockS3Client).toHaveReceivedCommandWith(GetObjectCommand, {
      Bucket: 'test',
      Key: 'test.png',
    });
    expect(imageRequestInfo).toEqual(expectedResult);
  });

  it('Should pass and use default reduction effort if it is invalid type and output is webp', async () => {
    const event = build_event({
      rawPath:
        '/eyJidWNrZXQiOiJ0ZXN0Iiwia2V5IjoidGVzdC5wbmciLCJvdXRwdXRGb3JtYXQiOiJ3ZWJwIiwicmVkdWN0aW9uRWZmb3J0IjoidGVzdCJ9',
    });
    process.env.SOURCE_BUCKETS = 'test, validBucket, validBucket2';

    // Mock
    mockS3Client.on(GetObjectCommand).resolves({ Body: sdkStreamFromString('SampleImageContent\n') });

    // Act
    const imageRequest = new ImageRequest(new S3({}));
    const imageRequestInfo = await imageRequest.setup(event);
    const expectedResult = {
      requestType: 'Default',
      bucket: 'test',
      key: 'test.png',
      edits: undefined,
      headers: undefined,
      outputFormat: 'webp',
      originalImage: Buffer.from('SampleImageContent\n'),
      cacheControl: 'max-age=31536000',
      contentType: 'image/webp',
    };

    // Assert
    expect(mockS3Client).toHaveReceivedCommandWith(GetObjectCommand, {
      Bucket: 'test',
      Key: 'test.png',
    });
    expect(imageRequestInfo).toEqual(expectedResult);
  });

  it('Should pass and use default reduction effort if it is out of range and output is webp', async () => {
    const event = build_event({
      rawPath:
        '/eyJidWNrZXQiOiJ0ZXN0Iiwia2V5IjoidGVzdC5wbmciLCJvdXRwdXRGb3JtYXQiOiJ3ZWJwIiwicmVkdWN0aW9uRWZmb3J0IjoxMH0=',
    });
    process.env.SOURCE_BUCKETS = 'test, validBucket, validBucket2';

    // Mock
    mockS3Client.on(GetObjectCommand).resolves({ Body: sdkStreamFromString('SampleImageContent\n') });

    // Act
    const imageRequest = new ImageRequest(new S3({}));
    const imageRequestInfo = await imageRequest.setup(event);
    const expectedResult = {
      requestType: 'Default',
      bucket: 'test',
      key: 'test.png',
      edits: undefined,
      headers: undefined,
      outputFormat: 'webp',
      originalImage: Buffer.from('SampleImageContent\n'),
      cacheControl: 'max-age=31536000',
      contentType: 'image/webp',
    };

    // Assert
    expect(mockS3Client).toHaveReceivedCommandWith(GetObjectCommand, {
      Bucket: 'test',
      Key: 'test.png',
    });
    expect(imageRequestInfo).toEqual(expectedResult);
  });

  it('Should pass and not use reductionEffort if it is not provided and output is webp', async () => {
    const event = build_event({
      rawPath: '/eyJidWNrZXQiOiJ0ZXN0Iiwia2V5IjoidGVzdC5wbmciLCJvdXRwdXRGb3JtYXQiOiJ3ZWJwIn0=',
    });
    process.env.SOURCE_BUCKETS = 'test, validBucket, validBucket2';

    // Mock
    mockS3Client.on(GetObjectCommand).resolves({ Body: sdkStreamFromString('SampleImageContent\n') });

    // Act
    const imageRequest = new ImageRequest(new S3({}));
    const imageRequestInfo = await imageRequest.setup(event);
    const expectedResult = {
      requestType: 'Default',
      bucket: 'test',
      key: 'test.png',
      edits: undefined,
      headers: undefined,
      outputFormat: 'webp',
      originalImage: Buffer.from('SampleImageContent\n'),
      cacheControl: 'max-age=31536000',
      contentType: 'image/webp',
    };

    // Assert
    expect(mockS3Client).toHaveReceivedCommandWith(GetObjectCommand, {
      Bucket: 'test',
      Key: 'test.png',
    });
    expect(imageRequestInfo).toEqual(expectedResult);
  });

  it('Should pass when a default image request is provided and populate the ImageRequest object with the proper values and a utf-8 key', async function () {
    // Arrange
    const event = build_event({
      rawPath:
        'eyJidWNrZXQiOiJ0ZXN0Iiwia2V5Ijoi5Lit5paHIiwiZWRpdHMiOnsiZ3JheXNjYWxlIjp0cnVlfSwib3V0cHV0Rm9ybWF0IjoianBlZyJ9',
    });
    process.env = {
      SOURCE_BUCKETS: 'test, test2',
    };
    // Mock
    mockS3Client.on(GetObjectCommand).resolves({ Body: sdkStreamFromString('SampleImageContent\n') });

    // Act
    const imageRequest = new ImageRequest(new S3({}));
    const imageRequestInfo = await imageRequest.setup(event);
    const expectedResult = {
      requestType: 'Default',
      bucket: 'test',
      key: '中文',
      edits: { grayscale: true },
      headers: undefined,
      outputFormat: 'jpeg',
      originalImage: Buffer.from('SampleImageContent\n'),
      cacheControl: 'max-age=31536000',
      contentType: 'image/jpeg',
    };
    // Assert
    expect(mockS3Client).toHaveReceivedCommandWith(GetObjectCommand, { Bucket: 'test', Key: '中文' });
    expect(imageRequestInfo).toEqual(expectedResult);
  });
});
