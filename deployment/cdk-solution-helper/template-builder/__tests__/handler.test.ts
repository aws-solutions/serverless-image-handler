/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { mkdir, rm, cp, readFile } from "node:fs/promises";
import { handler } from "../index";
import path from "path";
import { DefaultStackSynthesizer } from "aws-cdk-lib";

const __templateDirectoryPath = path.join(__dirname, "myTemplateDir");
const __solutionName = "sih";
const __solutionVersion = "myMockVersion";
const __lambdaAssetBucketName = "mockAssetBucket";
const __template = "mock.template.json";
const cdkBucketRegex = new RegExp(
  `(cdk-${DefaultStackSynthesizer.DEFAULT_QUALIFIER}-assets)-(\\$\{AWS::AccountId\}-\\$\{AWS::Region\})`,
  "g"
);
const solutionLambdaBucketRegexp = new RegExp(
  `(${__lambdaAssetBucketName}-\\$\{AWS::Region\})`,
  "g"
);
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

  it("should update template resources", async function () {
    // Arrange
    await cp(
      path.join(__dirname, __template),
      path.join(__templateDirectoryPath, __template)
    );

    // Act
    await handler(
      __templateDirectoryPath,
      __solutionName,
      __lambdaAssetBucketName,
      __solutionVersion
    );

    // Assert
    const old_template_data = (
      await readFile(path.join(__dirname, __template))
    ).toString();
    const new_template_data = (
      await readFile(path.join(__templateDirectoryPath, __template))
    ).toString();
    const cdkBucketOccurrences =
      old_template_data.match(cdkBucketRegex)?.length;
    const solutionBucketOccurrences = new_template_data.match(
      solutionLambdaBucketRegexp
    )?.length;
    expect(cdkBucketOccurrences).toEqual(solutionBucketOccurrences);
  });

  afterAll(async function Cleanup() {
    await rm(__templateDirectoryPath, { recursive: true, force: true });
  });
});
