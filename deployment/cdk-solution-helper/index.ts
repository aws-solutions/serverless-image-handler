/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { writeFile } from "node:fs/promises";
import { CdkSolutionHelper } from "./cdk-solution-helper";

async function handler() {
  const CDKHelper = new CdkSolutionHelper(process.argv[2], process.argv[3], process.argv[4], process.argv[5]);
  const templateFiles = await CDKHelper.getTemplateFilePaths();
  for (const templatePath of templateFiles) {
    const templateContents = await CDKHelper.parseJsonTemplate(templatePath);
    const templateWithUpdatedLambdaCodeReference = await CDKHelper.updateLambdaAssetReference(templateContents);
    const templateWithUpdatedBucketReference = CDKHelper.updateBucketReference(
      JSON.stringify(templateWithUpdatedLambdaCodeReference, null, 2)
    );
    await writeFile(templatePath, templateWithUpdatedBucketReference);
  }
}

handler()
  .then(() => console.log("written all cfn templates"))
  .catch((err) => {
    console.error(err);
    throw err;
  });
