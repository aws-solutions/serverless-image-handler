/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { writeFile } from "node:fs/promises";
import { TemplateBuilder } from "./template-builder";

async function handler() {
  const CDKHelper = new TemplateBuilder(process.argv[2], process.argv[3], process.argv[4], process.argv[5]);
  const templatePaths = await CDKHelper.getTemplateFilePaths();
  for (const path of templatePaths) {
    const templateContents = await CDKHelper.parseJsonTemplate(path);
    const templateWithUpdatedLambdaCodeReference = await CDKHelper.updateLambdaAssetReference(templateContents);
    const templateWithUpdatedBucketReference = CDKHelper.updateBucketReference(
      JSON.stringify(templateWithUpdatedLambdaCodeReference, null, 2)
    );
    await writeFile(path, templateWithUpdatedBucketReference);
  }
}

handler()
  .then(() => console.log("written all cfn templates"))
  .catch((err) => {
    console.error(err);
    throw err;
  });
