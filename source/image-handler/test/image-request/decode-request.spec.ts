// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import S3 from "aws-sdk/clients/s3";
import SecretsManager from "aws-sdk/clients/secretsmanager";

import { ImageRequest } from "../../image-request";
import { ImageHandlerEvent, StatusCodes } from "../../lib";
import { SecretProvider } from "../../secret-provider";
import { mockAwsS3 } from '../mock';

describe("decodeRequest", () => {
  const s3Client = new S3();
  const secretsManager = new SecretsManager();
  const secretProvider = new SecretProvider(secretsManager);

  it("Should pass if a valid base64-encoded path has been specified", () => {
    // Arrange
    const event = {
      path: "/eyJidWNrZXQiOiJidWNrZXQtbmFtZS1oZXJlIiwia2V5Ijoia2V5LW5hbWUtaGVyZSJ9",
    };

    // Act
    const imageRequest = new ImageRequest(s3Client, secretProvider);
    const result = imageRequest.decodeRequest(event);

    // Assert
    const expectedResult = {
      bucket: "bucket-name-here",
      key: "key-name-here",
    };
    expect(result).toEqual(expectedResult);
  });

  it("Should throw an error if a valid base64-encoded path has not been specified", () => {
    // Arrange
    const event = { path: "/someNonBase64EncodedContentHere" };

    // Act
    const imageRequest = new ImageRequest(s3Client, secretProvider);

    // Assert
    try {
      imageRequest.decodeRequest(event);
    } catch (error) {
      expect(error).toMatchObject({
        status: StatusCodes.BAD_REQUEST,
        code: "DecodeRequest::CannotDecodeRequest",
        message:
          "The image request you provided could not be decoded. Please check that your request is base64 encoded properly and refer to the documentation for additional guidance.",
      });
    }
  });

  it("Should throw an error if no path is specified at all", () => {
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
        code: "DecodeRequest::CannotReadPath",
        message:
          "The URL path you provided could not be read. Please ensure that it is properly formed according to the solution documentation.",
      });
    }
  });

  describe('expires', () => {
    const baseRequest = {
      bucket: 'test',
      requestType: 'Default',
      key: 'test.png',
    };
    const path = `/${Buffer.from(JSON.stringify(baseRequest)).toString('base64')}`;
    it.each([
      {
        expires: 'Thu, 01 Jan 1970 00:00:00 GMT',
        error: {
          code: 'ImageRequestExpired',
          message: 'Request has expired.',
          status: StatusCodes.FORBIDDEN,
        },
      },
      {
        expires: 'invalidKey',
        error: {
          code: 'ImageRequestExpiryFormat',
          message: 'Request has invalid expiry date.',
          status: StatusCodes.BAD_REQUEST,
        }
      }
    ] as { expires: ImageHandlerEvent['queryStringParameters']['expires'], error: object, }[])(
      "Should throw an error when $error.message",
      (async ({ error: expectedError, expires }) => {
        // Arrange
        const event: ImageHandlerEvent = {
          path,
          queryStringParameters: {
            expires,
          },
        };
        // Mock
        mockAwsS3.getObject.mockImplementationOnce(() => ({
          promise() {
            return Promise.resolve({ Body: Buffer.from('SampleImageContent\n') });
          }
        }));
        // Act
        const imageRequest = new ImageRequest(s3Client, secretProvider);
        await expect(imageRequest.setup(event)).rejects.toMatchObject(expectedError);
      })
    );
  });
});
