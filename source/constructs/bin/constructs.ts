// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { App, DefaultStackSynthesizer } from "aws-cdk-lib";
import { ServerlessImageHandlerStack } from "../lib/serverless-image-stack";

// CDK and default deployment
let synthesizer = new DefaultStackSynthesizer({
  generateBootstrapVersionRule: false,
});

// Solutions pipeline deployment
const { DIST_OUTPUT_BUCKET, SOLUTION_NAME, VERSION } = process.env;
if (DIST_OUTPUT_BUCKET && SOLUTION_NAME && VERSION)
  synthesizer = new DefaultStackSynthesizer({
    generateBootstrapVersionRule: false,
    fileAssetsBucketName: `${DIST_OUTPUT_BUCKET}-\${AWS::Region}`,
    bucketPrefix: `${SOLUTION_NAME}/${VERSION}/`,
  });

const app = new App();
// eslint-disable-next-line no-new
new ServerlessImageHandlerStack(app, "ServerlessImageHandlerStack", {
  synthesizer: synthesizer,
  solutionId: app.node.tryGetContext("solutionId"),
  solutionVersion: app.node.tryGetContext("solutionVersion"),
  solutionName: app.node.tryGetContext("solutionName"),
});
