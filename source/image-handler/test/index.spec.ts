// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { mockAwsS3 } from "./mock";

import { handler } from "../index";
import { ImageHandlerError, ImageHandlerEvent, StatusCodes } from "../lib";

describe("index", () => {
  // Arrange
  process.env.SOURCE_BUCKETS = "source-bucket";
  const mockImage = Buffer.from("SampleImageContent\n");
  const mockFallbackImage = Buffer.from("SampleFallbackImageContent\n");

  it("should return the image when there is no error", async () => {
    // Mock
    mockAwsS3.getObject.mockImplementationOnce(() => ({
      promise() {
        return Promise.resolve({ Body: mockImage, ContentType: "image/jpeg" });
      },
    }));
    // Arrange
    const event: ImageHandlerEvent = { path: "/test.jpg" };

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
      body: mockImage.toString("base64"),
    };

    // Assert
    expect(mockAwsS3.getObject).toHaveBeenCalledWith({
      Bucket: "source-bucket",
      Key: "test.jpg",
    });
    expect(result).toEqual(expectedResult);
  });

  it("should return the image with custom headers when custom headers are provided", async () => {
    // Mock
    mockAwsS3.getObject.mockImplementationOnce(() => ({
      promise() {
        return Promise.resolve({ Body: mockImage, ContentType: "image/jpeg" });
      },
    }));
    // Arrange
    const event: ImageHandlerEvent = {
      path: "/eyJidWNrZXQiOiJzb3VyY2UtYnVja2V0Iiwia2V5IjoidGVzdC5qcGciLCJoZWFkZXJzIjp7IkN1c3RvbS1IZWFkZXIiOiJDdXN0b21WYWx1ZSJ9fQ==",
    };

    // Act
    const result = await handler(event);
    const expectedResult = {
      statusCode: StatusCodes.OK,
      headers: {
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Credentials": true,
        "Content-Type": "image/jpeg",
        Expires: undefined,
        "Cache-Control": "max-age=31536000,public",
        "Last-Modified": undefined,
        "Custom-Header": "CustomValue",
      },
      body: mockImage.toString("base64"),
      isBase64Encoded: true,
    };

    // Assert
    expect(mockAwsS3.getObject).toHaveBeenCalledWith({
      Bucket: "source-bucket",
      Key: "test.jpg",
    });
    expect(result).toEqual(expectedResult);
  });

  it("should return the image when the request is from ALB", async () => {
    // Mock
    mockAwsS3.getObject.mockImplementationOnce(() => ({
      promise() {
        return Promise.resolve({ Body: mockImage, ContentType: "image/jpeg" });
      },
    }));
    // Arrange
    const event: ImageHandlerEvent = {
      path: "/test.jpg",
      requestContext: {
        elb: {},
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
        "Content-Type": "image/jpeg",
        Expires: undefined,
        "Cache-Control": "max-age=31536000,public",
        "Last-Modified": undefined,
      },
      body: mockImage.toString("base64"),
    };

    // Assert
    expect(mockAwsS3.getObject).toHaveBeenCalledWith({
      Bucket: "source-bucket",
      Key: "test.jpg",
    });
    expect(result).toEqual(expectedResult);
  });

  it("should return an error JSON when an error occurs", async () => {
    // Arrange
    const event: ImageHandlerEvent = { path: "/test.jpg" };
    // Mock
    mockAwsS3.getObject.mockImplementationOnce(() => ({
      promise() {
        return Promise.reject(new ImageHandlerError(StatusCodes.NOT_FOUND, "NoSuchKey", "NoSuchKey error happened."));
      },
    }));

    // Act
    const result = await handler(event);
    const expectedResult = {
      statusCode: StatusCodes.NOT_FOUND,
      isBase64Encoded: false,
      headers: {
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Credentials": true,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: StatusCodes.NOT_FOUND,
        code: "NoSuchKey",
        message: `The image test.jpg does not exist or the request may not be base64 encoded properly.`,
      }),
    };

    // Assert
    expect(mockAwsS3.getObject).toHaveBeenCalledWith({
      Bucket: "source-bucket",
      Key: "test.jpg",
    });
    expect(result).toEqual(expectedResult);
  });

  it("should return 500 error when there is no error status in the error", async () => {
    // Arrange
    const event: ImageHandlerEvent = {
      path: "eyJidWNrZXQiOiJzb3VyY2UtYnVja2V0Iiwia2V5IjoidGVzdC5qcGciLCJlZGl0cyI6eyJ3cm9uZ0ZpbHRlciI6dHJ1ZX19",
    };

    // Mock
    mockAwsS3.getObject.mockImplementationOnce(() => ({
      promise() {
        return Promise.resolve({ Body: mockImage, ContentType: "image/jpeg" });
      },
    }));

    // Act
    const result = await handler(event);
    const expectedResult = {
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      isBase64Encoded: false,
      headers: {
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Credentials": true,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "Internal error. Please contact the system administrator.",
        code: "InternalError",
        status: StatusCodes.INTERNAL_SERVER_ERROR,
      }),
    };

    // Assert
    expect(mockAwsS3.getObject).toHaveBeenCalledWith({
      Bucket: "source-bucket",
      Key: "test.jpg",
    });
    expect(result).toEqual(expectedResult);
  });

  it("should return the default fallback image when an error occurs if the default fallback image is enabled", async () => {
    // Arrange
    process.env.ENABLE_DEFAULT_FALLBACK_IMAGE = "Yes";
    process.env.DEFAULT_FALLBACK_IMAGE_BUCKET = "fallback-image-bucket";
    process.env.DEFAULT_FALLBACK_IMAGE_KEY = "fallback-image.png";
    process.env.CORS_ENABLED = "Yes";
    process.env.CORS_ORIGIN = "*";
    const event: ImageHandlerEvent = { path: "/test.jpg" };

    // Mock
    mockAwsS3.getObject.mockReset();
    mockAwsS3.getObject
      .mockImplementationOnce(() => ({
        promise() {
          return Promise.reject(new ImageHandlerError(StatusCodes.INTERNAL_SERVER_ERROR, "UnknownError", null));
        },
      }))
      .mockImplementationOnce(() => ({
        promise() {
          return Promise.resolve({
            Body: mockFallbackImage,
            ContentType: "image/png",
          });
        },
      }));

    // Act
    const result = await handler(event);
    const expectedResult = {
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      isBase64Encoded: true,
      headers: {
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Credentials": true,
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "image/png",
        "Cache-Control": "max-age=31536000,public",
        "Last-Modified": undefined,
      },
      body: mockFallbackImage.toString("base64"),
    };

    // Assert
    expect(mockAwsS3.getObject).toHaveBeenNthCalledWith(1, {
      Bucket: "source-bucket",
      Key: "test.jpg",
    });
    expect(mockAwsS3.getObject).toHaveBeenNthCalledWith(2, {
      Bucket: "fallback-image-bucket",
      Key: "fallback-image.png",
    });
    expect(result).toEqual(expectedResult);
  });

  it("should return an error JSON when getting the default fallback image fails if the default fallback image is enabled", async () => {
    // Arrange
    const event: ImageHandlerEvent = {
      path: "/test.jpg",
    };

    // Mock
    mockAwsS3.getObject.mockReset();
    mockAwsS3.getObject.mockImplementation(() => ({
      promise() {
        return Promise.reject(new ImageHandlerError(StatusCodes.NOT_FOUND, "NoSuchKey", "NoSuchKey error happened."));
      },
    }));

    // Act
    const result = await handler(event);
    const expectedResult = {
      statusCode: StatusCodes.NOT_FOUND,
      isBase64Encoded: false,
      headers: {
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Credentials": true,
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: StatusCodes.NOT_FOUND,
        code: "NoSuchKey",
        message: `The image test.jpg does not exist or the request may not be base64 encoded properly.`,
      }),
    };

    // Assert
    expect(mockAwsS3.getObject).toHaveBeenNthCalledWith(1, {
      Bucket: "source-bucket",
      Key: "test.jpg",
    });
    expect(mockAwsS3.getObject).toHaveBeenNthCalledWith(2, {
      Bucket: "fallback-image-bucket",
      Key: "fallback-image.png",
    });
    expect(result).toEqual(expectedResult);
  });

  it("should return an error JSON when the default fallback image key is not provided if the default fallback image is enabled", async () => {
    // Arrange
    process.env.DEFAULT_FALLBACK_IMAGE_KEY = "";
    const event: ImageHandlerEvent = { path: "/test.jpg" };

    // Mock
    mockAwsS3.getObject.mockImplementationOnce(() => ({
      promise() {
        return Promise.reject(new ImageHandlerError(StatusCodes.NOT_FOUND, "NoSuchKey", "NoSuchKey error happened."));
      },
    }));

    // Act
    const result = await handler(event);
    const expectedResult = {
      statusCode: StatusCodes.NOT_FOUND,
      isBase64Encoded: false,
      headers: {
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Credentials": true,
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: StatusCodes.NOT_FOUND,
        code: "NoSuchKey",
        message: `The image test.jpg does not exist or the request may not be base64 encoded properly.`,
      }),
    };

    // Assert
    expect(mockAwsS3.getObject).toHaveBeenCalledWith({
      Bucket: "source-bucket",
      Key: "test.jpg",
    });
    expect(result).toEqual(expectedResult);
  });

  it("should return an error JSON when the default fallback image bucket is not provided if the default fallback image is enabled", async () => {
    // Arrange
    process.env.DEFAULT_FALLBACK_IMAGE_BUCKET = "";
    const event: ImageHandlerEvent = { path: "/test.jpg" };

    // Mock
    mockAwsS3.getObject.mockImplementationOnce(() => ({
      promise() {
        return Promise.reject(new ImageHandlerError(StatusCodes.NOT_FOUND, "NoSuchKey", "NoSuchKey error happened."));
      },
    }));

    // Act
    const result = await handler(event);
    const expectedResult = {
      statusCode: StatusCodes.NOT_FOUND,
      isBase64Encoded: false,
      headers: {
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Credentials": true,
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: StatusCodes.NOT_FOUND,
        code: "NoSuchKey",
        message: `The image test.jpg does not exist or the request may not be base64 encoded properly.`,
      }),
    };

    // Assert
    expect(mockAwsS3.getObject).toHaveBeenCalledWith({
      Bucket: "source-bucket",
      Key: "test.jpg",
    });
    expect(result).toEqual(expectedResult);
  });

  it("Should return an error JSON when ALB request is failed", async () => {
    // Arrange
    const event: ImageHandlerEvent = {
      path: "/test.jpg",
      requestContext: {
        elb: {},
      },
    };

    // Mock
    mockAwsS3.getObject.mockImplementationOnce(() => ({
      promise() {
        return Promise.reject(new ImageHandlerError(StatusCodes.NOT_FOUND, "NoSuchKey", "NoSuchKey error happened."));
      },
    }));

    // Act
    const result = await handler(event);
    const expectedResult = {
      statusCode: StatusCodes.NOT_FOUND,
      isBase64Encoded: false,
      headers: {
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: StatusCodes.NOT_FOUND,
        code: "NoSuchKey",
        message: `The image test.jpg does not exist or the request may not be base64 encoded properly.`,
      }),
    };

    // Assert
    expect(mockAwsS3.getObject).toHaveBeenCalledWith({
      Bucket: "source-bucket",
      Key: "test.jpg",
    });
    expect(result).toEqual(expectedResult);
  });
});
