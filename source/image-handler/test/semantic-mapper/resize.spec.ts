// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { SemanticMapper } from "../../semantic-mapper";

describe("resize", () => {
  it("Should pass if the proper edit translations are applied and in the correct order", () => {
    // Arrange
    const path = "/test-image-001.jpg?w=400&h=300";

    // Act
    const customMapper = new SemanticMapper();
    const edits = customMapper.mapPathToEdits(path);

    // Assert
    const expectedResult = {
      edits: { resize: { width: 400, height: 300 } },
    };
    expect(edits).toEqual(expectedResult.edits);
  });


  it("Should pass if the proper edit translations are applied and in the correct order", () => {
    // Arrange
    const path = "/test-image-001.jpg?h=300";

    // Act
    const customMapper = new SemanticMapper();
    const edits = customMapper.mapPathToEdits(path);

    // Assert
    const expectedResult = {
      edits: { resize: { width: null, height: 300, fit: "inside" } },
    };
    expect(edits).toEqual(expectedResult.edits);
  });

  it("Should pass if the proper edit translations are applied and in the correct order", () => {
    // Arrange
    const path = "/test-image-001.jpg?w=400";

    // Act
    const customMapper = new SemanticMapper();
    const edits = customMapper.mapPathToEdits(path);

    // Assert
    const expectedResult = {
      edits: { resize: { width: 400, height: null, fit: "inside" } },
    };
    expect(edits).toEqual(expectedResult.edits);
  });

  it("Should pass if the proper edit translations are applied and in the correct order", () => {
    // Arrange
    const path = "/test-image-001.jpg?w=0&h=0";

    // Act
    const customMapper = new SemanticMapper();
    const edits = customMapper.mapPathToEdits(path);

    // Assert
    const expectedResult = {
      edits: { resize: { width: null, height: null, fit: "inside" } },
    };
    expect(edits).toEqual(expectedResult.edits);
  });
});
