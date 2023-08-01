/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import path from "path";
import { existsSync } from "fs";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { handler } from "../index";

const __assetDirectoryPath = path.join(__dirname, "mock-dir");
const __outputPath = path.join(__dirname, "mock-dir-output");
describe("Handler", () => {
  beforeAll(async function Arrange() {
    await rm(__assetDirectoryPath, { recursive: true, force: true });
    await rm(__outputPath, { recursive: true, force: true });
    await mkdir(__assetDirectoryPath);
    await mkdir(__outputPath);
  });

  it("should fail in absence of path inputs ", async function () {
    expect.assertions(2);
    await expect(handler("", "")).rejects.toThrowError("undefined input path");
    await expect(handler(undefined, undefined)).rejects.toThrowError("undefined input path");
  });

  it("should fail for invalid cdk asset path", async function () {
    expect.assertions(1);
    await expect(handler("invalidPath", __outputPath)).rejects.toThrowError(/(ENOENT).+(invalidPath)/g);
  });

  it("should succeed if cdk assets not found", async function () {
    await expect(handler(__assetDirectoryPath, "invalidPath")).resolves.toBeUndefined();
  });

  it("should fail for invalid output path", async function () {
    // Arrange
    expect.assertions(1);
    const mockAssetPath = path.join(__assetDirectoryPath, "./asset.cdkAsset.zip");
    await writeFile(mockAssetPath, "NoOp");
    // Act, Assert
    await expect(handler(__assetDirectoryPath, "invalidPath")).rejects.toThrowError(/(ENOENT).+(invalidPath)/g);
    // Cleanup
    await rm(mockAssetPath);
  });

  it("should successfully stage zip for valid paths", async function () {
    const zipName = "asset.cdkAsset.zip";
    const mockAssetPath = path.join(__assetDirectoryPath, zipName);
    await writeFile(mockAssetPath, "NoOp");
    await expect(handler(__assetDirectoryPath, __outputPath)).resolves.toBeUndefined();
    expect(existsSync(path.join(__outputPath, zipName.split("asset.").pop()!))).toBe(true);
  });

  afterAll(async function Cleanup() {
    await rm(__assetDirectoryPath, { recursive: true, force: true });
    await rm(__outputPath, { recursive: true, force: true });
  });
});
