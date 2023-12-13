// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

// Import index.js
import {handler}from "../src";
import {describe, it, beforeEach} from "vitest";
import {mockClient} from "aws-sdk-client-mock";
import {GetObjectCommand, S3Client} from "@aws-sdk/client-s3";
import {Readable} from "stream";
import {sdkStreamMixin} from "@aws-sdk/util-stream-node";
import {DetectFacesCommand, RekognitionClient} from "@aws-sdk/client-rekognition";

const {expect} = require("expect");
(globalThis as any).expect = expect;
require("aws-sdk-client-mock-jest");

const s3_mock = mockClient(S3Client);
const rekognition_mock = mockClient(RekognitionClient);

function generateStream(data: Buffer) {
  const stream = Readable.from(data)
  return sdkStreamMixin(stream)
}

describe('index', function () {
  // Arrange
  process.env.SOURCE_BUCKETS = 'source-bucket';
  const mockImage = Buffer.from('SampleImageContent\n');
  const mockFallbackImage = Buffer.from('SampleFallbackImageContent\n');

  describe('TC: Success', function () {
    beforeEach(() => {
      s3_mock.reset();
      // Mock
      s3_mock.on(GetObjectCommand).resolves({
              Body: generateStream(mockImage),
              ContentType: 'image/jpeg'
            });
      });

    rekognition_mock.on(DetectFacesCommand).resolves({})

    it('001/should return the image when there is no error', async function () {
      // Arrange
      const event = {
        path: '/test.jpg'
      };
      // Act
      const result = await handler(event);
      const expectedResult = {
        statusCode: 200,
        isBase64Encoded: true,
        headers: {
          'Access-Control-Allow-Methods': 'GET',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Credentials': true,
          'Content-Type': 'image/jpeg',
          'Expires': undefined,
          'Cache-Control': 'public, max-age=31536000, immutable',
          'Last-Modified': undefined
        },
        body: mockImage.toString('base64')
      };
      // Assert
      expect(s3_mock).toHaveReceivedCommandWith(GetObjectCommand, {Bucket: 'source-bucket', Key: 'test.jpg'});
      expect(result).toEqual(expectedResult);
    });
    it('002/should return the image with custom headers when custom headers are provided', async function () {
      // Arrange
      const event = {
        path: '/eyJidWNrZXQiOiJzb3VyY2UtYnVja2V0Iiwia2V5IjoidGVzdC5qcGciLCJoZWFkZXJzIjp7IkN1c3RvbS1IZWFkZXIiOiJDdXN0b21WYWx1ZSJ9fQ=='
      };
      // Act
      const result = await handler(event);
      const expectedResult = {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Methods': 'GET',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Credentials': true,
          'Content-Type': 'image/jpeg',
          'Expires': undefined,
          'Cache-Control': 'public, max-age=31536000, immutable',
          'Last-Modified': undefined,
          'Custom-Header': 'CustomValue'
        },
        body: mockImage.toString('base64'),
        isBase64Encoded: true
      };
      // Assert
      expect(s3_mock).toHaveReceivedCommandWith(GetObjectCommand, {Bucket: 'source-bucket', Key: 'test.jpg'});
      expect(result).toEqual(expectedResult);
    });
    it('003/should return the image when the request is from ALB', async function () {
      // Arrange
      const event = {
        path: '/test.jpg',
        requestContext: {
          elb: {}
        }
      };
      // Act
      const result = await handler(event);
      const expectedResult = {
        statusCode: 200,
        isBase64Encoded: true,
        headers: {
          'Access-Control-Allow-Methods': 'GET',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Content-Type': 'image/jpeg',
          'Expires': undefined,
          'Cache-Control': 'public, max-age=31536000, immutable',
          'Last-Modified': undefined
        },
        body: mockImage.toString('base64')
      };
      // Assert
      expect(s3_mock).toHaveReceivedCommandWith(GetObjectCommand, {Bucket: 'source-bucket', Key: 'test.jpg'});
      expect(result).toEqual(expectedResult);
    });
  });

  describe('TC: Error', function () {
    beforeEach(() => {
      s3_mock.reset();
    });

    it('001/should return an error JSON when an error occurs', async function () {
      // Arrange
      const event = {
        path: '/test.jpg'
      };
      // Mock
      s3_mock.on(GetObjectCommand).resolves(Promise.reject({
        code: 'NoSuchKey',
        status: 404,
        message: 'NoSuchKey error happened.'
      }))
      // Act
      const result = await handler(event);
      const expectedResult = {
        statusCode: 404,
        isBase64Encoded: false,
        headers: {
          'Access-Control-Allow-Methods': 'GET',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Credentials': true,
          "Cache-Control": "public, max-age=60",
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 404,
          code: 'NoSuchKey',
          message: 'NoSuchKey error happened.'
        })
      };
      // Assert
      expect(s3_mock).toHaveReceivedCommandWith(GetObjectCommand, {Bucket: 'source-bucket', Key: 'test.jpg'});
      expect(result).toEqual(expectedResult);
    });
    it('002/should return 500 error when there is no error status in the error', async function () {
      // Arrange
      const event = {
        path: 'eyJidWNrZXQiOiJzb3VyY2UtYnVja2V0Iiwia2V5IjoidGVzdC5qcGciLCJlZGl0cyI6eyJ3cm9uZ0ZpbHRlciI6dHJ1ZX19'
      };
      // Mock
      s3_mock.on(GetObjectCommand).resolves({
        Body: generateStream(mockImage),
        ContentType: 'image/jpeg'
      })
      // Act
      const result = await handler(event);
      const expectedResult = {
        statusCode: 500,
        isBase64Encoded: false,
        headers: {
          'Access-Control-Allow-Methods': 'GET',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Credentials': true,
          "Cache-Control": "max-age=0, must-revalidate",
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: 'Internal error. Please contact the system administrator.',
          code: 'InternalError',
          status: 500
        })
      };
      // Assert
      expect(s3_mock).toHaveReceivedCommandWith(GetObjectCommand, {Bucket: 'source-bucket', Key: 'test.jpg'});
      expect(result).toEqual(expectedResult);
    });
    it('003/should return the default fallback image when an error occurs if the default fallback image is enabled', async function () {
      // Arrange
      process.env.ENABLE_DEFAULT_FALLBACK_IMAGE = 'Yes';
      process.env.DEFAULT_FALLBACK_IMAGE_BUCKET = 'fallback-image-bucket';
      process.env.DEFAULT_FALLBACK_IMAGE_KEY = 'fallback-image.png';
      process.env.CORS_ENABLED = 'Yes';
      process.env.CORS_ORIGIN = '*';
      const event = {
        path: '/test.jpg'
      };
      // Mock
      let error: any = {code: 500, message: 'UnknownError'};
      s3_mock.on(GetObjectCommand).rejectsOnce(error).resolvesOnce({
        Body: generateStream(mockFallbackImage),
        ContentType: 'image/png'
      });
      // Act
      const result = await handler(event);
      const expectedResult = {
        statusCode: 500,
        isBase64Encoded: true,
        headers: {
          'Access-Control-Allow-Methods': 'GET',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Credentials': true,
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'image/png',
          "Cache-Control": "public, max-age=31536000, immutable",
          'Last-Modified': undefined
        },
        body: mockFallbackImage.toString('base64')
      };
      // Assert
      expect(s3_mock).toHaveReceivedNthCommandWith(1, GetObjectCommand, {Bucket: 'source-bucket', Key: 'test.jpg'});
      expect(s3_mock).toHaveReceivedNthCommandWith(2, GetObjectCommand,{
        Bucket: 'fallback-image-bucket',
        Key: 'fallback-image.png'
      });
      expect(result).toEqual(expectedResult);
    });
    it('004/should return an error JSON when getting the default fallback image fails if the default fallback image is enabled', async function () {
      // Arrange
      const event = {
        path: '/test.jpg'
      };
      // Mock

      let error: any = {
        code: 'NoSuchKey',
        status: 404,
        message: 'NoSuchKey error happened.'
      };
      s3_mock.on(GetObjectCommand).rejects(error);
      // Act
      const result = await handler(event);
      const expectedResult = {
        statusCode: 404,
        isBase64Encoded: false,
        headers: {
          'Access-Control-Allow-Methods': 'GET',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Credentials': true,
          'Access-Control-Allow-Origin': '*',
          "Cache-Control": "public, max-age=60",
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 404,
          code: 'NoSuchKey',
          message: 'NoSuchKey error happened.'
        })
      };
      // Assert
      expect(s3_mock).toHaveReceivedNthCommandWith(1, GetObjectCommand, {Bucket: 'source-bucket', Key: 'test.jpg'});
      expect(s3_mock).toHaveReceivedNthCommandWith(2, GetObjectCommand, {
        Bucket: 'fallback-image-bucket',
        Key: 'fallback-image.png'
      });
      expect(result).toEqual(expectedResult);
    });
    it('005/should return an error JSON when the default fallback image key is not provided if the default fallback image is enabled', async function () {
      // Arrange
      process.env.DEFAULT_FALLBACK_IMAGE_KEY = '';
      const event = {
        path: '/test.jpg'
      };
      // Mock
      let error: any = {
        code: 'NoSuchKey',
        status: 404,
        message: 'NoSuchKey error happened.'
      };
      s3_mock.on(GetObjectCommand).rejects(error);
      // Act
      const result = await handler(event);
      const expectedResult = {
        statusCode: 404,
        isBase64Encoded: false,
        headers: {
          'Access-Control-Allow-Methods': 'GET',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Credentials': true,
          'Access-Control-Allow-Origin': '*',
          "Cache-Control": "public, max-age=60",
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 404,
          code: 'NoSuchKey',
          message: 'NoSuchKey error happened.'
        })
      };
      // Assert
      expect(s3_mock).toHaveReceivedCommandWith(GetObjectCommand, {Bucket: 'source-bucket', Key: 'test.jpg'});
      expect(result).toEqual(expectedResult);
    });
    it('006/should return an error JSON when the default fallback image bucket is not provided if the default fallback image is enabled', async function () {
      // Arrange
      process.env.DEFAULT_FALLBACK_IMAGE_BUCKET = '';
      const event = {
        path: '/test.jpg'
      };
      // Mock
      let error: any = {
        code: 'NoSuchKey',
        status: 404,
        message: 'NoSuchKey error happened.'
      };
      s3_mock.on(GetObjectCommand).rejects(error);
      // Act
      const result = await handler(event);
      const expectedResult = {
        statusCode: 404,
        isBase64Encoded: false,
        headers: {
          'Access-Control-Allow-Methods': 'GET',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Credentials': true,
          'Access-Control-Allow-Origin': '*',
          "Cache-Control": "public, max-age=60",
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 404,
          code: 'NoSuchKey',
          message: 'NoSuchKey error happened.'
        })
      };
      // Assert
      expect(s3_mock).toHaveReceivedCommandWith(GetObjectCommand, {Bucket: 'source-bucket', Key: 'test.jpg'});
      expect(result).toEqual(expectedResult);
    });
  });
  it('007/should return an error JSON when ALB request is failed', async function () {
    // Arrange
    const event = {
      path: '/test.jpg',
      requestContext: {
        elb: {}
      }
    };
    // Mock
    let error: any = {
      code: 'NoSuchKey',
      status: 404,
      message: 'NoSuchKey error happened.'
    };
    s3_mock.on(GetObjectCommand).rejects(error);
    // Act
    const result = await handler(event);
    const expectedResult = {
      statusCode: 404,
      isBase64Encoded: false,
      headers: {
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
        "Cache-Control": "public, max-age=60"
      },
      body: JSON.stringify({
        status: 404,
        code: 'NoSuchKey',
        message: 'NoSuchKey error happened.'
      })
    };
    // Assert
    expect(s3_mock).toHaveReceivedCommandWith(GetObjectCommand, {Bucket: 'source-bucket', Key: 'test.jpg'});
    expect(result).toEqual(expectedResult);
  })

  it('008/should return HTTP/410 Gone when content is expired', async function () {
    process.env.CORS_ENABLED = 'Yes';
    process.env.CORS_ORIGIN = '*';
    // Arrange
    const event = {
      path: '/test.jpg'
    };
    // Mock
    s3_mock.reset();

    s3_mock.on(GetObjectCommand).resolves({
      Body: generateStream(mockImage),
      ContentType: 'image/png',
      Expires: new Date('Fri, 15 Jan 2021 14:00:00 GMT')
    });
    // Act
    const result = await handler(event);
    const expectedResult = {
      statusCode: 410,
      isBase64Encoded: false,
      headers: {
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Credentials': true,
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=600',
      },
      body: '{"message":"HTTP/410. Content test.jpg has expired.","code":"Gone","status":410}'
    };
    // Assert
    expect(s3_mock).toHaveReceivedCommandWith(GetObjectCommand, {Bucket: 'source-bucket', Key: 'test.jpg'});
    expect(result).toEqual(expectedResult);
  })
  it('009/should set expired header and reduce max-age if content is about to expire', async function () {
    process.env.CORS_ENABLED = 'Yes';
    process.env.CORS_ORIGIN = '*';

    const realDateNow = Date.now.bind(global.Date);
    const date_now_fixture = 1610986782372;
    global.Date.now = () => date_now_fixture;

    // Arrange
    const event = {
      path: '/test.jpg'
    };
    // Mock
    s3_mock.reset()
    s3_mock.on(GetObjectCommand).resolves({
      Body: generateStream(mockImage),
      ContentType: 'image/png',
      Expires: new Date(date_now_fixture + 30999),
      ETag: '"foo"'
    })
    // Act
    const result = await handler(event);
    const expectedResult = {
      statusCode: 200,
      isBase64Encoded: true,
      headers: {
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Credentials': true,
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=30, immutable',
        Expires: new Date(date_now_fixture + 30999).toUTCString(),
        ETag: '"foo"'
      },
      body: mockImage.toString('base64')
    };
    // Assert
    expect(s3_mock).toHaveReceivedNthCommandWith(1, GetObjectCommand, {Bucket: 'source-bucket', Key: 'test.jpg'});
    expect(result).toEqual(expectedResult);
    global.Date.now = realDateNow;
  })
  it('010/should return gone if status code is in metadata', async function () {
    process.env.CORS_ENABLED = 'Yes';
    process.env.CORS_ORIGIN = '*';

    const realDateNow = Date.now.bind(global.Date);
    const date_now_fixture = 1610986782372;
    global.Date.now = () => date_now_fixture;

    // Arrange
    const event = {
      path: '/test.jpg'
    };
    // Mock
    s3_mock.reset();
    s3_mock.on(GetObjectCommand).resolves({
      Body: generateStream(mockImage),
      ContentType: 'image/png',
      ETag: '"foo"',
      Metadata: {
        'buzz-status-code': '410'
      }
    });
    // Act
    const result = await handler(event);
    const expectedResult = {
      statusCode: 410,
      body: JSON.stringify({"message": "HTTP/410. Content test.jpg has expired.", "code": "Gone", "status": 410}),
      headers: {
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Credentials': true,
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=600',
      },
      isBase64Encoded: false,
    };
    // Assert
    expect(s3_mock).toHaveReceivedNthCommandWith(1, GetObjectCommand, {Bucket: 'source-bucket', Key: 'test.jpg'});

    expect(result).toEqual(expectedResult);
    global.Date.now = realDateNow;
  })
});
