// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import fs from "fs";

import { mockAwsS3 } from "./mock";

import { handler } from "../index";
import { ImageHandlerError, ImageHandlerEvent, StatusCodes } from "../lib";

describe("index", () => {
  // Arrange
  process.env = {
    USE_SEMANTIC_URL: "Yes",
    SOURCE_BUCKETS: "source-bucket",
  };

  it("should return the image when there is no error with semantic", async () => {
    const originalImage = fs.readFileSync("./test/image/25x15.png");

    // Mock
    mockAwsS3.getObject.mockImplementationOnce(() => ({
      promise() {
        return Promise.resolve({ Body: originalImage, ContentType: "image/jpeg" });
      },
    }));
    // Arrange
    const event: ImageHandlerEvent = { path: "/test.jpg?w=10&h=100" };

    // Act
    const result = await handler(event);
    const expectedResult = {
      statusCode: StatusCodes.OK,
      isBase64Encoded: true,
      headers: {
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Credentials": true,
        "Content-Type": "image/jpeg",
        Expires: undefined,
        "Cache-Control": "max-age=31536000,public",
        "Last-Modified": undefined,
      },
      body: fs.readFileSync("./test/image/10x100.png").toString("base64"),
    };

    // Assert
    expect(mockAwsS3.getObject).toHaveBeenCalledWith({
      Bucket: "source-bucket",
      Key: "test.jpg",
    });
    expect(result).toEqual(expectedResult);
  });
});
