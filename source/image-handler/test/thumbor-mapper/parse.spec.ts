// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { ThumborMapper } from "../../thumbor-mapper";

describe("parse", () => {
  const OLD_ENV = {
    REWRITE_MATCH_PATTERN: "/(filters-)/gm",
    REWRITE_SUBSTITUTION: "filters:",
  };

  beforeEach(() => {
    process.env = { ...OLD_ENV };
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  it("Should pass if the proper edit translations are applied and in the correct order", () => {
    const path = "/filters-rotate(90)/filters-grayscale()/thumbor-image.jpg";

    // Act
    const thumborMapper = new ThumborMapper();
    const result = thumborMapper.parseCustomPath(path);

    // Assert
    const expectedResult = "/filters:rotate(90)/filters:grayscale()/thumbor-image.jpg";
    expect(result).toEqual(expectedResult);
  });

  it("Should throw an error if the path is not defined", () => {
    const path = undefined;
    // Act
    const thumborMapper = new ThumborMapper();

    // Assert
    expect(() => {
      thumborMapper.parseCustomPath(path);
    }).toThrowError(new Error("ThumborMapping::ParseCustomPath::PathUndefined"));
  });

  it("Should throw an error if the environment variables are left undefined", () => {
    const path = "/filters-rotate(90)/filters-grayscale()/thumbor-image.jpg";

    // Act
    delete process.env.REWRITE_MATCH_PATTERN;
    const thumborMapper = new ThumborMapper();

    // Assert
    expect(() => {
      thumborMapper.parseCustomPath(path);
    }).toThrowError(new Error("ThumborMapping::ParseCustomPath::RewriteMatchPatternUndefined"));
  });

  it("Should throw an error if the path is not defined", () => {
    const path = "/filters-rotate(90)/filters-grayscale()/thumbor-image.jpg";

    // Act
    delete process.env.REWRITE_SUBSTITUTION;

    const thumborMapper = new ThumborMapper();
    // Assert
    expect(() => {
      thumborMapper.parseCustomPath(path);
    }).toThrowError(new Error("ThumborMapping::ParseCustomPath::RewriteSubstitutionUndefined"));
  });
});
