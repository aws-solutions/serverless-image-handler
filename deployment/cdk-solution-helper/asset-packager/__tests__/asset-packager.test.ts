/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const readdirMock = jest.fn();
const addLocalFolderMock = jest.fn();
const renameMock = jest.fn();
const writeZipMock = jest.fn();
const lstatMock = jest.fn();
import path from "path";
import { CDKAssetPackager } from "../asset-packager";
jest
  .mock("node:fs/promises", () => {
    const originalModule = jest.requireActual("node:fs/promises");
    return {
      ...originalModule,
      __esModule: true,
      readdir: readdirMock,
      lstat: lstatMock,
      rename: renameMock,
    };
  })
  .mock("adm-zip", () => {
    const originalModule = jest.requireActual("adm-zip");
    return {
      ...originalModule,
      __esModule: true,
      default: jest.fn(() => ({
        addLocalFolder: addLocalFolderMock,
        writeZip: writeZipMock,
      })),
    };
  });

const __assetPath = "/myTestPath";
const __outputPath = "/outputPath";
const assetPackager = new CDKAssetPackager(__assetPath);
const __asset1 = "asset.1";
const __asset2 = "asset.2.zip";

describe("CDKAssetPackager", () => {
  describe("getAssetPaths", function () {
    beforeEach(function () {
      readdirMock.mockClear();
    });

    it("should return empty array for invalid path", async function () {
      readdirMock.mockRejectedValue("invalid path");
      expect(await assetPackager.getAssetPaths()).toEqual([]);
    });

    it("should return empty array when no assets found", async function () {
      readdirMock.mockResolvedValue([]);
      expect(await assetPackager.getAssetPaths()).toEqual([]);
    });

    it("should return array of paths when assets found", async function () {
      readdirMock.mockResolvedValue([__asset1, __asset2]);
      expect(await assetPackager.getAssetPaths()).toEqual([
        path.join(__assetPath, __asset1),
        path.join(__assetPath, __asset2),
      ]);
    });
  });

  describe("createAssetZip", function () {
    beforeEach(function () {
      readdirMock.mockClear();
      lstatMock.mockClear();
      addLocalFolderMock.mockClear();
      writeZipMock.mockClear();
    });

    it("should skip doing anything if path not a folder", async function () {
      // Arrange
      lstatMock.mockResolvedValue({
        isDirectory: () => false,
      });

      // Act, Assert
      await expect(assetPackager.createAssetZip(__assetPath)).resolves.toBeUndefined();
      expect(addLocalFolderMock).toBeCalledTimes(0);
    });

    it("should zip assets in the folder for valid path", async function () {
      // Arrange
      lstatMock.mockResolvedValue({
        isDirectory: () => true,
      });
      addLocalFolderMock.mockResolvedValue(undefined);
      writeZipMock.mockResolvedValue(undefined);

      // Act, Assert
      await expect(assetPackager.createAssetZip(__asset1)).resolves.toBeUndefined();
      expect(addLocalFolderMock).toBeCalledTimes(1);
      expect(writeZipMock).toBeCalledWith(`${path.join(__assetPath, __asset1)}.zip`);
    });

    it("should throw error if error encountered", async function () {
      lstatMock.mockRejectedValue(new Error("error encountered"));
      await expect(assetPackager.createAssetZip("")).rejects.toThrowError("error encountered");
    });
  });

  describe("moveZips", function () {
    beforeEach(function () {
      renameMock.mockClear();
      readdirMock.mockClear();
    });

    it("should move zips for valid paths", async function () {
      readdirMock.mockResolvedValue([__asset2]);
      await assetPackager.moveZips(__outputPath);
      expect(renameMock).toBeCalledWith(
        path.join(__assetPath, __asset2),
        path.join(__outputPath, __asset2.split("asset.").pop()!)
      );
    });

    it("should throw error if error encountered", async function () {
      readdirMock.mockRejectedValue(new Error("error encountered"));
      await expect(assetPackager.moveZips("")).rejects.toThrowError("error encountered");
    });
  });
});
