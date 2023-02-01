import { readdir, lstat, rename } from "node:fs/promises";
import path from "path";
import AdmZip from "adm-zip";

export class AssetPackager {
  private readonly cdkAssetPath: string;

  constructor(assetPath: string) {
    this.cdkAssetPath = assetPath;
  }
  async getCDKAssetFiles() {
    try {
      const allFiles = await readdir(this.cdkAssetPath);
      const assetFilePaths = allFiles
        .filter((file) => file.includes("asset"))
        .map((file) => path.join(this.cdkAssetPath, file));
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
  async createZip(folderPath: string) {
    const isDir = (await lstat(folderPath)).isDirectory();
    if (isDir) {
      const zip = new AdmZip();
      const allFiles = await readdir(folderPath);
      for (const file of allFiles) zip.addLocalFile(path.join(folderPath, file));
      const newName = `${folderPath.split("/").pop()?.split(".").pop()}.zip`;
      zip.writeZip(path.join(this.cdkAssetPath, newName));
    }
  }

  async moveZips(outputPath: string) {
    const allFiles = await readdir(this.cdkAssetPath);
    const allZips = allFiles.filter((file) => path.extname(file) === ".zip");
    for (const zip of allZips) {
      await rename(path.join(this.cdkAssetPath, zip), path.join(outputPath, zip));
    }
  }
}
