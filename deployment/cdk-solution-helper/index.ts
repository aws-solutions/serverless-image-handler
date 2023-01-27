/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { writeFile } from "node:fs/promises";
import { CdkSolutionHelper } from "./cdk-solution-helper";

async function handler() {
  const CDKHelper = new CdkSolutionHelper(
    process.argv[2],
    process.argv[3],
    process.argv[4],
    process.argv[5]
  );
  const templateFiles = await CDKHelper.getTemplateFilePaths();
  for (const templatePath of templateFiles) {
    const templateContents = await CDKHelper.parseJsonTemplate(templatePath);
    const updatedTemplateContents = await CDKHelper.updateLambdaAssetReference(
      templateContents
    );
    await writeFile(
      templatePath,
      JSON.stringify(updatedTemplateContents, null, 2)
    );
  }
}

handler()
  .then(() => console.log("written all cfn templates"))
  .catch((err) => {
    console.error(err);
    throw err;
  });
