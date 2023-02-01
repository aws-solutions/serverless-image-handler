/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { readdir, readFile } from "node:fs/promises";
import * as path from "path";
import { DefaultStackSynthesizer } from "aws-cdk-lib";

export class TemplateBuilder {
  constructor(
    readonly templateDirectory: string,
    readonly solutionName: string,
    readonly lambdaAssetBucketName: string,
    readonly solutionVersion: string
  ) {}

  async getTemplateFilePaths() {
    try {
      const allFiles = await readdir(this.templateDirectory);
      const templatePaths = allFiles
        .filter((file) => path.extname(file) === ".template")
        .map((file) => path.join(this.templateDirectory, file));
      return templatePaths;
    } catch (err) {
      console.error(err);
      return [];
    }
  }

  updateLambdaAssetReference(template: Record<string, any>) {
    const lambdaResourceKeys = Object.keys(template.Resources).filter(
      (key) => template.Resources[key].Type === "AWS::Lambda::Function"
    );
    lambdaResourceKeys.forEach((resourceKey) => {
      const lambdaFunction = template.Resources[resourceKey];
      const assetProperty = lambdaFunction.Properties.Code;
      const artifactHash = assetProperty.S3Key;
      assetProperty.S3Key = `${this.solutionName}/${this.solutionVersion}/asset${artifactHash}`;
      assetProperty.S3Bucket = {
        "Fn::Sub": `${this.lambdaAssetBucketName}-\${AWS::Region}`,
      };
      template.Resources[resourceKey] = lambdaFunction;
    });
    return template;
  }

  async parseJsonTemplate(templatePath: string) {
    const raw_template = await readFile(templatePath, {
      encoding: "utf8",
    });
    return JSON.parse(raw_template);
  }

  updateBucketReference(template: string) {
    // CDK uses default ${Qualifier} to create S3 buckets
    // The placeholders cdk-${Qualifier}-assets-${AWS::AccountId}-${AWS::Region} will be replaced
    const updatedTemplate = template.replaceAll(
      `cdk-${DefaultStackSynthesizer.DEFAULT_QUALIFIER}-assets-\${AWS::AccountId}-\${AWS::Region}`,
      `${this.lambdaAssetBucketName}-\${AWS::Region}`
    );
    return updatedTemplate;
  }
}
