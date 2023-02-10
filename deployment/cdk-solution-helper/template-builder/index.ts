/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { writeFile } from "node:fs/promises";
import { TemplateBuilder } from "./template-builder";

export async function handler(
  templateDirectoryPath: string | undefined,
  solutionName: string | undefined,
  lambdaBucket: string | undefined,
  version: string | undefined
) {
  if (!templateDirectoryPath || !solutionName || !lambdaBucket || !version)
    throw new Error("undefined arguments");
  const CDKHelper = new TemplateBuilder(
    templateDirectoryPath,
    solutionName,
    lambdaBucket,
    version
  );
  const templatePaths = await CDKHelper.getTemplateFilePaths();
  for (const path of templatePaths) {
    const templateContents = await CDKHelper.parseJsonTemplate(path);
    const templateWithUpdatedLambdaCodeReference =
      await CDKHelper.updateLambdaAssetReference(templateContents);
    const templateWithUpdatedBucketReference = CDKHelper.updateBucketReference(
      JSON.stringify(templateWithUpdatedLambdaCodeReference, null, 2)
    );
    await writeFile(path, templateWithUpdatedBucketReference);
  }
}

if (require.main === module) {
  // this module was run directly from the command line, getting command line arguments
  // e.g. npx ts-node index.ts templatePath mySolution lambdaAssetBucketName myVersion
  const templatePath = process.argv[2];
  const solutionName = process.argv[3];
  const lambdaBucketName = process.argv[4];
  const version = process.argv[5];
  console.log(
    `********here: ${templatePath} ${solutionName} ${lambdaBucketName} ${version}`
  );
  handler(templatePath, solutionName, lambdaBucketName, version)
    .then(() => console.log("written all cfn templates"))
    .catch((err) => {
      console.error(err);
      throw err;
    });
}
