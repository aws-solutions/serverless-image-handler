// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { isNullOrWhiteSpace, parseJson, generateRegExp } from "../helpers";

describe("helpers", () => {
  it("Should pass if the proper result is returned for a whitespace only string", () => {
    const result = isNullOrWhiteSpace(" ");

    const expectedResult = true;
    expect(result).toEqual(expectedResult);
  });

  it("Should pass if the proper result is returned for a null string", () => {
    const result = isNullOrWhiteSpace("");

    const expectedResult = true;
    expect(result).toEqual(expectedResult);
  });

  it("Should pass if the proper result is returned for non-whitespace containing string", () => {
    const result = isNullOrWhiteSpace("abc");

    const expectedResult = false;
    expect(result).toEqual(expectedResult);
  });

  it("Should pass if the proper result is returned for tbd", () => {
    const result = parseJson("filter:");

    const expectedResult = ["filter:"];
    expect(result).toEqual(expectedResult);
  });

  it("Should pass if the proper result is returned for a null string", () => {
    const result = parseJson("");

    const expectedResult = [""];
    expect(result).toEqual(expectedResult);
  });

  it("Should pass if the proper result is returned for json with multiple objects", () => {
    const result = parseJson('["//thumb/g","//small/g","//large/g"]');

    const expectedResult = ["//thumb/g", "//small/g", "//large/g"];
    expect(result).toEqual(expectedResult);
  });

  it("Should pass if the proper result is returned for a simple regex", () => {
    const result = generateRegExp("/thumb/g");

    const expectedResult1 = /thumb/g;
    expect(result).toEqual(expectedResult1);
  });

  it("Should pass if the proper result is returned for a simple rege with embedded slash that must be escaped", () => {
    const result = generateRegExp("//thumb/g");

    const expectedResult1 = /\/thumb/g;
    expect(result).toEqual(expectedResult1);
  });
});
