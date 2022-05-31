// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import fs from "fs";
import path from "path";

/**
 * DO NOT DELETE THIS FILE
 * Is used by build system to build a clean npm package with the compiled js files in the root of the package.
 * It will not be included in the npm package.
 */
function main() {
  const source = fs.readFileSync(path.join(__dirname, "/../../package.json")).toString("utf-8");
  const sourceObj = JSON.parse(source);
  sourceObj.scripts = {};
  sourceObj.devDependencies = {};
  if (sourceObj.main.startsWith("dist/")) {
    sourceObj.main = sourceObj.main.slice(5);
  }
  fs.writeFileSync(path.join(__dirname, "/../package.json"), Buffer.from(JSON.stringify(sourceObj, null, 2), "utf-8"));
  fs.copyFileSync(path.join(__dirname, "/../../../../README.md"), path.join(__dirname, "/../README.md"));
  fs.copyFileSync(path.join(__dirname, "/../../../../CHANGELOG.md"), path.join(__dirname, "/../CHANGELOG.md"));
}

main();
