// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { SemanticMapper } from "../../semantic-mapper";

describe("resize", () => {
  it("Should pass if the proper edit translations are applied and in the correct order", () => {
    // Arrange
    const event = {
      path:"/test-image-001.jpg",
      queryStringParameters: {
        signature: "dummySig",
        w: 400,
        h: 300,
      },
    };

    // Act
    const customMapper = new SemanticMapper();
    const edits = customMapper.mapPathToEdits(event);

    // Assert
    const expectedResult = {
      edits: { resize: { width: 400, height: 300 } },
    };
    expect(edits).toEqual(expectedResult.edits);
  });

  it("Should pass if the proper edit translations are applied and in the correct order", () => {
    // Arrange
    const event = {
      path:"/test-image-001.jpg",
      queryStringParameters: {
        signature: "dummySig",
        h: 300,
      },
    };

    // Act
    const customMapper = new SemanticMapper();
    const edits = customMapper.mapPathToEdits(event);

    // Assert
    const expectedResult = {
      edits: { resize: { width: null, height: 300, fit: "inside" } },
    };
    expect(edits).toEqual(expectedResult.edits);
  });

  it("Should pass if the proper edit translations are applied and in the correct order", () => {
    // Arrange
    const event = {
      path:"/test-image-001.jpg",
      queryStringParameters: {
        signature: "dummySig",
        w: 400,
      },
    };

    // Act
    const customMapper = new SemanticMapper();
    const edits = customMapper.mapPathToEdits(event);

    // Assert
    const expectedResult = {
      edits: { resize: { width: 400, height: null, fit: "inside" } },
    };
    expect(edits).toEqual(expectedResult.edits);
  });

  it("Should pass if the proper edit translations are applied and in the correct order", () => {
    // Arrange
    const event = {
      path:"/test-image-001.jpg",
      queryStringParameters: {
        signature: "dummySig",
        w: 0,
        h: 0
      },
    };

    // Act
    const customMapper = new SemanticMapper();
    const edits = customMapper.mapPathToEdits(event);

    // Assert
    const expectedResult = {
      edits: { resize: { width: null, height: null, fit: "inside" } },
    };
    expect(edits).toEqual(expectedResult.edits);
  });

  it("Tests error on deployment, no parameters produces these edits", () => {
    // Arrange
    const event = {
      path:"/test-image-001.jpg",
    }

    // Act
    const customMapper = new SemanticMapper();
    const edits = customMapper.mapPathToEdits(event);

    // Assert
    const expectedResult = {
      edits: { resize: { width: null, height: null, fit: "inside" } },
    };
    expect(edits).toEqual(expectedResult.edits);
  });
});
