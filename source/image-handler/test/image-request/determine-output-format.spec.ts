// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { APIGatewayProxyEventV2 } from 'aws-lambda';
import * as Buffer from 'node:buffer';
import { S3 } from '@aws-sdk/client-s3';
import { ImageFormatTypes, ImageRequestInfo, RequestTypes } from '../../src/lib';
import { context } from '../helpers';
import { ImageRequest } from '../../src/image-request';
import { sdkStreamFromString } from '../mock';

const request: Record<string, any> = {
  bucket: 'bucket',
  key: 'key',
  edits: {
    roundCrop: true,
    resize: {
      width: 100,
      height: 100,
    },
  },
};

const createEvent = (request): APIGatewayProxyEventV2 => {
  return {
    headers: {},
    isBase64Encoded: false,
    rawQueryString: '',
    requestContext: context,
    routeKey: '',
    version: '',
    rawPath: btoa(JSON.stringify(request)),
  };
};

describe('determineOutputFormat', () => {
  const s3Client = new S3();

  it('Should map edits.toFormat to outputFormat in image request', () => {
    // Arrange
    const imageRequestInfo: ImageRequestInfo = {
      bucket: 'bucket',
      key: 'key',
      requestType: RequestTypes.THUMBOR,
      edits: { toFormat: ImageFormatTypes.PNG },
      originalImage: sdkStreamFromString('image'),
    };
    const imageRequest = new ImageRequest(s3Client);

    // Act
    imageRequest['determineOutputFormat'](imageRequestInfo, createEvent(request));

    // Assert
    expect(imageRequestInfo.outputFormat).toEqual(ImageFormatTypes.PNG);
  });

  it('Should map output format from edits to image request', () => {
    // Arrange
    const imageRequestInfo: ImageRequestInfo = {
      bucket: 'bucket',
      key: 'key',
      requestType: RequestTypes.DEFAULT,
      originalImage: sdkStreamFromString('image'),
    };
    request.outputFormat = ImageFormatTypes.PNG;
    const imageRequest = new ImageRequest(s3Client);

    // Act
    imageRequest['determineOutputFormat'](imageRequestInfo, createEvent(request));

    // Assert
    expect(imageRequestInfo.outputFormat).toEqual(ImageFormatTypes.PNG);
  });

  it('Should map reduction effort if included and output format is webp', () => {
    // Arrange
    const imageRequestInfo: ImageRequestInfo = {
      bucket: 'bucket',
      key: 'key',
      requestType: RequestTypes.DEFAULT,
      originalImage: sdkStreamFromString('image'),
    };
    request.outputFormat = ImageFormatTypes.WEBP;
    request.effort = 3;
    const imageRequest = new ImageRequest(s3Client);

    // Act
    imageRequest['determineOutputFormat'](imageRequestInfo, createEvent(request));

    // Assert
    expect(imageRequestInfo.outputFormat).toEqual(ImageFormatTypes.WEBP);
    expect(imageRequestInfo.effort).toEqual(3);
  });

  it('Should map default reduction effort if included but NaN and output format is webp', () => {
    // Arrange
    const imageRequestInfo: ImageRequestInfo = {
      bucket: 'bucket',
      key: 'key',
      requestType: RequestTypes.DEFAULT,
      originalImage: sdkStreamFromString('image'),
    };
    request.outputFormat = ImageFormatTypes.WEBP;
    request.effort = 'invalid';
    const imageRequest = new ImageRequest(s3Client);

    // Act
    imageRequest['determineOutputFormat'](imageRequestInfo, createEvent(request));

    // Assert
    expect(imageRequestInfo.outputFormat).toEqual(ImageFormatTypes.WEBP);
    expect(imageRequestInfo.effort).toEqual(4);
  });

  it('Should map default reduction effort if included > 6 and output format is webp', () => {
    // Arrange
    const imageRequestInfo: ImageRequestInfo = {
      bucket: 'bucket',
      key: 'key',
      requestType: RequestTypes.DEFAULT,
      originalImage: sdkStreamFromString('image'),
    };
    request.outputFormat = ImageFormatTypes.WEBP;
    request.effort = 7;
    const imageRequest = new ImageRequest(s3Client);

    // Act
    imageRequest['determineOutputFormat'](imageRequestInfo, createEvent(request));

    // Assert
    expect(imageRequestInfo.outputFormat).toEqual(ImageFormatTypes.WEBP);
    expect(imageRequestInfo.effort).toEqual(4);
  });

  it('Should map default reduction effort if included but < 0 and output format is webp', () => {
    // Arrange
    const imageRequestInfo: ImageRequestInfo = {
      bucket: 'bucket',
      key: 'key',
      requestType: RequestTypes.DEFAULT,
      originalImage: sdkStreamFromString('image'),
    };
    request.outputFormat = ImageFormatTypes.WEBP;
    request.effort = -1;
    const imageRequest = new ImageRequest(s3Client);

    // Act
    imageRequest['determineOutputFormat'](imageRequestInfo, createEvent(request));

    // Assert
    expect(imageRequestInfo.outputFormat).toEqual(ImageFormatTypes.WEBP);
    expect(imageRequestInfo.effort).toEqual(4);
  });

  it('Should map truncated reduction effort if included but has a decimal and output format is webp', () => {
    // Arrange
    const imageRequestInfo: ImageRequestInfo = {
      bucket: 'bucket',
      key: 'key',
      requestType: RequestTypes.DEFAULT,
      originalImage: sdkStreamFromString('image'),
    };
    request.outputFormat = ImageFormatTypes.WEBP;
    request.effort = 2.378;
    const imageRequest = new ImageRequest(s3Client);

    // Act
    imageRequest['determineOutputFormat'](imageRequestInfo, createEvent(request));

    // Assert
    expect(imageRequestInfo.outputFormat).toEqual(ImageFormatTypes.WEBP);
    expect(imageRequestInfo.effort).toEqual(2);
  });
});
