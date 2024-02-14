// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { CustomMapper } from "../../custom-mapper";

describe("resize", () => {
  it("Should pass if the proper edit translations are applied and in the correct order", () => {
    // Arrange
    const path = "/test-image-001.jpg?w=400&h=300";

    // Act
    const customMapper = new CustomMapper();
    const edits = customMapper.mapPathToEdits(path);

    // Assert
    const expectedResult = {
      edits: { resize: { width: 400, height: 300 } },
    };
    expect(edits).toEqual(expectedResult.edits);
  });

  // it("Should pass if the proper edit translations are applied and in the correct order", () => {
  //   // Arrange
  //   const path = "/fit-in/test-image-001.jpg";

  //   // Act
  //   const customMapper = new CustomMapper();
  //   const edits = customMapper.mapPathToEdits(path);

  //   // Assert
  //   const expectedResult = { edits: { resize: { fit: "inside" } } };
  //   expect(edits).toEqual(expectedResult.edits);
  // });

  // it("Should pass if the proper edit translations are applied and in the correct order", () => {
  //   // Arrange
  //   const path = "/400x300/test-image-001.jpg";

  //   // Act
  //   const customMapper = new CustomMapper();
  //   const edits = customMapper.mapPathToEdits(path);

  //   // Assert
  //   const expectedResult = { edits: { resize: { width: 400, height: 300 } } };
  //   expect(edits).toEqual(expectedResult.edits);
  // });

  // it("Should pass if the proper edit translations are applied and in the correct order", () => {
  //   // Arrange
  //   const path = "/0x300/test-image-001.jpg";

  //   // Act
  //   const customMapper = new CustomMapper();
  //   const edits = customMapper.mapPathToEdits(path);

  //   // Assert
  //   const expectedResult = {
  //     edits: { resize: { width: null, height: 300, fit: "inside" } },
  //   };
  //   expect(edits).toEqual(expectedResult.edits);
  // });

  // it("Should pass if the proper edit translations are applied and in the correct order", () => {
  //   // Arrange
  //   const path = "/400x0/test-image-001.jpg";

  //   // Act
  //   const customMapper = new CustomMapper();
  //   const edits = customMapper.mapPathToEdits(path);

  //   // Assert
  //   const expectedResult = {
  //     edits: { resize: { width: 400, height: null, fit: "inside" } },
  //   };
  //   expect(edits).toEqual(expectedResult.edits);
  // });

  // it("Should pass if the proper edit translations are applied and in the correct order", () => {
  //   // Arrange
  //   const path = "/0x0/test-image-001.jpg";

  //   // Act
  //   const customMapper = new CustomMapper();
  //   const edits = customMapper.mapPathToEdits(path);

  //   // Assert
  //   const expectedResult = {
  //     edits: { resize: { width: null, height: null, fit: "inside" } },
  //   };
  //   expect(edits).toEqual(expectedResult.edits);
  // });
});
