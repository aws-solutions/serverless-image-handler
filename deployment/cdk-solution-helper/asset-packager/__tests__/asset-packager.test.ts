/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const readdirMock = jest.fn();
import path from "path";
import { CDKAssetPackager } from "../asset-packager";
jest.mock("node:fs/promises", () => {
  const originalModule = jest.requireActual("node:fs/promises");
  return {
    ...originalModule,
    __esModule: true,
    readdir: readdirMock,
  };
});

const testPath = "/myTestPath";
const assetPackager = new CDKAssetPackager(testPath);
const mockAsset1 = "asset.1";
const mockAsset2 = "asset.2.zip";

describe("CDKAssetPackager", () => {
  beforeEach(function Arrange() {
    readdirMock.mockClear();
  });

  describe("getAssetPaths", function () {
    it("should return empty array for invalid path", async function () {
      readdirMock.mockRejectedValue("invalid path");
      expect(await assetPackager.getAssetPaths()).toEqual([]);
    });

    it("should return empty array when no assets found", async function () {
      readdirMock.mockResolvedValue([]);
      expect(await assetPackager.getAssetPaths()).toEqual([]);
    });

    it("should return array of paths when assets found", async function () {
      readdirMock.mockResolvedValue([mockAsset1, mockAsset2]);
      expect(await assetPackager.getAssetPaths()).toEqual([
        path.join(testPath, mockAsset1),
        path.join(testPath, mockAsset2),
      ]);
    });
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
