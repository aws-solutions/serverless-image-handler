import { AssetPackager } from "./asset-packager";
import * as path from "path";
async function handler() {
  const cdkAssetPath = process.argv[2];
  const outputPath = process.argv[3];
  const assetPackager = new AssetPackager(cdkAssetPath);
  const assetFilePaths = await assetPackager.getCDKAssetFiles();
  for (const path of assetFilePaths) {
    await assetPackager.createZip(path);
  }
  await assetPackager.moveZips(outputPath)
}

handler()
    .then(() => console.log("all assets packaged"))
    .catch((err) => {
      console.error(err);
      throw err;
    });
