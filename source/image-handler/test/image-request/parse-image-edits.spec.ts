// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { S3 } from '@aws-sdk/client-s3';
import { ImageRequest } from '../../src/image-request';
import { RequestTypes, StatusCodes } from '../../src/lib';
import { build_event } from '../helpers';

describe('parseImageEdits', () => {
  const s3Client = new S3();
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env = { ...OLD_ENV };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('Should pass if the proper result is returned for a sample base64-encoded image request', () => {
    // Arrange
    const event = build_event({
      rawPath: '/eyJlZGl0cyI6eyJncmF5c2NhbGUiOiJ0cnVlIiwicm90YXRlIjo5MCwiZmxpcCI6InRydWUifX0=',
    });

    // Act
    const imageRequest = new ImageRequest(s3Client);
    const result = imageRequest.parseImageEdits(event, RequestTypes.DEFAULT);

    // Assert
    const expectedResult = { grayscale: 'true', rotate: 90, flip: 'true' };
    expect(result).toEqual(expectedResult);
  });

  it('Should pass if the proper result is returned for a sample thumbor-type image request', () => {
    // Arrange
    const event = build_event({
      rawPath: '/filters:rotate(90)/filters:grayscale()/thumbor-image.jpg',
    });

    // Act
    const imageRequest = new ImageRequest(s3Client);
    const result = imageRequest.parseImageEdits(event, RequestTypes.THUMBOR);

    // Assert
    const expectedResult = { rotate: 90, grayscale: true };
    expect(result).toEqual(expectedResult);
  });

  it('Should pass if the proper result is returned for a sample custom-type image request', () => {
    // Arrange
    const event = build_event({
      rawPath: '/filters-rotate(90)/filters-grayscale()/thumbor-image.jpg',
    });

    process.env = {
      REWRITE_MATCH_PATTERN: '/(filters-)/gm',
      REWRITE_SUBSTITUTION: 'filters:',
    };

    // Act
    const imageRequest = new ImageRequest(s3Client);
    const result = imageRequest.parseImageEdits(event, RequestTypes.CUSTOM);

    // Assert
    const expectedResult = { rotate: 90, grayscale: true };
    expect(result).toEqual(expectedResult);
  });

  it('Should throw an error if a requestType is not specified and/or the image edits cannot be parsed', () => {
    // Arrange
    const event = build_event({
      rawPath: '/filters:rotate(90)/filters:grayscale()/other-image.jpg',
    });

    // Act
    const imageRequest = new ImageRequest(s3Client);

    // Assert
    try {
      imageRequest.parseImageEdits(event, undefined);
    } catch (error) {
      expect(error).toMatchObject({
        status: StatusCodes.BAD_REQUEST,
        code: 'ImageEdits::CannotParseEdits',
        message:
          'The edits you provided could not be parsed. Please check the syntax of your request and refer to the documentation for additional guidance.',
      });
    }
  });
});
