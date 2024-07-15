// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { S3 } from '@aws-sdk/client-s3';
import { ImageFormatTypes, ImageRequestInfo, RequestTypes } from '../../src/lib';
import { ImageRequest } from '../../src/image-request';

const imageRequestInfo: ImageRequestInfo = {
  bucket: 'bucket',
  key: 'key',
  requestType: RequestTypes.THUMBOR,
  edits: { png: { quality: 80 } },
  originalImage: Buffer.from('image'),
  outputFormat: ImageFormatTypes.JPEG,
};

describe('fixQuality', () => {
  const s3Client = new S3();

  beforeEach(() => {
    jest.clearAllMocks();
    imageRequestInfo.edits = { png: { quality: 80 } };
  });

  it('Should map correct edits with quality key to edits if output in edits differs from output format in request ', () => {
    // Arrange
    const imageRequest = new ImageRequest(s3Client);

    // Act
    imageRequest['fixQuality'](imageRequestInfo);

    // Assert
    expect(imageRequestInfo.edits).toEqual(expect.objectContaining({ jpeg: { quality: 80 } }));
    expect(imageRequestInfo.edits.png).toBe(undefined);
  });

  it('should not map edits with quality key if not output format is not a supported type', () => {
    // Arrange
    const imageRequest = new ImageRequest(s3Client);
    imageRequestInfo.outputFormat = 'pdf' as ImageFormatTypes;

    // Act
    imageRequest['fixQuality'](imageRequestInfo);

    // Assert
    expect(imageRequestInfo.edits).toEqual(expect.objectContaining({ png: { quality: 80 } }));
  });

  it('should not map edits with quality key if not output format is the same as the quality key', () => {
    // Arrange
    const imageRequest = new ImageRequest(s3Client);
    imageRequestInfo.outputFormat = ImageFormatTypes.PNG;

    // Act
    imageRequest['fixQuality'](imageRequestInfo);

    // Assert
    expect(imageRequestInfo.edits).toEqual(expect.objectContaining({ png: { quality: 80 } }));
  });

  it('should not map edits with quality key if the request is of default type', () => {
    // Arrange
    const imageRequest = new ImageRequest(s3Client);
    imageRequestInfo.outputFormat = ImageFormatTypes.JPEG;
    imageRequestInfo.requestType = RequestTypes.DEFAULT;

    // Act
    imageRequest['fixQuality'](imageRequestInfo);

    // Assert
    expect(imageRequestInfo.edits).toEqual(expect.objectContaining({ png: { quality: 80 } }));
  });

  it('should not map edits with quality key if the request is default type', () => {
    // Arrange
    const imageRequest = new ImageRequest(s3Client);
    imageRequestInfo.outputFormat = ImageFormatTypes.JPEG;
    imageRequestInfo.requestType = RequestTypes.DEFAULT;

    // Act
    imageRequest['fixQuality'](imageRequestInfo);

    // Assert
    expect(imageRequestInfo.edits).toEqual(expect.objectContaining({ png: { quality: 80 } }));
  });

  it('should not map edits with quality key if the request if there is no output format', () => {
    // Arrange
    const imageRequest = new ImageRequest(s3Client);
    delete imageRequestInfo.outputFormat;

    // Act
    imageRequest['fixQuality'](imageRequestInfo);

    // Assert
    expect(imageRequestInfo.edits).toEqual(expect.objectContaining({ png: { quality: 80 } }));
  });
});
