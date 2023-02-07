/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { handler } from "./index";
import { CDKAssetPackager } from "./asset-packager";
import { mkdir, writeFile, rm } from "node:fs/promises";
import path from "path";

const mockAssetDirectoryPath = path.join(__dirname, "mock-dir");
const mockOutputPath = path.join(__dirname, "mock-dir-output");
describe("Handler", () => {
  beforeAll(async function Arrange() {
    await rm(mockAssetDirectoryPath, { recursive: true, force: true });
    await rm(mockOutputPath, { recursive: true, force: true });
    await mkdir(mockAssetDirectoryPath);
    await mkdir(mockOutputPath);
  });

  it("should fail in absence of path inputs ", async function () {
    await expect(handler("", "")).rejects.toThrowError("undefined input path");
    await expect(handler(undefined, undefined)).rejects.toThrowError("undefined input path");
  });

  it("should fail for invalid cdk asset path", async function () {
    await expect(handler("invalidPath", mockOutputPath)).rejects.toThrowError(); // TODO check error thrown
  });

  it("should succeed if cdk assets not found", async function () {
    await expect(handler(mockAssetDirectoryPath, "invalidPath")).resolves;
  });

  it("should fail for invalid output path", async function () {
    // Arrange
    const mockAssetPath = path.join(mockAssetDirectoryPath, "asset.cdkAsset.zip");
    await writeFile(mockAssetPath, "NoOp");
    // Act, Assert
    await expect(handler(mockAssetDirectoryPath, "invalidPath")).rejects.toThrowError(); // TODO check error thrown
  });

  it("should succeed for valid paths", async function () {
    await expect(handler(mockAssetDirectoryPath, mockOutputPath)).resolves;
    // check for zip created
  });

  afterAll(async function Cleanup() {
    // await rm(mockAssetDirectoryPath, { recursive: true, force: true });
    // await rm(mockOutputPath, { recursive: true, force: true });
  });
});

describe("CDKAssetPackager", () => {
  beforeAll(function Arrange() {
    // mock fs calls
  });
  describe("getAssetPaths", function () {
    xit("should return empty array for invalid path", function () {});
    xit("should return empty array when no assets found", function () {});
    xit("should return array of paths when assets found", function () {});
  });
  describe("createAssetZip", function () {
    xit("should skip doing anything if path not a folder", function () {});
    xit("should zip assets in the folder for valid path", function () {});
    xit("should throw error if error encountered", function () {});
  });
  describe("moveZip", function () {
    xit("should move zips for valid paths", function () {});
    xit("should throw error if error encountered", function () {});
  });
});
