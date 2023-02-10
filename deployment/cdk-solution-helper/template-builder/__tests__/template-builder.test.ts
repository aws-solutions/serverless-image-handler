/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const readdirMock = jest.fn();
const readFileMock = jest.fn();
import path from "path";
import { TemplateBuilder } from "../template-builder";
jest.mock("node:fs/promises", () => {
  const originalModule = jest.requireActual("node:fs/promises");
  return {
    ...originalModule,
    __esModule: true,
    readdir: readdirMock,
    readFile: readFileMock,
  };
});
const __solutionName = "sih";
const __solutionVersion = "myMockVersion";
const __lambdaAssetBucketName = "mockAssetBucket";
const __templateDirectoryPath = "myTemplateDirectory";
const __template = "myTemplate.template.json";

const templateBuilder = new TemplateBuilder(
  __templateDirectoryPath,
  __solutionName,
  __lambdaAssetBucketName,
  __solutionVersion
);

describe("Template Builder", function () {
  describe("getTemplateFilePaths", function () {
    beforeEach(function () {
      readdirMock.mockClear();
    });

    it("should return empty array for invalid path", async function () {
      readdirMock.mockRejectedValue("invalid path");
      expect(await templateBuilder.getTemplateFilePaths()).toEqual([]);
    });

    it("should return empty array when no assets found", async function () {
      readdirMock.mockResolvedValue([]);
      expect(await templateBuilder.getTemplateFilePaths()).toEqual([]);
    });

    it("should return array of paths when templates found", async function () {
      readdirMock.mockResolvedValue([__template]);
      expect(await templateBuilder.getTemplateFilePaths()).toEqual([
        path.join(__templateDirectoryPath, __template),
      ]);
    });
  });

  describe("parseJsonTemplate", function () {
    beforeEach(function () {
      readFileMock.mockClear();
    });

    it("should throw error if file read fails", async function () {
      const fileReadError = new Error("file read failed");
      readFileMock.mockRejectedValue(fileReadError);
      await expect(
        templateBuilder.parseJsonTemplate(__template)
      ).rejects.toThrow(fileReadError);
    });

    it("should throw error if file invalid json", async function () {
      readFileMock.mockResolvedValue("invalid json");
      await expect(
        templateBuilder.parseJsonTemplate(__template)
      ).rejects.toThrowError();
    });

    it("should succeed if valid json", async function () {
      readFileMock.mockResolvedValue("{}");
      await expect(templateBuilder.parseJsonTemplate(__template)).resolves;
    });
  });
});
