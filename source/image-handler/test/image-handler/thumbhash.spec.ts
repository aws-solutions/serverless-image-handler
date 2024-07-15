// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import { S3 } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import { ContentTypes, ImageEdits, ImageRequestInfo, RequestTypes } from '../../src/lib';
import { ImageHandler } from '../../src/image-handler';

const s3Client = new S3();
const image = fs.readFileSync('./test/image/25x15.png');

describe('standard', () => {
  it('Should include orientation metadata if the rotation is defined in the metadata', async () => {
    // Arrange
    const edits = {
      thumbhash: true,
    };
    const imageHandler = new ImageHandler(s3Client);
    const request: ImageRequestInfo = {
      requestType: RequestTypes.DEFAULT,
      contentType: ContentTypes.GIF,
      bucket: 'sample-bucket',
      key: 'sample-image-001.png',
      edits: { thumbhash: true },
      originalImage: image,
    };

    // Act
    const response = await imageHandler.process(request);
    const json = JSON.parse(Buffer.from(response, 'base64').toString('utf-8'));

    //Assert
    expect(json.base64).toBe('PwgCBICgtqh3eIh3d3gAAAAAAA==');
    expect(request.contentType).toBe(ContentTypes.JSON);
    expect(request.cacheControl).toContain('max-age=');
  });
});
