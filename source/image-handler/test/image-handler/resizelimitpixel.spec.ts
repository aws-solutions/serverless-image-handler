// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import Rekognition from "aws-sdk/clients/rekognition";
import S3 from "aws-sdk/clients/s3";
import sharp from "sharp";
import fs from "fs";

import { ImageHandler } from "../../image-handler";
import { ImageEdits } from "../../lib";

const s3Client = new S3();
const rekognitionClient = new Rekognition();
const LARGE_IMAGE_SIZE = 16364 * 16364;

describe("resizelimitpixel", () => {
  it("Should pass if resize width and height are provided as string number to the function", async () => {
    const originalImage = fs.readFileSync("./test/image/aws_logo.png");
    let limitFlag = false;
    let image = sharp(originalImage, { failOnError: false, limitInputPixels: limitFlag }).withMetadata();
    //Get source image metadata
    const metadata = await image.metadata();
    const pixel = metadata.width * metadata.height;
    console.log("Source Image Pixel  Size: " + pixel + " pixels");
    // To avoid unwanted resource consumption, check and set the pixel limit to true for images with width and height less than 16364 * 16364.
    // Reinstantiate the Image with low pixel limit.
    if (pixel <= LARGE_IMAGE_SIZE) {
      limitFlag = true;
      image = sharp(originalImage, { failOnError: false, limitInputPixels: limitFlag }).withMetadata();
    }
    const edits: ImageEdits = { resize: { width: "99.1", height: "99.9" } };
    // Act
    const imageHandler = new ImageHandler(s3Client, rekognitionClient);
    const result = await imageHandler.applyEdits(image, edits, false);

    // Assert
    const resultBuffer = await result.toBuffer();
    const convertedImage = await sharp(originalImage, { failOnError: false, limitInputPixels: limitFlag })
      .withMetadata()
      .resize({ width: 99, height: 100 })
      .toBuffer();
    expect(resultBuffer).toEqual(convertedImage);
  });
});
