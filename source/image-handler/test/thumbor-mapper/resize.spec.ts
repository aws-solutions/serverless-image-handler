// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { ThumborMapper } from "../../thumbor-mapper";

describe("resize", () => {
  it("Should pass if the proper edit translations are applied and in the correct order", () => {
    // Arrange
    const path = "/fit-in/400x300/test-image-001.jpg";

    // Act
    const thumborMapper = new ThumborMapper();
    const edits = thumborMapper.mapPathToEdits(path);

    // Assert
    const expectedResult = {
      edits: { resize: { width: 400, height: 300, fit: "inside" } },
    };
    expect(edits).toEqual(expectedResult.edits);
  });

  it("Should pass if the proper edit translations are applied and in the correct order", () => {
    // Arrange
    const path = "/fit-in/test-image-001.jpg";

    // Act
    const thumborMapper = new ThumborMapper();
    const edits = thumborMapper.mapPathToEdits(path);

    // Assert
    const expectedResult = { edits: { resize: { fit: "inside" } } };
    expect(edits).toEqual(expectedResult.edits);
  });

  it("Should pass if the proper edit translations are applied and in the correct order", () => {
    // Arrange
    const path = "/400x300/test-image-001.jpg";

    // Act
    const thumborMapper = new ThumborMapper();
    const edits = thumborMapper.mapPathToEdits(path);

    // Assert
    const expectedResult = { edits: { resize: { width: 400, height: 300 } } };
    expect(edits).toEqual(expectedResult.edits);
  });

  it("Should pass if the proper edit translations are applied and in the correct order", () => {
    // Arrange
    const path = "/0x300/test-image-001.jpg";

    // Act
    const thumborMapper = new ThumborMapper();
    const edits = thumborMapper.mapPathToEdits(path);

    // Assert
    const expectedResult = {
      edits: { resize: { width: null, height: 300, fit: "inside" } },
    };
    expect(edits).toEqual(expectedResult.edits);
  });

  it("Should pass if the proper edit translations are applied and in the correct order", () => {
    // Arrange
    const path = "/400x0/test-image-001.jpg";

    // Act
    const thumborMapper = new ThumborMapper();
    const edits = thumborMapper.mapPathToEdits(path);

    // Assert
    const expectedResult = {
      edits: { resize: { width: 400, height: null, fit: "inside" } },
    };
    expect(edits).toEqual(expectedResult.edits);
  });

  it("Should pass if the proper edit translations are applied and in the correct order", () => {
    // Arrange
    const path = "/0x0/test-image-001.jpg";

    // Act
    const thumborMapper = new ThumborMapper();
    const edits = thumborMapper.mapPathToEdits(path);

    // Assert
    const expectedResult = {
      edits: { resize: { width: null, height: null, fit: "inside" } },
    };
    expect(edits).toEqual(expectedResult.edits);
  });
});
