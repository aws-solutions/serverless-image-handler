// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

const mockS3 = jest.fn();
jest.mock('aws-sdk', () => {
  return {
    S3: jest.fn(() => ({
      getObject: mockS3
    })),
    Rekognition: jest.fn(),
    SecretsManager: jest.fn()
  };
});

// Import index.js
const index = require('../index.js');

describe('index', function () {
  // Arrange
  process.env.SOURCE_BUCKETS = 'source-bucket';
  const mockImage = Buffer.from('SampleImageContent\n');
  const mockFallbackImage = Buffer.from('SampleFallbackImageContent\n');

  describe('TC: Success', function () {
    beforeEach(() => {
      // Mock
      mockS3.mockImplementationOnce(() => {
        return {
          promise() {
            return Promise.resolve({
              Body: mockImage,
              ContentType: 'image/jpeg'
            });
          }
        };
      });
    })

    it('001/should return the image when there is no error', async function () {
      // Arrange
      const event = {
        path: '/test.jpg'
      };
      // Act
      const result = await index.handler(event);
      const expectedResult = {
        statusCode: 200,
        isBase64Encoded: true,
        headers: {
          'Access-Control-Allow-Methods': 'GET',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Credentials': true,
          'Content-Type': 'image/jpeg',
          'Expires': undefined,
          'Cache-Control': 'max-age=31536000,public',
          'Last-Modified': undefined
        },
        body: mockImage.toString('base64')
      };
      // Assert
      expect(mockS3).toHaveBeenCalledWith({Bucket: 'source-bucket', Key: 'test.jpg'});
      expect(result).toEqual(expectedResult);
    });
    it('002/should return the image with custom headers when custom headers are provided', async function () {
      // Arrange
      const event = {
        path: '/eyJidWNrZXQiOiJzb3VyY2UtYnVja2V0Iiwia2V5IjoidGVzdC5qcGciLCJoZWFkZXJzIjp7IkN1c3RvbS1IZWFkZXIiOiJDdXN0b21WYWx1ZSJ9fQ=='
      };
      // Act
      const result = await index.handler(event);
      const expectedResult = {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Methods': 'GET',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Credentials': true,
          'Content-Type': 'image/jpeg',
          'Expires': undefined,
          'Cache-Control': 'max-age=31536000,public',
          'Last-Modified': undefined,
          'Custom-Header': 'CustomValue'
        },
        body: mockImage.toString('base64'),
        isBase64Encoded: true
      };
      // Assert
      expect(mockS3).toHaveBeenCalledWith({Bucket: 'source-bucket', Key: 'test.jpg'});
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
      const result = await index.handler(event);
      const expectedResult = {
        statusCode: 200,
        isBase64Encoded: true,
        headers: {
          'Access-Control-Allow-Methods': 'GET',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Content-Type': 'image/jpeg',
          'Expires': undefined,
          'Cache-Control': 'max-age=31536000,public',
          'Last-Modified': undefined
        },
        body: mockImage.toString('base64')
      };
      // Assert
      expect(mockS3).toHaveBeenCalledWith({Bucket: 'source-bucket', Key: 'test.jpg'});
      expect(result).toEqual(expectedResult);
    });
  });

  describe('TC: Error', function () {
    it('001/should return an error JSON when an error occurs', async function () {
      // Arrange
      const event = {
        path: '/test.jpg'
      };
      // Mock
      mockS3.mockImplementationOnce(() => {
        return {
          promise() {
            return Promise.reject({
              code: 'NoSuchKey',
              status: 404,
              message: 'NoSuchKey error happened.'
            });
          }
        };
      });
      // Act
      const result = await index.handler(event);
      const expectedResult = {
        statusCode: 404,
        isBase64Encoded: false,
        headers: {
          'Access-Control-Allow-Methods': 'GET',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Credentials': true,
          "Cache-Control": "public, max-age=7200",
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 404,
          code: 'NoSuchKey',
          message: 'NoSuchKey error happened.'
        })
      };
      // Assert
      expect(mockS3).toHaveBeenCalledWith({Bucket: 'source-bucket', Key: 'test.jpg'});
      expect(result).toEqual(expectedResult);
    });
    it('002/should return 500 error when there is no error status in the error', async function () {
      // Arrange
      const event = {
        path: 'eyJidWNrZXQiOiJzb3VyY2UtYnVja2V0Iiwia2V5IjoidGVzdC5qcGciLCJlZGl0cyI6eyJ3cm9uZ0ZpbHRlciI6dHJ1ZX19'
      };
      // Mock
      mockS3.mockImplementationOnce(() => {
        return {
          promise() {
            return Promise.resolve({
              Body: mockImage,
              ContentType: 'image/jpeg'
            });
          }
        };
      });
      // Act
      const result = await index.handler(event);
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
      expect(mockS3).toHaveBeenCalledWith({Bucket: 'source-bucket', Key: 'test.jpg'});
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
      mockS3.mockReset();
      mockS3.mockImplementationOnce(() => {
        return {
          promise() {
            return Promise.reject('UnknownError');
          }
        };
      }).mockImplementationOnce(() => {
        return {
          promise() {
            return Promise.resolve({
              Body: mockFallbackImage,
              ContentType: 'image/png'
            });
          }
        };
      });
      // Act
      const result = await index.handler(event);
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
      expect(mockS3).toHaveBeenNthCalledWith(1, {Bucket: 'source-bucket', Key: 'test.jpg'});
      expect(mockS3).toHaveBeenNthCalledWith(2, {
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
      mockS3.mockReset();
      mockS3.mockImplementation(() => {
        return {
          promise() {
            return Promise.reject({
              code: 'NoSuchKey',
              status: 404,
              message: 'NoSuchKey error happened.'
            });
          }
        };
      });
      // Act
      const result = await index.handler(event);
      const expectedResult = {
        statusCode: 404,
        isBase64Encoded: false,
        headers: {
          'Access-Control-Allow-Methods': 'GET',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Credentials': true,
          'Access-Control-Allow-Origin': '*',
          "Cache-Control": "public, max-age=7200",
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 404,
          code: 'NoSuchKey',
          message: 'NoSuchKey error happened.'
        })
      };
      // Assert
      expect(mockS3).toHaveBeenNthCalledWith(1, {Bucket: 'source-bucket', Key: 'test.jpg'});
      expect(mockS3).toHaveBeenNthCalledWith(2, {
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
      mockS3.mockImplementationOnce(() => {
        return {
          promise() {
            return Promise.reject({
              code: 'NoSuchKey',
              status: 404,
              message: 'NoSuchKey error happened.'
            });
          }
        };
      });
      // Act
      const result = await index.handler(event);
      const expectedResult = {
        statusCode: 404,
        isBase64Encoded: false,
        headers: {
          'Access-Control-Allow-Methods': 'GET',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Credentials': true,
          'Access-Control-Allow-Origin': '*',
          "Cache-Control": "public, max-age=7200",
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 404,
          code: 'NoSuchKey',
          message: 'NoSuchKey error happened.'
        })
      };
      // Assert
      expect(mockS3).toHaveBeenCalledWith({Bucket: 'source-bucket', Key: 'test.jpg'});
      expect(result).toEqual(expectedResult);
    });
    it('006/should return an error JSON when the default fallback image bucket is not provided if the default fallback image is enabled', async function () {
      // Arrange
      process.env.DEFAULT_FALLBACK_IMAGE_BUCKET = '';
      const event = {
        path: '/test.jpg'
      };
      // Mock
      mockS3.mockImplementationOnce(() => {
        return {
          promise() {
            return Promise.reject({
              code: 'NoSuchKey',
              status: 404,
              message: 'NoSuchKey error happened.'
            });
          }
        };
      });
      // Act
      const result = await index.handler(event);
      const expectedResult = {
        statusCode: 404,
        isBase64Encoded: false,
        headers: {
          'Access-Control-Allow-Methods': 'GET',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Credentials': true,
          'Access-Control-Allow-Origin': '*',
          "Cache-Control": "public, max-age=7200",
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 404,
          code: 'NoSuchKey',
          message: 'NoSuchKey error happened.'
        })
      };
      // Assert
      expect(mockS3).toHaveBeenCalledWith({Bucket: 'source-bucket', Key: 'test.jpg'});
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
    mockS3.mockImplementationOnce(() => {
      return {
        promise() {
          return Promise.reject({
            code: 'NoSuchKey',
            status: 404,
            message: 'NoSuchKey error happened.'
          });
        }
      };
    });
    // Act
    const result = await index.handler(event);
    const expectedResult = {
      statusCode: 404,
      isBase64Encoded: false,
      headers: {
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
        "Cache-Control": "public, max-age=7200"
      },
      body: JSON.stringify({
        status: 404,
        code: 'NoSuchKey',
        message: 'NoSuchKey error happened.'
      })
    };
    // Assert
    expect(mockS3).toHaveBeenCalledWith({Bucket: 'source-bucket', Key: 'test.jpg'});
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
    mockS3.mockReset();
    mockS3.mockImplementationOnce(() => {
      return {
        promise() {
          return Promise.resolve({
            Body: mockImage,
            ContentType: 'image/png',
            Expires: 'Fri, 15 Jan 2021 14:00:00 GMT'
          });
        }
      }
    });
    // Act
    const result = await index.handler(event);
    const expectedResult = {
      statusCode: 410,
      isBase64Encoded: false,
      headers: {
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Credentials': true,
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=7200',
      },
      body: '{"message":"HTTP/410. Content test.jpg has expired.","code":"Gone","status":410}'
    };
    // Assert
    expect(mockS3).toHaveBeenNthCalledWith(1, {Bucket: 'source-bucket', Key: 'test.jpg'});
    expect(result).toEqual(expectedResult);
  })
  it('009/should set expired header and reduce max-age if content is about to expire', async function () {
    process.env.CORS_ENABLED = 'Yes';
    process.env.CORS_ORIGIN = '*';

    const realDateNow = Date.now.bind(global.Date);
    const date_now_fixture = 1610986782372;
    const dateNowStub = jest.fn(() => {
      return date_now_fixture;
    });
    global.Date.now = dateNowStub;

    // Arrange
    const event = {
      path: '/test.jpg'
    };
    // Mock
    mockS3.mockReset();
    mockS3.mockImplementationOnce(() => {
      return {
        promise() {
          return Promise.resolve({
            Body: mockImage,
            ContentType: 'image/png',
            Expires: new Date(date_now_fixture + 30999).toUTCString(),
            ETag: '"foo"'
          });
        }
      }
    });
    // Act
    const result = await index.handler(event);
    const expectedResult = {
      statusCode: 200,
      isBase64Encoded: true,
      headers: {
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Credentials': true,
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'image/png',
        'Cache-Control': 'max-age=30,public',
        Expires: new Date(date_now_fixture + 30999).toUTCString(),
        ETag: '"foo"'
      },
      body: mockImage.toString('base64')
    };
    // Assert
    expect(mockS3).toHaveBeenNthCalledWith(1, {Bucket: 'source-bucket', Key: 'test.jpg'});
    expect(result).toEqual(expectedResult);
    expect(dateNowStub).toHaveBeenCalled();
    global.Date.now = realDateNow;
  })
  it('010/should return gone if status code is in metadata', async function () {
    process.env.CORS_ENABLED = 'Yes';
    process.env.CORS_ORIGIN = '*';

    const realDateNow = Date.now.bind(global.Date);
    const date_now_fixture = 1610986782372;
    const dateNowStub = jest.fn(() => {
      return date_now_fixture;
    });
    global.Date.now = dateNowStub;

    // Arrange
    const event = {
      path: '/test.jpg'
    };
    // Mock
    mockS3.mockReset();
    mockS3.mockImplementationOnce(() => {
      return {
        promise() {
          return Promise.resolve({
            Body: mockImage,
            ContentType: 'image/png',
            ETag: '"foo"',
            Metadata: {
              'buzz-status-code': '410'
            }
          });
        }
      }
    });
    // Act
    const result = await index.handler(event);
    const expectedResult = {
      statusCode: 410,
      body: JSON.stringify({"message": "HTTP/410. Content test.jpg has expired.", "code": "Gone", "status": 410}),
      headers: {
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Credentials': true,
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=7200',
      },
      isBase64Encoded: false,
    };
    // Assert
    expect(mockS3).toHaveBeenNthCalledWith(1, {Bucket: 'source-bucket', Key: 'test.jpg'});

    expect(result).toEqual(expectedResult);
    expect(dateNowStub).toHaveBeenCalled();
    global.Date.now = realDateNow;
  })
});
