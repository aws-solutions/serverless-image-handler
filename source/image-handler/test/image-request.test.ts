// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { ImageRequest } from "../src/image-request";
import {sdkStreamMixin} from "@aws-sdk/util-stream-node";

import { beforeEach, describe, it } from 'vitest'
import { mockClient } from 'aws-sdk-client-mock'
import {GetObjectCommand, S3} from "@aws-sdk/client-s3";
import {Readable} from "stream";
import {APIGatewayEventRequestContextV2, APIGatewayProxyEventV2} from "aws-lambda";

const {expect} = require("expect");
(globalThis as any).expect = expect;
require("aws-sdk-client-mock-jest");

const s3 = new S3();
const s3_mock = mockClient(S3);
let event: APIGatewayProxyEventV2;

function generateStream(data: string) {
  const stream = Readable.from(Buffer.from(data))
  return sdkStreamMixin(stream)
}

// ----------------------------------------------------------------------------
// [async] setup()
// ----------------------------------------------------------------------------
describe('setup()', function () {
  beforeEach(() => {
    s3_mock.reset();

    const context: APIGatewayEventRequestContextV2 = {
      accountId: "",
      apiId: "",
      domainName: "",
      domainPrefix: "",
      http: {method: "", path: "", protocol: "", sourceIp: "", userAgent: ""},
      requestId: "",
      routeKey: "",
      stage: "",
      time: "",
      timeEpoch: 0
    }
    event = {
      headers: {}, isBase64Encoded: false, rawQueryString: "", requestContext: context, routeKey: "", version: "",
      rawPath : ""
    }
  });

  describe('003/thumborImageRequest', function () {
    it('Should pass when a thumbor image request is provided and populate the ImageRequest object with the proper values', async function () {
      // Arrange
      event.rawPath = "/filters:grayscale()/test-image-001.jpg";
      process.env = {
        SOURCE_BUCKETS: "allowedBucket001, allowedBucket002"
      }
      // Mock
      s3_mock.on(GetObjectCommand).resolves({Body: generateStream('SampleImageContent\n')});
      // Act
      const imageRequest = new ImageRequest(s3);
      const result =  await imageRequest.setup(event);
      const expectedResult = {
        requestType: 'Thumbor',
        bucket: 'allowedBucket001',
        key: 'test-image-001.jpg',
        edits: {grayscale: true},
        originalImage: Buffer.from('SampleImageContent\n'),
        CacheControl: 'max-age=31536000, immutable',
        ContentType: 'image',
        cropping: {}
      }
      // Assert
      expect(s3_mock).toHaveReceivedCommandWith(GetObjectCommand, {Bucket: 'allowedBucket001', Key: 'test-image-001.jpg'});
      expect(result).toEqual(expectedResult);
    });
  });
  describe('004/thumborImageRequest/quality', function () {
    it('Should pass when a thumbor image request is provided and populate the ImageRequest object with the proper values', async function () {
      // Arrange
      event.rawPath = "/filters:format(png)/filters:quality(50)/test-image-001.jpg";
      process.env = {
        SOURCE_BUCKETS: "allowedBucket001, allowedBucket002"
      }
      // Mock
      s3_mock.on(GetObjectCommand).resolves({Body: generateStream('SampleImageContent\n')});
      // Act
      const imageRequest = new ImageRequest(s3);
      const result = await imageRequest.setup(event);
      const expectedResult = {
        requestType: 'Thumbor',
        bucket: 'allowedBucket001',
        key: 'test-image-001.jpg',
        edits: {
          toFormat: 'png',
          png: {quality: 50}
        },
        originalImage: Buffer.from('SampleImageContent\n'),
        CacheControl: 'max-age=31536000, immutable',
        outputFormat: 'png',
        ContentType: 'image/png',
        cropping: {}
      }
      // Assert
      expect(s3_mock).toHaveReceivedCommandWith(GetObjectCommand, {Bucket: 'allowedBucket001', Key: 'test-image-001.jpg'});
      expect(result).toEqual(expectedResult);
    });
  });
describe('004.1/path_with_coordinates', function () {
    it('Should pass when a thumbor image request is provided and populate the ImageRequest object with the proper values', async function () {
      // Arrange
      event.rawPath = "/2021/07/Jj0nKOg0x7Cw/test-image-001.jpg";
      process.env = {
        SOURCE_BUCKETS: "allowedBucket001"
      }
      // Mock
      s3_mock.on(GetObjectCommand).resolves({Body: generateStream('SampleImageContent\n')});
      // Act
      const imageRequest = new ImageRequest(s3);
      const result = await imageRequest.setup(event);
      const expectedResult = {
        requestType: 'Thumbor',
        bucket: 'allowedBucket001',
        key: '2021/07/Jj0nKOg0x7Cw/image.jpg',
        edits: {},
        originalImage: Buffer.from('SampleImageContent\n'),
        CacheControl: 'max-age=31536000, immutable',
        ContentType: 'image',
        cropping: {}
      }
      // Assert
      expect(s3_mock).toHaveReceivedCommandWith(GetObjectCommand, {Bucket: 'allowedBucket001', Key: '2021/07/Jj0nKOg0x7Cw/image.jpg'});
      expect(result).toEqual(expectedResult);
    });
  });

  describe('008/SVGSupport', function () {
    beforeEach(() => {
      process.env.ENABLE_SIGNATURE = 'No';
      process.env.SOURCE_BUCKETS = 'validBucket';
    });
    it('Should return SVG image when no edit is provided for the SVG image', async function () {
      // Arrange
      event.rawPath = '/image.svg';
      // Mock
      s3_mock.on(GetObjectCommand).resolves({ContentType: 'image/svg+xml', Body: generateStream('SampleImageContent\n')});
      // Act
      const imageRequest = new ImageRequest(s3);
      const result =  await imageRequest.setup(event);
      const expectedResult = {
        requestType: 'Thumbor',
        bucket: 'validBucket',
        key: 'image.svg',
        edits: {},
        originalImage: Buffer.from('SampleImageContent\n'),
        CacheControl: 'max-age=31536000, immutable',
        ContentType: 'image/svg+xml',
        cropping: {}
      };
      // Assert
      expect(s3_mock).toHaveReceivedCommandWith(GetObjectCommand, {Bucket: 'validBucket', Key: 'image.svg'});
      expect(result).toEqual(expectedResult);
    });
    it('Should return WebP image when there are any edits and no output is specified for the SVG image', async function () {
      // Arrange
      event.rawPath = '/100x100/image.svg';
      // Mock
      s3_mock.on(GetObjectCommand).resolves({
        ContentType: 'image/svg+xml',
        Body: generateStream('SampleImageContent\n')});
      // Act
      const imageRequest = new ImageRequest(s3);
      const result = await imageRequest.setup(event);
      const expectedResult = {
        requestType: 'Thumbor',
        bucket: 'validBucket',
        key: 'image.svg',
        edits: {resize: {width: 100, height: 100}},
        outputFormat: 'png',
        originalImage: Buffer.from('SampleImageContent\n'),
        CacheControl: 'max-age=31536000, immutable',
        ContentType: 'image/png',
        cropping: {}
      };
      // Assert
      expect(s3_mock).toHaveReceivedCommandWith(GetObjectCommand, {Bucket: 'validBucket', Key: 'image.svg'});
      expect(result).toEqual(expectedResult);
    });
    it('Should return JPG image when output is specified to JPG for the SVG image', async function () {
      // Arrange
      event.rawPath = '/filters:format(jpg)/image.svg';
      // Mock
      s3_mock.on(GetObjectCommand).resolves({  ContentType: 'image/svg+xml',Body: generateStream('SampleImageContent\n')});
      // Act
      const imageRequest = new ImageRequest(s3);
      const result = await imageRequest.setup(event);
      const expectedResult = {
        requestType: 'Thumbor',
        bucket: 'validBucket',
        key: 'image.svg',
        edits: {toFormat: 'jpeg'},
        outputFormat: 'jpeg',
        originalImage: Buffer.from('SampleImageContent\n'),
        CacheControl: 'max-age=31536000, immutable',
        ContentType: 'image/jpeg',
        cropping: {}
      };
      // Assert
      expect(s3_mock).toHaveReceivedCommandWith(GetObjectCommand, {Bucket: 'validBucket', Key: 'image.svg'});
      expect(result).toEqual(expectedResult);
    });
    it('Should return Avif image when output is specified.', async function () {
      // Arrange
      process.env.AUTO_WEBP = "Yes"
      event.rawPath = '/filters:format(avif)/image.png';
      // Mock
      s3_mock.on(GetObjectCommand).resolves({  ContentType: 'image/png',Body: generateStream('SampleImageContent\n')});

      // Act
      const imageRequest = new ImageRequest(s3);
      const result = await imageRequest.setup(event);
      const expectedResult = {
        requestType: 'Thumbor',
        bucket: 'validBucket',
        key: 'image.png',
        edits: {toFormat: 'avif'},
        outputFormat: 'avif',
        originalImage: Buffer.from('SampleImageContent\n'),
        CacheControl: 'max-age=31536000, immutable',
        ContentType: 'image/avif',
        cropping: {}
      };
      // Assert
      expect(s3_mock).toHaveReceivedCommandWith(GetObjectCommand, {Bucket: 'validBucket', Key: 'image.png'});
      expect(result).toEqual(expectedResult);
    });
  });
});
// ----------------------------------------------------------------------------
// getOriginalImage()
// ----------------------------------------------------------------------------
describe('getOriginalImage()', function () {
  beforeEach(() => {
   s3_mock.reset();
  });

  describe('001/imageExists', function () {
    it('Should pass if the proper bucket name and key are supplied, simulating an image file that can be retrieved', async function () {
      // Mock
      s3_mock.on(GetObjectCommand).resolves({Body: generateStream('SampleImageContent\n')});

      // Act
      const imageRequest = new ImageRequest(s3);
      const result = await imageRequest.getOriginalImage('validBucket', 'validKey');
      // Assert
      expect(s3_mock).toHaveReceivedCommandWith(GetObjectCommand, {Bucket: 'validBucket', Key: 'validKey'});
      expect(result).toEqual(Buffer.from('SampleImageContent\n'));
    });
  });
  describe('002/imageDoesNotExist', function () {
    it('Should throw an error if an invalid bucket or key name is provided, simulating a non-existant original image', async function () {
      // Mock
      s3_mock.on(GetObjectCommand).resolves(Promise.reject({
        code: 'NoSuchKey',
        message: 'SimulatedException'
      }));
      // Act
      const imageRequest = new ImageRequest(s3);
      // Assert
      try {
        await imageRequest.getOriginalImage('invalidBucket', 'invalidKey');
      } catch (error: any) {
        expect(s3_mock).toHaveReceivedCommandWith(GetObjectCommand, {Bucket: 'invalidBucket', Key: 'invalidKey'});

        expect(error.status).toEqual(404);
      }
    });
  });
  describe('003/unknownError', function () {
    it('Should throw an error if an unkown problem happens when getting an object', async function () {
      // Mock
      s3_mock.on(GetObjectCommand).resolves(Promise.reject({
        code: 'InternalServerError',
        message: 'SimulatedException'
      }));
      // Act
      const imageRequest = new ImageRequest(s3);
      // Assert
      try {
        await imageRequest.getOriginalImage('invalidBucket', 'invalidKey');
      } catch (error: any) {
        expect(s3_mock).toHaveReceivedCommandWith(GetObjectCommand, {Bucket: 'invalidBucket', Key: 'invalidKey'});
        expect(error.status).toEqual(500);
      }
    });
  });
});

// ----------------------------------------------------------------------------
// parseImageBucket()
// ----------------------------------------------------------------------------
describe('parseImageBucket()', function () {
  describe('004/thumborRequestType', function () {
    it('Should pass if there is at least one SOURCE_BUCKET specified that can be used as the default for Thumbor requests', function () {
      // Arrange
      event.rawPath = "/filters:grayscale()/test-image-001.jpg";
      process.env = {
        SOURCE_BUCKETS: "allowedBucket001, allowedBucket002"
      }
      // Act
      const imageRequest = new ImageRequest(s3);
      const result = imageRequest.parseImageBucket(event, 'Thumbor');
      // Assert
      const expectedResult = 'allowedBucket001';
      expect(result).toEqual(expectedResult);
    });
  });
  describe('005/customRequestType', function () {
    it('Should pass if there is at least one SOURCE_BUCKET specified that can be used as the default for Custom requests', function () {
      // Arrange
      event.rawPath = "/filters:grayscale()/test-image-001.jpg";
      process.env = {
        SOURCE_BUCKETS: "allowedBucket001, allowedBucket002"
      }
      // Act
      const imageRequest = new ImageRequest(s3);
      const result = imageRequest.parseImageBucket(event, 'Custom');
      // Assert
      const expectedResult = 'allowedBucket001';
      expect(result).toEqual(expectedResult);
    });
  });
  describe('006/invalidRequestType', function () {
    it('Should pass if there is at least one SOURCE_BUCKET specified that can be used as the default for Custom requests', function () {
      // Arrange
      event.rawPath = "/filters:grayscale()/test-image-001.jpg";
      process.env = {
        SOURCE_BUCKETS: "allowedBucket001, allowedBucket002"
      }
      // Act
      const imageRequest = new ImageRequest(s3);
      // Assert
      try {
        imageRequest.parseImageBucket(event, "");
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
describe('parseImageEdits()', function () {
  describe('002/thumborRequestType', function () {
    it('Should pass if the proper result is returned for a sample thumbor-type image request', function () {
      // Arrange
      event.rawPath = '/filters:rotate(90)/filters:grayscale()/thumbor-image.jpg';
      // Act
      const imageRequest = new ImageRequest(s3);
      const result = imageRequest.parseImageEdits(event, 'Thumbor');
      // Assert
      const expectedResult = {
        rotate: 90,
        grayscale: true
      }
      expect(result).toEqual(expectedResult);
    });
  });
  describe('003/thumborRequestCropping', function () {
    it('Should pass when a thumbor image request is provided and populate the ImageRequest object with the proper values for cropping', async function () {
      // Arrange
      event.rawPath = "/0x1:200x201/fit-in/300x400/test-image-001.jpg";
      process.env = {
        SOURCE_BUCKETS: "allowedBucket001, allowedBucket002"
      }
      // Mock
      s3_mock.on(GetObjectCommand).resolves({Body: generateStream('SampleImageContent\n')});

      // Act
      const imageRequest = new ImageRequest(s3);
      const result = await imageRequest.setup(event);
      const expectedResult = {
        requestType: 'Thumbor',
        bucket: 'allowedBucket001',
        key: 'test-image-001.jpg',
        edits: {
          resize: {
            fit: "inside",
            width: 300,
            height: 400
          }
        },
        cropping: {
          left: 0,
          top: 1,
          width: 200,
          height: 201
        },
        originalImage: Buffer.from('SampleImageContent\n'),
        CacheControl: 'max-age=31536000, immutable',
        ContentType: 'image'
      }
      // Assert
      expect(s3_mock).toHaveReceivedCommandWith(GetObjectCommand, {Bucket: 'allowedBucket001', Key: 'test-image-001.jpg'});

      expect(result).toEqual(expectedResult);
    });
  });
  describe('004/thumborRequestRoundCrop', function () {
    it('Should pass when a thumbor image request is provided and populate the ImageRequest object with the proper values for roundCrop', async function () {
      // Arrange
      event.rawPath = "/filters:roundCrop(1x2:3x4)/test-image-001.jpg";
      process.env = {
        SOURCE_BUCKETS: "allowedBucket001, allowedBucket002"
      }
      // Mock
      s3_mock.on(GetObjectCommand).resolves({Body: generateStream('SampleImageContent\n')});

      // Act
      const imageRequest = new ImageRequest(s3);
      const result =  await imageRequest.setup(event);
      const expectedResult = {
        requestType: 'Thumbor',
        bucket: 'allowedBucket001',
        key: 'test-image-001.jpg',
        edits: {
          roundCrop: {
            left: 1,
            top: 2,
            rx: 3,
            ry: 4
          }
        },
        originalImage: Buffer.from('SampleImageContent\n'),
        CacheControl: 'max-age=31536000, immutable',
        ContentType: 'image',
        cropping: {}
      }
      // Assert
      expect(s3_mock).toHaveReceivedCommandWith(GetObjectCommand, {Bucket: 'allowedBucket001', Key: 'test-image-001.jpg'});

      expect(result).toEqual(expectedResult);
    });
  });
  describe('006/customRequestType', function () {
    it('Should throw an error if a requestType is not specified and/or the image edits cannot be parsed', function () {
      // Arrange
      event.rawPath = '/filters:rotate(90)/filters:grayscale()/other-image.jpg';
      // Act
      const imageRequest = new ImageRequest(s3);
      // Assert
      try {
        imageRequest.parseImageEdits(event, "");
      } catch (error) {
        expect(error).toEqual({
          status: 400,
          code: 'ImageEdits::CannotParseEdits',
          message: 'The edits you provided could not be parsed. Please check the syntax of your request and refer to the documentation for additional guidance.'
        });
      }
    });
  });
  describe('007/ignorablePathPrefixes', () => {
    it('Should ignore `/author/` prefixes when requesting images so that those can be transparently used for blocking via robots.txt', async function () {
      // Arrange
      event.rawPath = "/authors/test-image-001.jpg";
      process.env = {
        SOURCE_BUCKETS: "allowedBucket001"
      }
      // Mock
      s3_mock.on(GetObjectCommand).resolves({Body: generateStream('SampleImageContent\n')});
      // Act
      const imageRequest = new ImageRequest(s3);
      const result =   await imageRequest.setup(event);
      const expectedResult = {
        requestType: 'Thumbor',
        bucket: 'allowedBucket001',
        key: 'test-image-001.jpg',
        edits: {},
        originalImage: Buffer.from('SampleImageContent\n'),
        CacheControl: 'max-age=31536000, immutable',
        ContentType: 'image',
        cropping: {}
      }
      // Assert
      expect(s3_mock).toHaveReceivedCommandWith(GetObjectCommand, {Bucket: 'allowedBucket001', Key: 'test-image-001.jpg'});
      expect(result).toEqual(expectedResult);
    });
  });
});

// ----------------------------------------------------------------------------
// parseImageKey()
// ----------------------------------------------------------------------------
describe('parseImageKey()', function () {
  describe('003/thumborRequestType', function () {
    it('Should pass if an image key value is provided in the thumbor request format', function () {
      // Arrange
      event.rawPath = '/filters:rotate(90)/filters:grayscale()/thumbor-image.jpg';
      // Act
      const imageRequest = new ImageRequest(s3);
      const result = imageRequest.parseImageKey(event, 'Thumbor');
      // Assert
      const expectedResult = 'thumbor-image.jpg';
      expect(result).toEqual(expectedResult);
    });
  });
  describe('005/elseCondition', function () {
    it('Should throw an error if an unrecognized requestType is passed into the function as a parameter', function () {
      // Arrange
      event.rawPath = '/filters:rotate(90)/filters:grayscale()/other-image.jpg';
      // Act
      const imageRequest = new ImageRequest(s3);
      // Assert
      try {
        imageRequest.parseImageKey(event, "");
      } catch (error) {
        expect(error).toEqual({
          status: 404,
          code: 'ImageEdits::CannotFindImage',
          message: 'The image you specified could not be found. Please check your request syntax as well as the bucket you specified to ensure it exists.'
        });
      }
    });
  });
  describe('006/alterKeyForMasterImage', function () {
    it('Should pass when a when the key was replaced with the default image.ext when using our pattern', async function () {
      // Arrange
      event.rawPath = "2021/04/media_id/test-image-001.jpg";
      process.env = {
        SOURCE_BUCKETS: "allowedBucket001"
      }
      // Mock
      s3_mock.on(GetObjectCommand).resolves({Body: generateStream('SampleImageContent\n')});
      // Act
      const imageRequest = new ImageRequest(s3);
      const result =  await imageRequest.setup(event);
      const expectedResult = {
        requestType: 'Thumbor',
        bucket: 'allowedBucket001',
        key: '2021/04/media_id/image.jpg',
        edits: {},
        originalImage: Buffer.from('SampleImageContent\n'),
        CacheControl: 'max-age=31536000, immutable',
        ContentType: 'image',
        cropping: {},
      }
      // Assert
      expect(s3_mock).toHaveReceivedCommandWith(GetObjectCommand, {Bucket: 'allowedBucket001', Key: '2021/04/media_id/image.jpg'});

      expect(result).toEqual(expectedResult);
    });
  });
});

// ----------------------------------------------------------------------------
// parseRequestType()
// ----------------------------------------------------------------------------
describe('parseRequestType()', function () {
  describe('002/thumborRequestType', function () {
    it('Should pass if the method detects a thumbor request', function () {
      // Arrange
      event.rawPath = '/unsafe/filters:brightness(10):contrast(30)/https://upload.wikimedia.org/wikipedia/commons/thumb/7/79/Coffee_berries_1.jpg/1200px-Coffee_berries_1.jpg';
      process.env = {};
      // Act
      const imageRequest = new ImageRequest(s3);
      const result = imageRequest.parseRequestType(event);
      // Assert
      const expectedResult = 'Thumbor';
      expect(result).toEqual(expectedResult);
    });
  });
  describe('004/elseCondition', function () {
    it('Should throw an error if the method cannot determine the request type based on the three groups given', function () {
      // Arrange
      event.rawPath = '12x12e24d234r2ewxsad123d34r';
      process.env = {};
      // Act
      const imageRequest = new ImageRequest(s3);
      // Assert
      try {
        imageRequest.parseRequestType(event);
      } catch (error) {
        expect(error).toEqual({
          status: 400,
          code: 'RequestTypeError',
          message: 'The type of request you are making could not be processed. Please ensure that your original image is of a supported file type (jpg, png, tiff, webp, svg, gif, avif) and that your image request is provided in the correct syntax. Refer to the documentation for additional guidance on forming image requests.'
        });
      }
    });
  });
});

// ----------------------------------------------------------------------------
// getAllowedSourceBuckets()
// ----------------------------------------------------------------------------
describe('getAllowedSourceBuckets()', function () {
  describe('001/sourceBucketsSpecified', function () {
    it('Should pass if the SOURCE_BUCKETS environment variable is not empty and contains valid inputs', function () {
      // Arrange
      process.env = {
        SOURCE_BUCKETS: 'allowedBucket001, allowedBucket002'
      }
      // Act
      const imageRequest = new ImageRequest(s3);
      const result = imageRequest.getAllowedSourceBuckets();
      // Assert
      const expectedResult = ['allowedBucket001', 'allowedBucket002'];
      expect(result).toEqual(expectedResult);
    });
  });
  describe('002/noSourceBucketsSpecified', function () {
    it('Should throw an error if the SOURCE_BUCKETS environment variable is empty or does not contain valid values', function () {
      // Arrange
      process.env = {};
      // Act
      const imageRequest = new ImageRequest(s3);
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
      event.headers.accept = "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3";

      // Act
      const imageRequest = new ImageRequest(s3);
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
      event.headers.accept = "text/html,application/xhtml+xml,application/xml;q=0.9,image/apng,*/*;q=0.8,application/signed-exchange;v=b3";
      // Act
      const imageRequest = new ImageRequest(s3);
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
      event.headers.accept = "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3";
      // Act
      const imageRequest = new ImageRequest(s3);
      const result = imageRequest.getOutputFormat(event);
      // Assert
      expect(result).toEqual(null);
    });
  });
  describe('004/AutoWebPUnset', function () {
    it('Should pass if it returns null when AUTO_WEBP is not set with accepts header including webp', function () {
      // Arrange
      event.headers.accept = "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3";
      // Act
      const imageRequest = new ImageRequest(s3);
      const result = imageRequest.getOutputFormat(event);
      // Assert
      expect(result).toEqual(null);
    });
  });
  describe("003/AutoAVIFDisabled", function () {
    it("Should pass if it returns null when AUTO_AVIF is disabled with accepts header including avif", function () {
      // Arrange
      process.env = {
        AUTO_AVIF: "No",
      };
      event.headers.accept = "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/apng,*/*;q=0.8,application/signed-exchange;v=b3";
      // Act
      const imageRequest = new ImageRequest(s3);
      const result = imageRequest.getOutputFormat(event);
      // Assert
      expect(result).toEqual(null);
    });
  });
  describe("004/AutoAVIFUnset", function () {
    it("Should pass if it returns null when AUTO_AVIF is not set with accepts header including avif", function () {
      // Arrange
      event.headers.accept = "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/apng,*/*;q=0.8,application/signed-exchange;v=b3";
      // Act
      const imageRequest = new ImageRequest(s3);
      const result = imageRequest.getOutputFormat(event);
      // Assert
      expect(result).toEqual(null);
    });
  });
});
