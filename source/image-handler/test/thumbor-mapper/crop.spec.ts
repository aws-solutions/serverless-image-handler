// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { ThumborMapper } from "../../thumbor-mapper";

describe("crop", () => {
  it("Should pass if the proper crop is applied", () => {
    // Arrange
    const path = "/10x0:100x200/test-image-001.jpg";

    // Act
    const thumborMapper = new ThumborMapper();
    const edits = thumborMapper.mapPathToEdits(path);

    // Assert
    const expectedResult = {
      edits: {
        crop: { left: 10, top: 0, width: 90, height: 200 },
      },
    };
    expect(edits).toEqual(expectedResult.edits);
  });

  it("Should ignore crop if invalid dimension values are provided", () => {
    // Arrange
    const path = "/abc:0:10x200/test-image-001.jpg";

    // Act
    const thumborMapper = new ThumborMapper();
    const edits = thumborMapper.mapPathToEdits(path);

    // Assert
    const expectedResult = { edits: {} };
    expect(edits).toEqual(expectedResult.edits);
  });

  it("Should pass if the proper crop and resize are applied", () => {
    // Arrange
    const path = "/10x0:100x200/10x20/test-image-001.jpg";
    // Act
    const thumborMapper = new ThumborMapper();
    const edits = thumborMapper.mapPathToEdits(path);

    // Assert
    const expectedResult = {
      edits: {
        crop: { left: 10, top: 0, width: 90, height: 200 },
        resize: { width: 10, height: 20 },
      },
    };
    expect(edits).toEqual(expectedResult.edits);
  });
});
