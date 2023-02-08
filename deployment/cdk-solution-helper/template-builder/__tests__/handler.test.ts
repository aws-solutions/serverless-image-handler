/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { mkdir, rm } from "node:fs/promises";
import { handler } from "../index";
import path from "path";

const __templateDirectoryPath = path.join(__dirname, "myTemplateDir");
const __solutionName = "sih";
const __solutionVersion = "myMockVersion";
const __lambdaAssetBucketName = "mockAssetBucket";
const __template = {};
describe("Handler", () => {
  beforeAll(async function Arrange() {
    await rm(__templateDirectoryPath, { recursive: true, force: true });
    await mkdir(__templateDirectoryPath);
  });

  it("should fail in absence of path inputs ", async function () {
    expect.assertions(2);
    await expect(handler("", "", "", "")).rejects.toThrowError(
      "undefined arguments"
    );
    await expect(
      handler(undefined, undefined, undefined, undefined)
    ).rejects.toThrowError("undefined arguments");
  });

  it("should succeed for invalid template directory path", async function () {
    await expect(
      handler(
        "invalidPath",
        __solutionName,
        __lambdaAssetBucketName,
        __solutionVersion
      )
    ).resolves.toBeUndefined();
  });

  it("should succeed if templates not found", async function () {
    await expect(
      handler(
        __templateDirectoryPath,
        __solutionName,
        __lambdaAssetBucketName,
        __solutionVersion
      )
    ).resolves.toBeUndefined();
  });

  xit("should update template resources", function () {});

  afterAll(async function Cleanup() {
    await rm(__templateDirectoryPath, { recursive: true, force: true });
  });
});
