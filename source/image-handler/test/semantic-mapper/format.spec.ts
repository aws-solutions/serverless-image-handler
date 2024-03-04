// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { ImageFormatTypes } from "../../lib";
import { SemanticMapper } from "../../semantic-mapper";

describe("format semantic", () => {
  it("Should pass if the proper edit translations are applied and in the correct order", () => {
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
      edits: { resize: { fit: "inside", height: null, width: null }, toFormat: "png" },
    };
    expect(edits).toEqual(expectedResult.edits);
  });
});