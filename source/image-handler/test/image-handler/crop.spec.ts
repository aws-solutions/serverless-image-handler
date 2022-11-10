// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

import Rekognition from "aws-sdk/clients/rekognition";
import S3 from "aws-sdk/clients/s3";
import sharp from "sharp";

import { ImageHandler } from "../../image-handler";
import { ImageEdits, StatusCodes } from "../../lib";

const s3Client = new S3();
const rekognitionClient = new Rekognition();

describe("crop", () => {
  it("Should pass if a cropping area value is out of bounds", async () => {
    // Arrange
    const originalImage = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64"
    );
    const image = sharp(originalImage, { failOnError: false }).withMetadata();
    const edits: ImageEdits = {
      crop: { left: 0, right: 0, width: 100, height: 100 },
    };

    // Act
    try {
      const imageHandler = new ImageHandler(s3Client, rekognitionClient);
      await imageHandler.applyEdits(image, edits, false);
    } catch (error) {
      // Assert
      expect(error).toMatchObject({
        status: StatusCodes.BAD_REQUEST,
        code: "Crop::AreaOutOfBounds",
        message:
          "The cropping area you provided exceeds the boundaries of the original image. Please try choosing a correct cropping value.",
      });
    }
  });
});
