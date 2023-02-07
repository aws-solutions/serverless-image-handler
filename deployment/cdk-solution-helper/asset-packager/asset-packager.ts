/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { readdir, lstat, rename } from "node:fs/promises";
import path from "path";
import AdmZip from "adm-zip";

export class CDKAssetPackager {
  constructor(private readonly assetFolderPath: string) {}

  async getAssetPaths() {
    try {
      const allFiles = await readdir(this.assetFolderPath);
      const assetFilePaths = allFiles
        .filter((file) => file.includes("asset"))
        .map((file) => path.join(this.assetFolderPath, file));
      return assetFilePaths;
    } catch (err) {
      console.error(err);
      return [];
    }
  }

  /**
   * @description goes down 1 level deep to create zip
   * @param folderPath
   */
  async createAssetZip(folderPath: string) {
    const isDir = (await lstat(folderPath)).isDirectory();
    if (isDir) {
      const zip = new AdmZip();
      const allFiles = await readdir(folderPath);
      for (const file of allFiles) zip.addLocalFile(path.join(folderPath, file));
      const zipName = `${folderPath.split("/").pop()}.zip`;
      zip.writeZip(path.join(this.assetFolderPath, zipName));
    }
  }

  async moveZips(outputPath: string) {
    const allFiles = await readdir(this.assetFolderPath);
    const allZipPaths = allFiles.filter((file) => path.extname(file) === ".zip");
    for (const zipPath of allZipPaths) {
      await rename(path.join(this.assetFolderPath, zipPath), path.join(outputPath, zipPath.split("asset.").pop()!));
      // remove cdk prepended string "asset.*"
    }
  }
}
