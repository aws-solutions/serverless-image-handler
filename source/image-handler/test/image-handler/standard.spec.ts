// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import { S3 } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import { ImageEdits, ImageRequestInfo, RequestTypes } from '../../src/lib';
import { ImageHandler } from '../../src/image-handler';

const s3Client = new S3();
const image = fs.readFileSync('./test/image/25x15.png');
const withMetatdataSpy = jest.spyOn(sharp.prototype, 'withMetadata');

describe('standard', () => {
  it('Should pass if a series of standard edits are provided to the function', async () => {
    // Arrange
    const originalImage = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    );
    const image = sharp(originalImage, { failOnError: false }).withMetadata();
    const edits: ImageEdits = { grayscale: true, flip: true };

    // Act
    const imageHandler = new ImageHandler(s3Client);
    const result = await imageHandler.applyEdits(image, edits, false);

    // Assert
    /* eslint-disable dot-notation */
    const expectedResult1 = result['options'].greyscale;
    const expectedResult2 = result['options'].flip;
    const combinedResults = expectedResult1 && expectedResult2;
    expect(combinedResults).toEqual(true);
  });
});

describe('instantiateSharpImage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Should not include metadata if the rotation is null', async () => {
    // Arrange
    const edits = {
      rotate: null,
    };
    const options = { faiOnError: false };
    const imageHandler = new ImageHandler(s3Client);

    // Act
    await imageHandler['instantiateSharpImage'](image, edits, options);

    //Assert
    expect(withMetatdataSpy).not.toHaveBeenCalled();
  });

  it('Should include metadata and not define orientation if the rotation is not null and orientation is not defined', async () => {
    // Arrange
    const edits = {
      rotate: undefined,
    };
    const options = { faiOnError: false };
    const imageHandler = new ImageHandler(s3Client);

    // Act
    await imageHandler['instantiateSharpImage'](image, edits, options);

    //Assert
    expect(withMetatdataSpy).toHaveBeenCalled();
    expect(withMetatdataSpy).not.toHaveBeenCalledWith(expect.objectContaining({ orientation: expect.anything }));
  });

  it('Should include orientation metadata if the rotation is defined in the metadata', async () => {
    // Arrange
    const edits = {
      rotate: undefined,
    };
    const options = { faiOnError: false };
    const modifiedImage = await sharp(image).withMetadata({ orientation: 1 }).toBuffer();
    const imageHandler = new ImageHandler(s3Client);

    // Act
    await imageHandler['instantiateSharpImage'](modifiedImage, edits, options);

    //Assert
    expect(withMetatdataSpy).toHaveBeenCalledWith({ orientation: 1 });
  });
});
