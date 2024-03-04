// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import fs from "fs";

import { mockAwsS3 } from "./mock";

import { handler } from "../index";
import { ImageFormatTypes, ImageHandlerError, ImageHandlerEvent, StatusCodes } from "../lib";

describe("index semantic", () => {
  // Arrange
  process.env = {
    USE_SEMANTIC_URL: "Yes",
    SOURCE_BUCKETS: "source-bucket",
  };

  it("should return the resized image", async () => {
    const originalImage = fs.readFileSync("./test/image/25x15.png");

    // Mock
    mockAwsS3.getObject.mockImplementationOnce(() => ({
      promise() {
        return Promise.resolve({ Body: originalImage, ContentType: "image/png" });
      },
    }));
    // Arrange
    const event: ImageHandlerEvent = {
      path: "/test.png",
      queryStringParameters: {
        signature: "dummySig",
        w: "10",
        h: "100",
      },
    };

    // Act
    const result = await handler(event);
    const expectedResult = {
      statusCode: StatusCodes.OK,
      isBase64Encoded: true,
      headers: {
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Credentials": true,
        "Content-Type": "image/png",
        Expires: undefined,
        "Cache-Control": "max-age=31536000,public",
        "Last-Modified": undefined,
      },
      body: fs.readFileSync("./test/image/10x100.png").toString("base64"),
    };

    // Assert
    expect(mockAwsS3.getObject).toHaveBeenCalledWith({
      Bucket: "source-bucket",
      Key: "test.png",
    });
    expect(result).toEqual(expectedResult);
  });

  it("should return the converted image when", async () => {
    const originalImage = fs.readFileSync("./test/image/1x1.jpg");

    // Mock
    mockAwsS3.getObject.mockImplementationOnce(() => ({
      promise() {
        return Promise.resolve({ Body: originalImage, ContentType: "image/jpeg" });
      },
    }));

    // Arrange
    const event: ImageHandlerEvent = {
      path: "/test.jpeg",
      queryStringParameters: {
        signature: "dummySig",
        fm: ImageFormatTypes.PNG,
      },
    };

    // Act
    const result = await handler(event);
    const expectedResult = {
      statusCode: StatusCodes.OK,
      isBase64Encoded: true,
      headers: {
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Credentials": true,
        "Content-Type": "image/png",
        Expires: undefined,
        "Cache-Control": "max-age=31536000,public",
        "Last-Modified": undefined,
      },
      body: fs.readFileSync("./test/image/1x1.png").toString("base64"),
    };

    // Assert
    expect(mockAwsS3.getObject).toHaveBeenCalledWith({
      Bucket: "source-bucket",
      Key: "test.jpeg",
    });
    expect(result).toEqual(expectedResult);
  });

});
