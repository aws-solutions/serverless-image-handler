// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { ImageFormatTypes } from "../../lib";
import { SemanticMapper } from "../../semantic-mapper";

describe("format semantic", () => {
  it("format conversion jpg -> png", () => {
    // Arrange
    const event = {
      path: "/test-image-001.jpg",
      queryStringParameters: {
        signature: "dummySig",
        fm: ImageFormatTypes.PNG,
      },
    };

    // Act
    const customMapper = new SemanticMapper();
    const edits = customMapper.mapPathToEdits(event);

    // Assert
    const expectedResult = {
      edits: { toFormat: "png" },
    };
    expect(edits).toEqual(expectedResult.edits);
  });

  it("Should map format and quality when it is a valid format", () => {
    // Arrange
    const event = {
      path: "/test-image-001.png",
      queryStringParameters: {
        signature: "dummySig",
        q: "90",
      },
    };

    // Act
    const customMapper = new SemanticMapper();
    const edits = customMapper.mapPathToEdits(event);

    // Assert
    expect(edits.png).toEqual({ quality: 90 });
  });

  it("Should map format and default quality when conversion to jpeg and q is NOT set", () => {
    // Arrange
    const event = {
      path: "/test-image-001.png",
      queryStringParameters: {
        signature: "dummySig",
        fm: ImageFormatTypes.JPEG,
      },
    };

    // Act
    const customMapper = new SemanticMapper();
    const edits = customMapper.mapPathToEdits(event);

    // Assert
    const expectedResult = {
      edits: {  toFormat: "jpeg", jpeg: { quality: 60 } },
    };
    expect(edits).toEqual(expectedResult.edits);
  });

  it("Should map format and default quality when conversion to jpeg and q IS set", () => {
    // Arrange
    const event = {
      path: "/test-image-001.png",
      queryStringParameters: {
        signature: "dummySig",
        fm: ImageFormatTypes.JPEG,
        q: "90",
      },
    };

    // Act
    const customMapper = new SemanticMapper();
    const edits = customMapper.mapPathToEdits(event);

    // Assert
    const expectedResult = {
      edits: {  toFormat: "jpeg", jpeg: { quality: 90 } },
    };
    expect(edits).toEqual(expectedResult.edits);
  });

  it("Should not map format and quality with any other format", () => {
    // Arrange
    const event = {
      path: "/test-image-001.png",
      queryStringParameters: {
        signature: "dummySig",
        fm: ImageFormatTypes.WEBP,
        q: "90",
      },
    };

    // Act
    const customMapper = new SemanticMapper();
    const edits = customMapper.mapPathToEdits(event);

    // Assert
    const expectedResult = {
      edits: {  toFormat: "webp", webp: { quality: 90 } },
    };
    expect(edits).toEqual(expectedResult.edits);
  });
});