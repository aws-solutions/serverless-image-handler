// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import Rekognition from "aws-sdk/clients/rekognition";
import S3 from "aws-sdk/clients/s3";
import sharp from "sharp";

import { ImageHandler } from "../../image-handler";
import { ImageRequestInfo, RequestTypes } from "../../lib";
import fs from "fs";

const s3Client = new S3();
const rekognitionClient = new Rekognition();

describe("allowlist", () => {
  it("Non-allowlisted filters should not be called", async () => {
    // Arrange
    const originalImage = fs.readFileSync("./test/image/1x1.jpg");
    const request: ImageRequestInfo = {
      requestType: RequestTypes.DEFAULT,
      bucket: "sample-bucket",
      key: "test.jpg",
      edits: { rotate: null, toFile: "test" } as unknown as any, // toFile is not allowlisted
      originalImage,
    };

    const toFileSpy = jest.spyOn(sharp.prototype, "toFile");
    const rotateSpy = jest.spyOn(sharp.prototype, "rotate");

    // Act
    const imageHandler = new ImageHandler(s3Client, rekognitionClient);
    await imageHandler.process(request);

    // Assert
    expect(toFileSpy).toBeCalledTimes(0);
    expect(rotateSpy).toBeCalledTimes(1);
  });
});
